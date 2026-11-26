import { TechnicianLoadingState } from "../components/TechnicianLoadingState";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import {
  Camera,
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
        profileQuery.error.message,
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
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Unable to update profile.",
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
        )
      }
    >
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