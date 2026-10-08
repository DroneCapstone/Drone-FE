import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { customerProfileService } from "../services/customerProfileService";

export function CustomerProfilePage() {
  const { user } = useAuth();

  const cached = user
    ? customerProfileService.get(user.id)
    : { phone: "" };

  const [phone, setPhone] = useState(cached.phone);
  const [loading, setLoading] = useState(Boolean(user));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    customerProfileService
      .loadRemote(user.id)
      .then((profile) => {
        setPhone(profile.phone);
      })
      .catch((error) => {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load profile.",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

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

  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 pb-16 pt-9 sm:px-6 sm:pt-12 lg:px-10">
      <section className="border-b border-white/[0.08] pb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-400">
          Account
        </p>
        <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.045em] text-white sm:text-[42px]">
          Profile
        </h1>
        <p className="mt-3 text-[13px] leading-6 text-white/[0.50]">
          Manage the contact information used for customer deliveries.
        </p>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-2xl border border-white/[0.10] bg-[#151217]/94 p-5 sm:p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-[18px] font-semibold text-black">
            {initial}
          </div>
          <p className="mt-4 text-[16px] font-semibold text-white">
            {user.name}
          </p>
          <p className="mt-1 text-[11px] text-white/[0.38]">
            Customer account
          </p>

          <div className="mt-5 border-t border-white/[0.07] pt-3">
            <ProfileLink
              title="Pricing & services"
              to="/customer/pricing"
            />
            <ProfileLink
              title="Help & policies"
              to="/customer/help"
            />
            <ProfileLink
              title="Notifications"
              to="/customer/notifications"
            />
          </div>
        </aside>

        <div className="rounded-2xl border border-white/[0.10] bg-[#151217]/94 p-5 sm:p-7">
          <h2 className="text-[16px] font-semibold text-white">
            Contact information
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Full name">
              <input
                value={user.name}
                readOnly
                className="h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 text-[13px] text-white/[0.48] outline-none"
              />
            </Field>

            <Field label="Email">
              <input
                value={user.email}
                readOnly
                className="h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 text-[13px] text-white/[0.48] outline-none"
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Phone number">
                <input
                  value={phone}
                  disabled={loading}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  className="h-12 w-full rounded-xl border border-white/[0.10] bg-[#0d0b0e] px-4 text-[13px] text-white outline-none transition focus:border-orange-500 disabled:opacity-50"
                />
              </Field>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p
              className={`text-[11px] ${
                message === "Changes saved"
                  ? "text-white/[0.48]"
                  : "text-red-300"
              }`}
            >
              {message}
            </p>

            <button
              type="button"
              onClick={save}
              disabled={loading || saving}
              className="h-11 rounded-xl bg-orange-500 px-6 text-[13px] font-semibold text-black transition hover:bg-orange-400 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-medium text-white/[0.48]">
        {label}
      </span>
      {children}
    </label>
  );
}

function ProfileLink({
  title,
  to,
}: {
  title: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between border-b border-white/[0.06] py-3 text-[12px] text-white/[0.52] last:border-b-0 hover:text-white"
    >
      <span>{title}</span>
      <ArrowRight
        size={13}
        className="text-white/[0.22] transition group-hover:translate-x-0.5 group-hover:text-orange-400"
      />
    </Link>
  );
}
