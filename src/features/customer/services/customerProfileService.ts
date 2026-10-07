import {
  ApiError,
  customerApi,
  type CustomerProfileApi,
} from "./customerApi";

interface CustomerProfile {
  phone: string;
}

function getKey(userId: string) {
  return `droneoptai.customer.profile.${userId}`;
}

function normalizePhone(
  profile: CustomerProfileApi,
) {
  return String(
    profile.phone ??
      profile.phone_number ??
      "",
  );
}

export const customerProfileService = {
  get(userId: string): CustomerProfile {
    try {
      return JSON.parse(
        localStorage.getItem(
          getKey(userId),
        ) ?? '{"phone":""}',
      ) as CustomerProfile;
    } catch {
      return {
        phone: "",
      };
    }
  },

  save(
    userId: string,
    profile: CustomerProfile,
  ) {
    localStorage.setItem(
      getKey(userId),
      JSON.stringify(profile),
    );
  },

  async loadRemote(
    userId: string,
  ) {
    const profile =
      await customerApi.getProfile();

    const normalized = {
      phone: normalizePhone(profile),
    };

    this.save(userId, normalized);

    return {
      ...profile,
      ...normalized,
    };
  },

  async saveRemote(
    userId: string,
    phone: string,
  ) {
    /*
     * Swagger lists PATCH /api/v1/users/me but the uploaded
     * customer API document does not specify the profile body.
     * `phone` is the field used by the current FE. If BE uses
     * `phone_number`, change this one payload key only.
     */
    let response: CustomerProfileApi;

    try {
      response =
        await customerApi.updateProfile({
          phone,
        });
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 422
      ) {
        response =
          await customerApi.updateProfile({
            phone_number: phone,
          });
      } else {
        throw error;
      }
    }

    const normalized = {
      phone:
        normalizePhone(response) ||
        phone,
    };

    this.save(userId, normalized);

    return {
      ...response,
      ...normalized,
    };
  },
};
