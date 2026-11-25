import {
  ApiError,
  customerApi,
  type CustomerProfileApi,
} from "./customerApi";

interface CustomerProfile {
  phone: string;
  email: string;
}

function getKey(userId: string) {
  return `droneoptai.customer.profile.${userId}`;
}

function normalizePhone(profile: CustomerProfileApi): string {
  return String(profile.phone ?? profile.phone_number ?? "").trim();
}

function normalizeEmail(profile: CustomerProfileApi): string {
  return String(profile.email ?? "").trim();
}

export const customerProfileService = {
  get(userId: string): CustomerProfile {
    try {
      const parsed: unknown = JSON.parse(
        localStorage.getItem(getKey(userId)) ?? "{}",
      );
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { phone: "", email: "" };
      }
      const cached = parsed as Record<string, unknown>;
      return {
        phone: typeof cached.phone === "string" ? cached.phone : "",
        email: typeof cached.email === "string" ? cached.email : "",
      };
    } catch {
      return { phone: "", email: "" };
    }
  },

  save(userId: string, profile: CustomerProfile) {
    localStorage.setItem(getKey(userId), JSON.stringify(profile));
  },

  remove(userId: string) {
    try {
      localStorage.removeItem(getKey(userId));
    } catch {
      // Storage restrictions must not prevent a deleted user from logging out.
    }
  },

  async loadRemote(userId: string) {
    const profile = await customerApi.getProfile();
    const cached = this.get(userId);
    const normalized = {
      phone: normalizePhone(profile) || cached.phone,
      email: normalizeEmail(profile) || cached.email,
    };
    this.save(userId, normalized);
    return { ...profile, ...normalized };
  },

  /**
   * Keep the existing phone-only call supported. An email is included in PATCH
   * only when the customer actually edits it on Profile. Email updates require
   * support from PATCH /api/v1/users/me; we verify via GET before caching.
   */
  async saveRemote(userId: string, phone: string, newEmail?: string) {
    const cleanPhone = phone.trim();
    const cleanEmail = newEmail?.trim().toLowerCase();
    const emailFields = cleanEmail ? { email: cleanEmail } : {};
    let response: CustomerProfileApi;

    try {
      response = await customerApi.updateProfile({ phone: cleanPhone, ...emailFields });
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        // Existing BE compatibility for phone vs phone_number.
        // Keep email in both attempts: never silently discard a requested
        // email change and claim it was saved.
        response = await customerApi.updateProfile({ phone_number: cleanPhone, ...emailFields });
      } else {
        throw error;
      }
    }

    let confirmed = response;
    if (cleanEmail) {
      // A successful 2xx is not sufficient if BE ignores unknown email fields.
      confirmed = await customerApi.getProfile();
      if (normalizeEmail(confirmed).toLowerCase() !== cleanEmail) {
        throw new Error(
          "The server did not confirm the new email address. Please check whether your backend supports updating email in /api/v1/users/me.",
        );
      }
    }

    const old = this.get(userId);
    const normalized = {
      phone: normalizePhone(confirmed) || cleanPhone,
      email: normalizeEmail(confirmed) || old.email,
    };
    this.save(userId, normalized);
    return { ...confirmed, ...normalized };
  },
};
