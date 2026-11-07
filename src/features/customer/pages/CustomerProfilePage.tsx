import {
  ArrowRight,
  Bell,
  CheckCircle2,
  CreditCard,
  HelpCircle,
  Mail,
  Phone,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { customerProfileService } from "../services/customerProfileService";
import { customerApi } from "../services/customerApi";

export function CustomerProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const cached = user
    ? customerProfileService.get(user.id)
    : { phone: "" };

  const [phone, setPhone] = useState(cached.phone);
  const [loading, setLoading] = useState(Boolean(user));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    customerProfileService
      .loadRemote(user.id)
      .then((profile) => {
        if (!cancelled) {
          setPhone(profile.phone);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to load profile.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Keep the confirmation in-app, not in a native browser alert.
  useEffect(() => {
    if (!deleteOpen) return;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) {
        setDeleteOpen(false);
        setDeleteConfirmed(false);
        setDeleteError("");
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onEscape);
    };
  }, [deleteOpen, deleting]);

  if (!user) {
    return null;
  }

  const initial =
    user.name?.trim().charAt(0).toUpperCase() || "C";

  const save = async () => {
    setSaving(true);
    setMessage("");

    try {
      const profile =
        await customerProfileService.saveRemote(
          user.id,
          phone.trim(),
        );

      setPhone(profile.phone);
      setMessage("Changes saved");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save changes.",
      );
    } finally {
      setSaving(false);
    }
  };

  const isSuccess =
    message === "Changes saved";

  const closeDeleteDialog = () => {
    if (deleting) return;
    setDeleteOpen(false);
    setDeleteConfirmed(false);
    setDeleteError("");
  };

  const handleDeleteAccount = async () => {
    if (!user || deleting || !deleteConfirmed) return;

    setDeleting(true);
    setDeleteError("");
    try {
      // BE enforces business restrictions: active orders / ongoing missions.
      // Only a successful DELETE should end the local session.
      await customerApi.deleteMyAccount();
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Unable to delete your account. Please try again.",
      );
      setDeleting(false);
      return;
    }

    // This is a soft delete. Do not erase transaction/order records.
    customerProfileService.remove(user.id);
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-[1160px] px-4 pb-16 pt-7 sm:px-6 sm:pt-10 lg:px-8 xl:px-10">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[26px] border border-white/[0.09] bg-[linear-gradient(135deg,rgba(39,20,10,0.96),rgba(17,14,17,0.97)_48%,rgba(13,12,14,0.98))] px-5 py-6 sm:px-7 sm:py-7 lg:px-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-orange-500/[0.12] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-amber-300/[0.05] blur-2xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-300">
              Account
            </p>

            <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.045em] text-white sm:text-[42px]">
              Your profile
            </h1>

            <p className="mt-3 max-w-[560px] text-[13px] leading-6 text-white/[0.76] sm:text-[14px]">
              Keep your contact details up to date so delivery handovers and customer notifications reach you correctly.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-[18px] border border-white/[0.09] bg-black/[0.18] px-4 py-3 backdrop-blur-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[16px] font-bold text-black shadow-[0_8px_24px_rgba(249,115,22,0.20)]">
              {initial}
            </div>

            <div className="min-w-0">
              <p className="max-w-[220px] truncate text-[14px] font-semibold text-white">
                {user.name}
              </p>

              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-300">
                <CheckCircle2 size={12} />
                Active customer account
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* ACCOUNT OVERVIEW */}
        <aside className="h-fit space-y-5">
          <div className="overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#151217]/94">
            <div className="border-b border-white/[0.07] px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/[0.52]">
                Account overview
              </p>

              <div className="mt-4 space-y-4">
                <OverviewRow
                  icon={<UserRound size={16} />}
                  label="Name"
                  value={user.name}
                />

                <OverviewRow
                  icon={<Mail size={16} />}
                  label="Email"
                  value={user.email}
                />

                <OverviewRow
                  icon={<Phone size={16} />}
                  label="Phone"
                  value={
                    loading
                      ? "Loading..."
                      : phone || "Not added yet"
                  }
                />

                <OverviewRow
                  icon={<ShieldCheck size={16} />}
                  label="Account status"
                  value="Active"
                  accent
                />
              </div>
            </div>

            <div className="px-5 py-3">
              <ProfileLink
                icon={<CreditCard size={15} />}
                title="Pricing & services"
                description="Delivery modes and fees"
                to="/customer/pricing"
              />

              <ProfileLink
                icon={<HelpCircle size={15} />}
                title="Help & policies"
                description="Delivery and package rules"
                to="/customer/help"
              />

              <ProfileLink
                icon={<Bell size={15} />}
                title="Notifications"
                description="Order and payment updates"
                to="/customer/notifications"
              />
            </div>
          </div>
        </aside>

        {/* CONTACT FORM */}
        <div className="overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#151217]/94">
          <div className="border-b border-white/[0.07] px-5 py-5 sm:px-7 sm:py-6">
            <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-white sm:text-[20px]">
              Contact information
            </h2>

            <p className="mt-1.5 text-[12px] leading-6 text-white/[0.62]">
              Your name and email come from your account. You can update the phone number used for delivery contact.
            </p>
          </div>

          <div className="px-5 py-6 sm:px-7 sm:py-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Full name"
                hint="Account name"
              >
                <div className="relative">
                  <UserRound
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/[0.38]"
                  />

                  <input
                    value={user.name}
                    readOnly
                    className="h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] pl-11 pr-4 text-[13px] font-medium text-white/[0.72] outline-none"
                  />
                </div>
              </Field>

              <Field
                label="Email"
                hint="Sign-in email"
              >
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/[0.38]"
                  />

                  <input
                    value={user.email}
                    readOnly
                    className="h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] pl-11 pr-4 text-[13px] font-medium text-white/[0.72] outline-none"
                  />
                </div>
              </Field>

              <div className="sm:col-span-2">
                <Field
                  label="Phone number"
                  hint="Used for package handover contact"
                >
                  <div className="relative">
                    <Phone
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/[0.48]"
                    />

                    <input
                      value={phone}
                      disabled={loading}
                      onChange={(event) =>
                        setPhone(
                          event.target.value,
                        )
                      }
                      placeholder="Enter your phone number"
                      inputMode="tel"
                      className="h-12 w-full rounded-xl border border-white/[0.12] bg-[#0d0b0e] pl-11 pr-4 text-[13px] font-medium text-white outline-none transition placeholder:text-white/[0.28] focus:border-orange-500/[0.70] focus:ring-2 focus:ring-orange-500/[0.08] disabled:opacity-50"
                    />
                  </div>
                </Field>
              </div>
            </div>

            <div className="mt-7 rounded-[16px] border border-white/[0.07] bg-white/[0.025] px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/[0.10] text-orange-300">
                  <ShieldCheck size={15} />
                </div>

                <div>
                  <p className="text-[12px] font-semibold text-white/[0.92]">
                    Contact details are used for delivery operations
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-white/[0.58]">
                    Keep your phone number current so hub staff and delivery updates can reach you when needed.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-4 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-h-[20px]">
                {message ? (
                  <p
                    className={`text-[11px] font-medium ${
                      isSuccess
                        ? "text-emerald-300"
                        : "text-red-300"
                    }`}
                  >
                    {message}
                  </p>
                ) : (
                  <p className="text-[11px] text-white/[0.36]">
                    Only your phone number can be edited here.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={save}
                disabled={loading || saving}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-6 text-[13px] font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving…"
                  : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Account deletion: intentionally separate from the editable contact form. */}
      <section className="mt-6 rounded-[22px] border border-orange-500/[0.22] bg-[#151217]/94 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-white sm:text-[18px]">Delete account</h2>
            <p className="mt-1.5 max-w-[660px] text-[12px] leading-5 text-white/[0.58]">
              Deactivate your account and prevent future sign-ins. Your delivery and payment history will be retained.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDeleteConfirmed(false);
              setDeleteError("");
              setDeleteOpen(true);
            }}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-orange-500/[0.38] bg-orange-500/[0.07] px-5 text-[13px] font-semibold text-orange-300 transition hover:bg-orange-500/[0.13] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            <Trash2 size={15} aria-hidden="true" />
            Delete my account
          </button>
        </div>
      </section>

      {deleteOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteDialog();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            aria-describedby="delete-account-description"
            className="w-full max-w-[440px] rounded-[22px] border border-white/[0.12] bg-[#161217]/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.48)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/[0.12] text-orange-300">
                <Trash2 size={19} aria-hidden="true" />
              </div>
              <button
                type="button"
                disabled={deleting}
                onClick={closeDeleteDialog}
                aria-label="Close confirmation"
                className="rounded-lg p-1.5 text-white/[0.50] transition hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            <h2 id="delete-account-title" className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-white">
              Delete your account?
            </h2>
            <p id="delete-account-description" className="mt-2 text-[13px] leading-6 text-white/[0.62]">
              Your account will be deactivated and you won't be able to sign in again.
              Order and payment records will remain in the system.
            </p>
            <p className="mt-2 text-[12px] leading-5 text-white/[0.52]">
              Accounts with active deliveries cannot be deleted. The system will verify this before proceeding.
            </p>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.10] bg-white/[0.025] p-3.5">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                disabled={deleting}
                onChange={(event) => setDeleteConfirmed(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500"
              />
              <span className="text-[12px] leading-5 text-white/[0.78]">
                I understand that I will lose access to this account.
              </span>
            </label>

            {deleteError && (
              <p role="alert" className="mt-4 rounded-xl border border-orange-500/[0.24] bg-orange-500/[0.07] px-3 py-3 text-[12px] leading-5 text-orange-300">
                {deleteError}
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={closeDeleteDialog}
                autoFocus
                className="h-11 rounded-xl border border-white/[0.14] bg-white/[0.035] text-[13px] font-semibold text-white/[0.82] transition hover:bg-white/[0.07] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!deleteConfirmed || deleting}
                onClick={() => void handleDeleteAccount()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 text-[13px] font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={15} aria-hidden="true" />
                {deleting ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-end justify-between gap-3">
        <span className="text-[11px] font-semibold text-white/[0.78]">
          {label}
        </span>

        {hint ? (
          <span className="text-right text-[9px] text-white/[0.34]">
            {hint}
          </span>
        ) : null}
      </span>

      <span className="mt-2 block">
        {children}
      </span>
    </label>
  );
}

function OverviewRow({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          accent
            ? "bg-emerald-400/[0.09] text-emerald-300"
            : "bg-white/[0.045] text-white/[0.58]"
        }`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.10em] text-white/[0.34]">
          {label}
        </p>

        <p
          className={`mt-1 break-words text-[12px] font-medium ${
            accent
              ? "text-emerald-300"
              : "text-white/[0.88]"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function ProfileLink({
  icon,
  title,
  description,
  to,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 border-b border-white/[0.06] py-3.5 last:border-b-0"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-white/[0.52] transition group-hover:bg-orange-500/[0.09] group-hover:text-orange-300">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-white/[0.84] transition group-hover:text-white">
          {title}
        </p>

        <p className="mt-0.5 truncate text-[10px] text-white/[0.38]">
          {description}
        </p>
      </div>

      <ArrowRight
        size={14}
        className="shrink-0 text-white/[0.22] transition group-hover:translate-x-0.5 group-hover:text-orange-400"
      />
    </Link>
  );
}
