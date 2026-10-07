import {
  useEffect,
  useState,
} from "react";

import { useAuth } from "../../auth/hooks/useAuth";

import {
  customerProfileService,
} from "../services/customerProfileService";

export function CustomerProfilePage() {
  const { user } = useAuth();

  const cached = user
    ? customerProfileService.get(
        user.id,
      )
    : {
        phone: "",
      };

  const [phone, setPhone] =
    useState(cached.phone);

  const [loading, setLoading] =
    useState(Boolean(user));

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

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
      setMessage("Saved");
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
    <div className="mx-auto max-w-[760px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <h1 className="text-[34px] font-semibold tracking-[-0.04em] sm:text-4xl">
        Profile
      </h1>

      <div className="mt-8 space-y-6 sm:mt-10 sm:space-y-7">
        <label className="block">
          <span className="text-xs text-white/40">
            Full name
          </span>
          <input
            value={user.name}
            readOnly
            className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/[0.025] px-4 text-sm text-white/45"
          />
        </label>

        <label className="block">
          <span className="text-xs text-white/40">
            Email
          </span>
          <input
            value={user.email}
            readOnly
            className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/[0.025] px-4 text-sm text-white/45"
          />
        </label>

        <label className="block">
          <span className="text-xs text-white/40">
            Phone number
          </span>
          <input
            value={phone}
            disabled={loading}
            onChange={(event) =>
              setPhone(
                event.target.value,
              )
            }
            className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-4 text-sm outline-none focus:border-orange-500 disabled:opacity-60"
          />
        </label>

        {message && (
          <p className="text-[12px] text-white/[0.50]">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={loading || saving}
          className="h-12 rounded-lg bg-orange-500 px-7 text-sm font-semibold text-black hover:bg-orange-400 disabled:opacity-50"
        >
          {saving
            ? "Saving…"
            : "Save changes"}
        </button>
      </div>
    </div>
  );
}
