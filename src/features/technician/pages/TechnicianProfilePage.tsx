import { TechnicianLoadingState } from "../components/TechnicianLoadingState";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  Camera,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
  MapPin,
  Pencil,
  Save,
  UserRound,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/shadcn/ui/card";

import {
  Button,
} from "@/components/shadcn/ui/button";

import {
  Input,
} from "@/components/shadcn/ui/input";

import {
  useAuth,
} from "../../auth/hooks/useAuth";

import {
  TechnicianPageShell,
} from "../components/TechnicianPageShell";

import {
  pickString,
  technicianApiRequest,
  TechnicianApiError,
  unwrapObject,
} from "../api/httpClient";

import {
  useTechnicianProfileQuery,
  useUpdateTechnicianProfileMutation,
} from "../hooks/useProfileQueries";


/* =========================================================
   TYPES
========================================================= */

interface TechnicianProfile {
  name: string;
  email: string;
  avatar: string | null;

  technicianId: string;
  controlCenter: string;
}


/* =========================================================
   STORAGE
========================================================= */

const PROFILE_STORAGE_KEY =
  "droneoptai.technician.profile";


/* =========================================================
   HELPERS
========================================================= */

function getInitials(
  name?: string,
) {
  if (!name) {
    return "TC";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) =>
      word
        .charAt(0)
        .toUpperCase(),
    )
    .join("");
}


function getSavedProfile():
  | TechnicianProfile
  | null {
  try {
    const saved =
      localStorage.getItem(
        PROFILE_STORAGE_KEY,
      );

    if (!saved) {
      return null;
    }

    return JSON.parse(
      saved,
    ) as TechnicianProfile;
  } catch {
    return null;
  }
}


/* =========================================================
   PAGE
========================================================= */

