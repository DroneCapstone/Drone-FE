interface CustomerProfile {
  phone: string;
}

function getKey(userId: string) {
  return `droneoptai.customer.profile.${userId}`;
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
};