import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
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
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { customerProfileService } from "../services/customerProfileService";
import { apiRequest, customerApi } from "../services/customerApi";

export function CustomerProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const cached = user
    ? customerProfileService.get(user.id)
    : { phone: "", email: "" };

  const [phone, setPhone] = useState(cached.phone);
  const [email, setEmail] = useState(cached.email || user?.email || "");
  const [savedEmail, setSavedEmail] = useState(cached.email || user?.email || "");
  const [loading, setLoading] = useState(Boolean(user));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Reset-by-email-token flow documented by POST /api/v1/auth/reset-password.
  // Tokens and passwords stay in component state; nothing is persisted locally.
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordUpdated, setPasswordUpdated] = useState(false);

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
          const currentEmail = profile.email || user.email || "";
          setEmail(currentEmail);
          setSavedEmail(currentEmail);
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

  // Accessibility and cleanup for the new password dialog only.
  useEffect(() => {
    if (!passwordDialogOpen) return;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !resettingPassword) {
        setPasswordDialogOpen(false);
        setResetToken("");
        setNextPassword("");
        setConfirmPassword("");
        setPasswordError("");
        setPasswordUpdated(false);
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onEscape);
    };
  }, [passwordDialogOpen, resettingPassword]);

  if (!user) {
    return null;
  }

  const initial =
    user.name?.trim().charAt(0).toUpperCase() || "C";

  const save = async () => {
    setMessage("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setMessage("Please enter a valid email address.");
      return;
    }
    const phoneDigits = cleanPhone.replace(/\D/g, "");
    if (phoneDigits.length < 9 || phoneDigits.length > 12) {
      setMessage("Please enter a valid phone number (9–12 digits).");
      return;
    }

    setSaving(true);
    try {
      const profile = await customerProfileService.saveRemote(
        user.id,
        cleanPhone,
        cleanEmail !== savedEmail.trim().toLowerCase() ? cleanEmail : undefined,
      );

      setPhone(profile.phone);
      setEmail(profile.email || cleanEmail);
      setSavedEmail(profile.email || cleanEmail);
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

  const closePasswordDialog = () => {
    if (resettingPassword) return;
    setPasswordDialogOpen(false);
    setResetToken("");
    setNextPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordUpdated(false);
    setShowPasswords(false);
  };

  const openPasswordDialog = () => {
    setResetToken("");
    setNextPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordUpdated(false);
    setShowPasswords(false);
    setPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (resettingPassword || passwordUpdated) return;
    setPasswordError("");

    const token = resetToken.trim();
    if (!token) {
      setPasswordError("Enter the reset token you received by email.");
      return;
    }
    if (!nextPassword) {
      setPasswordError("Enter a new password.");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setResettingPassword(true);
    try {
      // Swagger request body: { token, new_password }.
      // Do not send current_password: this is a token-based reset API.
      const result = await apiRequest<{
        success?: boolean;
        message?: string;
      } | null>("/api/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: nextPassword }),
      }, { auth: false });
      if (result?.success === false) {
        throw new Error(result.message || "Unable to reset password.");
      }
      setResetToken("");
      setNextPassword("");
      setConfirmPassword("");
      setShowPasswords(false);
      setPasswordUpdated(true);
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "Unable to reset password. Try again.",
      );
    } finally {
      setResettingPassword(false);
    }
  };

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
            <h1 className="text-[34px] font-semibold tracking-[-0.045em] text-white sm:text-[42px]">
              Your profile
            </h1>

            
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
              <p className="text-[12px] font-medium capitalize tracking-normal text-white/[0.70]">
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
                  value={email}
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

          </div>
        </aside>

        {/* CONTACT FORM */}
        <div className="overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#151217]/94">
          <div className="border-b border-white/[0.07] px-5 py-5 sm:px-7 sm:py-6">
            <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-white sm:text-[20px]">
              Contact information
            </h2>

            
          </div>

          <div className="px-5 py-6 sm:px-7 sm:py-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Full name"
                
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
                
              >
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/[0.38]"
                  />

                  <input
                    type="email"
                    inputMode="email"
                    value={email}
                    disabled={loading || saving}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-12 w-full rounded-xl border border-white/[0.12] bg-[#0d0b0e] pl-11 pr-4 text-[13px] font-medium text-white outline-none transition placeholder:text-white/[0.28] focus:border-orange-500/[0.70] focus:ring-2 focus:ring-orange-500/[0.08] disabled:opacity-50"
                  />
                </div>
              </Field>

              <div className="sm:col-span-2">
                <Field
                  label="Phone number"
                  
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
                    Update the email and phone number used for delivery contact. Your name remains linked to your account.
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
                    Changes are saved to your account, not just this device.
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

      {/* Security settings: visual addition only; existing profile actions unchanged. */}
      <section className="mt-6 rounded-[22px] border border-white/[0.09] bg-[#151217]/94 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/[0.10] text-orange-300">
              <KeyRound size={19} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[16px] font-medium text-white sm:text-[18px]">Change Password</h2>
              <p className="mt-1.5 max-w-[610px] text-[12px] leading-5 text-white/[0.58]">
                Reset your sign-in password securely using a token sent to your email.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openPasswordDialog}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.16] bg-white/[0.04] px-5 text-[13px] font-semibold text-white transition hover:border-orange-500/[0.45] hover:bg-orange-500/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            <KeyRound size={15} aria-hidden="true" />
            Change Password
          </button>
        </div>
      </section>

      {passwordDialogOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePasswordDialog();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            aria-describedby="change-password-description"
            className="max-h-[90vh] w-full max-w-[460px] overflow-y-auto rounded-[22px] border border-white/[0.12] bg-[#161217]/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.48)] sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/[0.12] text-orange-300">
                <KeyRound size={20} aria-hidden="true" />
              </span>
              <button
                type="button"
                onClick={closePasswordDialog}
                disabled={resettingPassword}
                aria-label="Close change password dialog"
                className="rounded-lg p-1.5 text-white/[0.55] transition hover:bg-white/[0.06] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <h2 id="change-password-title" className="mt-4 text-[20px] font-medium text-white">
              Change Password
            </h2>
            <p id="change-password-description" className="mt-2 text-[12px] leading-5 text-white/[0.62]">
              Use the password reset token received by email. If you do not have a token,
              request one through <strong>Forgot Password</strong> on the sign-in screen first.
            </p>

            {passwordUpdated ? (
              <p role="status" className="mt-5 rounded-xl border border-emerald-500/[0.25] bg-emerald-500/[0.08] px-4 py-3 text-[12px] leading-5 text-emerald-300">
                Password updated successfully. Use your new password the next time you sign in.
              </p>
            ) : (
            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleResetPassword();
              }}
            >
              <PasswordInput
                id="reset-token"
                label="Reset Token (from email)"
                value={resetToken}
                onChange={setResetToken}
                show={showPasswords}
                autoComplete="one-time-code"
                disabled={resettingPassword}
              />
              <PasswordInput
                id="new-password"
                label="New Password"
                value={nextPassword}
                onChange={setNextPassword}
                show={showPasswords}
                autoComplete="new-password"
                disabled={resettingPassword}
              />
              <PasswordInput
                id="confirm-password"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showPasswords}
                autoComplete="new-password"
                disabled={resettingPassword}
              />
              <button
                type="button"
                disabled={resettingPassword}
                onClick={() => setShowPasswords((value) => !value)}
                className="inline-flex items-center gap-2 text-[12px] text-white/[0.65] transition hover:text-white"
                aria-pressed={showPasswords}
              >
                {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
                {showPasswords ? "Hide passwords" : "Show passwords"}
              </button>

              {passwordError && (
                <p role="alert" className="rounded-xl border border-orange-500/[0.25] bg-orange-500/[0.07] px-3.5 py-3 text-[12px] leading-5 text-orange-300">
                  {passwordError}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={closePasswordDialog}
                  disabled={resettingPassword}
                  className="h-11 rounded-xl border border-white/[0.14] bg-white/[0.035] px-5 text-[13px] font-semibold text-white/[0.82] transition hover:bg-white/[0.07] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword || !resetToken.trim() || !nextPassword || !confirmPassword}
                  className="h-11 rounded-xl bg-orange-500 px-5 text-[13px] font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {resettingPassword ? "Updating…" : "Update Password"}
                </button>
              </div>
            </form>
            )}
            {passwordUpdated && (
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={closePasswordDialog}
                  className="h-11 rounded-xl bg-orange-500 px-5 text-[13px] font-semibold text-black hover:bg-orange-400"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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

/** Self-contained password input for the new UI. No password is persisted. */
function PasswordInput({
  id,
  label,
  value,
  onChange,
  show,
  autoComplete,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  autoComplete: "one-time-code" | "new-password";
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[12px] font-medium text-white/[0.80]">
        {label}
      </label>
      <input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={`Enter ${label.toLowerCase()}`}
        className="h-11 w-full rounded-xl border border-white/[0.12] bg-[#0d0b0e] px-4 text-[13px] text-white outline-none transition placeholder:text-white/[0.28] focus:border-orange-500/[0.70] focus:ring-2 focus:ring-orange-500/[0.08]"
      />
    </div>
  );
}
