import {
  useState,
} from "react";

import { useAuth } from "../../auth/hooks/useAuth";

import {
  customerProfileService,
} from "../services/customerProfileService";

export function CustomerProfilePage() {
  const { user } =
    useAuth();

  const profile =
    user
      ? customerProfileService.get(
          user.id,
        )
      : {
          phone: "",
        };

  const [phone, setPhone] =
    useState(profile.phone);

  const [saved, setSaved] =
    useState(false);

  if (!user) {
    return null;
  }

  const save = () => {
    customerProfileService.save(
      user.id,
      {
        phone,
      },
    );

    setSaved(true);

    window.setTimeout(
      () => setSaved(false),
      2000,
    );
  };

  return (
    <div className="mx-auto max-w-[760px] px-6 py-14 lg:px-10">
      <h1 className="text-4xl font-semibold tracking-[-0.04em]">
        Profile
      </h1>

      <div className="mt-10 space-y-7">
        <label className="block">
          <span className="text-xs text-white/40">
            Full name
          </span>

          <input
            value={user.name}
            readOnly
            className="mt-2 h-12 w-full border border-white/10 bg-white/[0.025] px-4 text-sm text-white/45"
          />
        </label>

        <label className="block">
          <span className="text-xs text-white/40">
            Email
          </span>

          <input
            value={user.email}
            readOnly
            className="mt-2 h-12 w-full border border-white/10 bg-white/[0.025] px-4 text-sm text-white/45"
          />
        </label>

        <label className="block">
          <span className="text-xs text-white/40">
            Phone number
          </span>

          <input
            value={phone}
            onChange={(event) =>
              setPhone(
                event.target.value,
              )
            }
            className="mt-2 h-12 w-full border border-white/10 bg-[#0a0a0a] px-4 text-sm outline-none focus:border-orange-500"
          />
        </label>

        <button
          type="button"
          onClick={save}
          className="h-12 bg-orange-500 px-7 text-sm font-semibold text-black hover:bg-orange-400"
        >
          {saved
            ? "Saved"
            : "Save changes"}
        </button>
      </div>
    </div>
  );
}