export function TechnicianProfilePage() {
  const {
    user,
  } = useAuth();

  const profileQuery =
    useTechnicianProfileQuery();

  const updateProfileMutation =
    useUpdateTechnicianProfileMutation();

  const fileInputRef =
    useRef<HTMLInputElement>(null);


  /* =========================
     INITIAL PROFILE
  ========================= */

  const defaultProfile: TechnicianProfile = {
    name:
      user?.name ??
      "Technician Demo",

    email:
      user?.email ??
      "technician@droneopt.ai",

    avatar: null,

    technicianId:
      "TECH-0174",

    controlCenter:
      "SGN Technical Operations",
  };


  const [
    profile,
    setProfile,
  ] =
    useState<TechnicianProfile>(
      () =>
        getSavedProfile() ??
        defaultProfile,
    );


  const [
    draft,
    setDraft,
  ] =
    useState<TechnicianProfile>(
      profile,
    );


  const [
    editing,
    setEditing,
  ] = useState(false);

  const [apiError, setApiError] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);

  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }

    const data = unwrapObject(
      profileQuery.data,
    );

    const nextProfile: TechnicianProfile = {
      name: pickString(
        data,
        ["name", "full_name"],
        profile.name,
      ),
      email: pickString(
        data,
        ["email"],
        profile.email,
      ),
      avatar: profile.avatar,
      technicianId: pickString(
        data,
        ["technician_id", "user_id", "id"],
        profile.technicianId,
      ),
      controlCenter: pickString(
        data,
        ["hub_name", "hub", "control_center"],
        profile.controlCenter,
      ),
    };

    setProfile(nextProfile);
    setDraft(nextProfile);
    setHasLoadedProfile(true);

    localStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify(nextProfile),
    );
  }, [profileQuery.data]);

  useEffect(() => {
    if (profileQuery.error instanceof Error) {
      setApiError(
        "Unable to load profile. Please refresh.",
      );
    }
  }, [profileQuery.error]);



  /* =========================
     EDIT
  ========================= */

  const handleEdit = () => {
    setDraft(profile);

    setEditing(true);
  };


  /* =========================
     CANCEL
  ========================= */

  const handleCancel = () => {
    setDraft(profile);

    setEditing(false);
  };


  /* =========================
     SAVE
  ========================= */

  const handleSave = async () => {
    const nextProfile: TechnicianProfile = {
      ...draft,
      name: draft.name.trim() || profile.name,
      email: draft.email.trim() || profile.email,
      controlCenter:
        draft.controlCenter.trim() || profile.controlCenter,
    };

    try {
      setApiError("");

      /*
       * Backend document explicitly supports updating full name / username.
       * Email and managed Hub remain backend-owned/read-only fields.
       */
      await updateProfileMutation.mutateAsync({
        name: nextProfile.name,
      });

      const refreshed =
        await profileQuery.refetch();

      const data = unwrapObject(
        refreshed.data,
      );

      const syncedProfile: TechnicianProfile = {
        ...nextProfile,
        name: pickString(data, ["name", "full_name"], nextProfile.name),
        email: pickString(data, ["email"], nextProfile.email),
        technicianId: pickString(data, ["technician_id", "user_id", "id"], nextProfile.technicianId),
        controlCenter: pickString(data, ["hub_name", "hub", "control_center"], nextProfile.controlCenter),
      };

      setProfile(syncedProfile);
      setDraft(syncedProfile);
      localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify(syncedProfile),
      );

      window.dispatchEvent(
        new CustomEvent(
          "technician-profile-updated",
          { detail: syncedProfile },
        ),
      );

      setEditing(false);
    } catch  {
      setApiError(
        "Unable to update profile.",
      );
    }
  };


  /* =========================
     AVATAR
  ========================= */

  const handleAvatarChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/",
      )
    ) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      setDraft(
        (current) => ({
          ...current,

          avatar:
            typeof reader.result ===
            "string"
              ? reader.result
              : null,
        }),
      );
    };

    reader.readAsDataURL(
      file,
    );

    event.target.value =
      "";
  };


  /* =========================================================
     RENDER
  ========================================================= */

  if (!hasLoadedProfile && (profileQuery.isPending || Boolean(profileQuery.data && !profileQuery.isError))) {
    return (
      <TechnicianPageShell title="Profile" description="">
        <TechnicianLoadingState label="Loading profile..." panel />
      </TechnicianPageShell>
    );
  }

  return (
    <TechnicianPageShell
      title="Profile"
      description=""
      action={
        editing ? (
          <div className="flex items-center gap-2">

            {/* CANCEL */}

            <Button
  type="button"
  variant="outline"
  onClick={handleCancel}
  className="
    h-9
    rounded-md

    border
    border-[var(--tech-border)]

    !bg-transparent
    px-4

    text-[13px]
    font-medium
    text-[var(--tech-muted)]

    transition-colors
    duration-150

    hover:!bg-transparent
    hover:!border-orange-500/50
    hover:!text-orange-500

    focus-visible:!border-orange-500
    focus-visible:outline-none
    focus-visible:ring-0
  "
>
  <X
    size={15}
    strokeWidth={1.6}
  />

  Cancel
</Button>


            {/* SAVE */}

            <Button
              type="button"
              onClick={
                handleSave
              }
              className="
                h-9
                rounded-md

                bg-orange-500

                px-4

                text-[13px]
                font-medium
                text-black

                hover:bg-orange-600
                focus-visible:outline-none
                focus-visible:ring-0
                focus-visible:border-orange-500
              "
            >
              <Save
                size={15}
                strokeWidth={1.6}
              />

              Save changes
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPasswordMessage("");
                setPasswordOpen(true);
              }}
              className="h-9 rounded-md border border-[var(--tech-border)] !bg-transparent px-4 text-[13px] font-medium text-[var(--tech-text)] hover:!border-orange-500/50 hover:!text-orange-500"
            >
              <KeyRound size={15} strokeWidth={1.6} />
              Change password
            </Button>
          <Button
  type="button"
  variant="outline"
  onClick={handleEdit}
  className="
    h-9
    rounded-md
    border
    border-[var(--tech-border)]

    !bg-transparent
    px-4

    text-[13px]
    font-medium
    text-[var(--tech-text)]

    transition-colors
    duration-150

    hover:!bg-transparent
    hover:!border-orange-500/50
    hover:!text-orange-500

    focus-visible:!border-orange-500
    focus-visible:outline-none
    focus-visible:ring-0
  "
>
  <Pencil
    size={15}
    strokeWidth={1.6}
  />

  Edit profile
</Button>
          </div>
        )
      }
    >
      {passwordMessage && (
        <div role="status" className="mb-4 rounded-md border border-emerald-500/30 px-4 py-3 text-[13px] text-emerald-600 dark:text-emerald-400">
          {passwordMessage}
        </div>
      )}
      {apiError && (
        <div className="mb-4 rounded-md border border-red-500/25 px-4 py-3 text-[13px] text-red-500">
          {apiError}
        </div>
      )}

      <div
        className="
          grid gap-5
          lg:grid-cols-[300px_1fr]
        "
      >

        {/* =================================================
            LEFT PROFILE
        ================================================= */}

        <Card
          className="
            rounded-lg

            border-[var(--tech-border)]

            bg-[var(--tech-surface)]

            shadow-none
          "
        >
          <CardContent className="p-6">

            <div className="flex flex-col items-center">

              {/* =========================
                  AVATAR
              ========================= */}

              <div className="relative inline-block">

                {/* AVATAR IMAGE */}

                <div
                  className="
                    grid
                    h-24
                    w-24

                    place-items-center

                    overflow-hidden

                    rounded-2xl

                    border
                    border-[var(--tech-border)]

                    bg-[var(--tech-surface-2)]

                    text-[26px]
                    font-semibold

                    text-[var(--tech-text)]
                  "
                >
                  {(editing
                    ? draft.avatar
                    : profile.avatar) ? (
                    <img
                      src={
                        editing
                          ? draft.avatar!
                          : profile.avatar!
                      }
                      alt={
                        editing
                          ? draft.name
                          : profile.name
                      }
                      className="
                        h-full
                        w-full

                        object-cover
                      "
                    />
                  ) : (
                    getInitials(
                      editing
                        ? draft.name
                        : profile.name,
                    )
                  )}
                </div>


                {/* ONLINE STATUS
                    View mode only
                */}

                {!editing && (
                  <span
                    title="Active"
                    className="
                      absolute

                      -bottom-[3px]
                      -right-[5px]

                      h-[19px]
                      w-[19px]

                      rounded-full

                      border-[3px]
                      border-[var(--tech-surface)]

                      bg-emerald-500
                    "
                  />
                )}


                {/* CAMERA
                    Edit mode only
                */}

                {editing && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef
                          .current
                          ?.click()
                      }
                      title="Change avatar"
                      className="
                        absolute

                        -bottom-[5px]
                        -right-[7px]

                        grid
                        h-8
                        w-8

                        place-items-center

                        rounded-full

                        border-[3px]
                        border-[var(--tech-surface)]

                        bg-orange-500

                        text-black

                        transition-colors duration-150

                        hover:bg-orange-600
                        focus-visible:outline-none
                        focus-visible:ring-0
                      "
                    >
                      <Camera
                        size={15}
                        strokeWidth={1.8}
                      />
                    </button>

                    <input
                      ref={
                        fileInputRef
                      }
                      type="file"
                      accept="image/*"
                      onChange={
                        handleAvatarChange
                      }
                      className="hidden"
                    />
                  </>
                )}
              </div>


              {/* =========================
                  NAME
              ========================= */}

              <h2
                className="
                  mt-5

                  text-[22px]
                  font-semibold

                  tracking-[-0.02em]

                  text-[var(--tech-text)]
                "
              >
                {editing
                  ? draft.name
                  : profile.name}
              </h2>


              {/* ROLE */}

              <p
                className="
                  mt-1

                  text-[14px]

                  text-[var(--tech-muted)]
                "
              >
                Fleet Technician
              </p>
            </div>


            {/* =========================
                META
            ========================= */}

            <div
              className="
                mt-6

                border-t

                border-[var(--tech-border)]

                pt-5
              "
            >
              <InfoRow
                label="Technician ID"
                value={
                  profile.technicianId
                }
              />

              <InfoRow
                label="Role"
                value="Technician"
              />
            </div>
          </CardContent>
        </Card>


        {/* =================================================
            ACCOUNT INFORMATION
        ================================================= */}

        <Card
          className="
            rounded-lg

            border-[var(--tech-border)]

            bg-[var(--tech-surface)]

            shadow-none
          "
        >
          <CardContent className="p-6">

            {/* HEADER */}

            <div className="mb-6">

              <h2
                className="
                  text-[18px]
                  font-semibold

                  text-[var(--tech-text)]
                "
              >
                Account information
              </h2>

              <p
                className="
                  mt-1

                  text-[12px]

                  text-[var(--tech-muted)]
                "
              >
               
              </p>
            </div>


            {/* =========================
                VIEW MODE
            ========================= */}

            {!editing && (
              <div
                className="
                  grid gap-4
                  md:grid-cols-2
                "
              >
                <InfoCard
                  icon={
                    UserRound
                  }
                  label="Full name"
                  value={
                    profile.name
                  }
                />

                <InfoCard
                  icon={Mail}
                  label="Email address"
                  value={
                    profile.email
                  }
                />

                <InfoCard
                  icon={Wrench}
                  label="Technician ID"
                  value={
                    profile.technicianId
                  }
                />

                <InfoCard
                  icon={MapPin}
                  label="Control center"
                  value={
                    profile.controlCenter
                  }
                />
              </div>
            )}


            {/* =========================
                EDIT MODE
            ========================= */}

            {editing && (
              <div
                className="
                  grid gap-5
                  md:grid-cols-2
                "
              >

                {/* NAME */}

                <ProfileField
                  label="Full name"
                  icon={
                    UserRound
                  }
                >
                  <Input
                    value={
                      draft.name
                    }
                    onChange={(
                      event,
                    ) =>
                      setDraft(
                        (
                          current,
                        ) => ({
                          ...current,

                          name:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    className="
                      h-10

                      rounded-md

                      border-[var(--tech-border)]

                      bg-[var(--tech-surface-2)]

                      text-[14px]

                      text-[var(--tech-text)]

                      focus-visible:border-orange-500 focus-visible:ring-0 focus-visible:outline-none
                    "
                  />
                </ProfileField>


                {/* EMAIL */}

                <ProfileField
                  label="Email address"
                  icon={Mail}
                >
                  <Input
                    type="email"
                    value={
                      draft.email
                    }
                    disabled
                    className="
                      h-10

                      rounded-md

                      border-[var(--tech-border)]

                      bg-[var(--tech-surface-2)]

                      text-[14px]

                      text-[var(--tech-muted)]

                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  />
                </ProfileField>


                {/* TECHNICIAN ID */}

                <ProfileField
                  label="Technician ID"
                  icon={Wrench}
                >
                  <Input
                    value={
                      draft.technicianId
                    }
                    disabled
                    className="
                      h-10

                      rounded-md

                      border-[var(--tech-border)]

                      bg-[var(--tech-surface-2)]

                      text-[14px]

                      text-[var(--tech-muted)]

                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  />
                </ProfileField>


                {/* CONTROL CENTER */}

                <ProfileField
                  label="Control center"
                  icon={MapPin}
                >
                  <Input
                    value={
                      draft.controlCenter
                    }
                    disabled
                    className="
                      h-10

                      rounded-md

                      border-[var(--tech-border)]

                      bg-[var(--tech-surface-2)]

                      text-[14px]

                      text-[var(--tech-muted)]

                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  />
                </ProfileField>
              </div>
            )}


            {/* EDIT NOTE */}

            {editing && (
              <div
                className="
                  mt-6

                  border-t

                  border-[var(--tech-border)]

                  pt-4
                "
              >
                <p
                  className="
                    text-[12px]

                    leading-5

                    text-[var(--tech-muted)]
                  "
                >
                  Technician ID, email, role and managed Hub are backend-owned fields. Only supported profile fields are editable here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {passwordOpen && (
        <ChangePasswordDialog
          onClose={() => setPasswordOpen(false)}
          onSuccess={() => {
            setPasswordOpen(false);
            setPasswordMessage("Password changed successfully.");
          }}
        />
      )}
    </TechnicianPageShell>
  );
}


/* =========================================================
   INFO ROW
========================================================= */

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        flex
        items-center
        justify-between

        border-b

        border-[var(--tech-border)]

        py-3

        last:border-b-0
      "
    >
      <span
        className="
          text-[12px]

          text-[var(--tech-muted)]
        "
      >
        {label}
      </span>

      <strong
        className="
          text-[13px]
          font-medium

          text-[var(--tech-text)]
        "
      >
        {value}
      </strong>
    </div>
  );
}


/* =========================================================
   INFO CARD
========================================================= */

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        flex
        min-h-[82px]

        items-center

        gap-4

        rounded-md

        border

        border-[var(--tech-border)]

        bg-[var(--tech-surface-2)]

        px-4 py-3
      "
    >
      <div
        className="
          grid
          h-9 w-9

          shrink-0

          place-items-center

          rounded-md

          border

          border-[var(--tech-border)]

          text-[var(--tech-muted)]
        "
      >
        <Icon
          size={16}
          strokeWidth={1.5}
        />
      </div>

      <div className="min-w-0">

        <p
          className="
            text-[11px]

            uppercase

            tracking-[0.08em]

            text-[var(--tech-subtle)]
          "
        >
          {label}
        </p>

        <p
          className="
            mt-1

            truncate

            text-[14px]
            font-medium

            text-[var(--tech-text)]
          "
        >
          {value}
        </p>
      </div>
    </div>
  );
}


/* =========================================================
   PROFILE FIELD
========================================================= */

function ProfileField({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">

      <div
        className="
          mb-2

          flex
          items-center

          gap-2
        "
      >
        <Icon
          size={14}
          strokeWidth={1.5}
          className="text-[var(--tech-muted)]"
        />

        <span
          className="
            text-[12px]
            font-medium

            text-[var(--tech-muted)]
          "
        >
          {label}
        </span>
      </div>

      {children}
    </label>
  );
}

// Keep the request contract in one place. The shared API client adds /api/v1
// through API_BASE_URL and attaches the current authenticated session.
// Verify old_password/new_password against the Backend Swagger request schema.
async function changeTechnicianPassword(oldPassword: string, newPassword: string) {
  return technicianApiRequest("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      old_password: oldPassword,
      new_password: newPassword,
    }),
  });
}

function ChangePasswordDialog({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submitLock = useRef(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  const close = () => {
    if (!submitLock.current) onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitLock.current) return;
    setError("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please complete all password fields.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("The new password must be different from your current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    submitLock.current = true;
    setPending(true);
    try {
      await changeTechnicianPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onSuccess();
    } catch (cause) {
      // Do not display/log raw validation payloads; they may echo passwords.
      const status = cause instanceof TechnicianApiError ? cause.status : undefined;
      setError(status === 400 || status === 401 || status === 403
        ? "Password change was rejected. Check your current password and password requirements, or sign in again if your session expired."
        : status === 422
          ? "Check the password requirements and try again."
          : status === 404
            ? "Password change is currently unavailable."
            : "Unable to confirm the password change. If the connection failed, verify your credentials before trying again.");
    } finally {
      submitLock.current = false;
      setPending(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="technician-change-password-title"
      onCancel={(event) => { event.preventDefault(); close(); }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-[460px] overflow-y-auto rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] p-0 text-[var(--tech-text)] shadow-2xl backdrop:bg-black/60"
    >
      <form onSubmit={submit} aria-busy={pending}>
        <div className="flex items-center justify-between gap-3 border-b border-[var(--tech-border)] px-6 py-4">
          <h2 id="technician-change-password-title" className="text-[19px] font-semibold">Change password</h2>
          <button type="button" aria-label="Close change password" onClick={close} disabled={pending}
            className="text-[var(--tech-muted)] hover:text-orange-500 disabled:opacity-50">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" disabled={pending} />
          <PasswordField label="New password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" disabled={pending} />
          <PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" disabled={pending} />
          {error && <p role="alert" className="text-[13px] text-red-500">{error}</p>}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--tech-border)] px-6 py-4">
          <Button type="button" variant="outline" disabled={pending} onClick={close}
            className="h-9 rounded-md border-[var(--tech-border)] !bg-transparent px-4 text-[13px] text-[var(--tech-text)] hover:!text-orange-500">Cancel</Button>
          <Button type="submit" disabled={pending || !currentPassword || !newPassword || !confirmPassword}
            className="h-9 rounded-md bg-orange-500 px-4 text-[13px] font-medium text-black hover:bg-orange-600 disabled:opacity-50">
            {pending ? "Changing..." : "Change password"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

function PasswordField({ label, value, onChange, autoComplete, disabled }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  disabled: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="block text-[13px] font-medium text-[var(--tech-text-secondary)]">
        {label}
        <Input
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          disabled={disabled}
          className="mt-2 h-10 rounded-md border-[var(--tech-border)] bg-[var(--tech-surface-2)] pr-11 text-[14px] text-[var(--tech-text)] focus-visible:border-orange-500 focus-visible:ring-0"
        />
      </label>
      <div className="relative h-0">
        <button type="button" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible}
          disabled={disabled} onClick={() => setVisible((current) => !current)}
          className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center text-[var(--tech-muted)] hover:text-orange-500 disabled:opacity-50">
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
