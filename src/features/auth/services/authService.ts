import type {
  AuthUser,
  LoginPayload,
  RegisterPayload,
  UserRole,
} from "../types/auth";

interface StoredUser extends AuthUser {
  passwordHash: string;
}

const USERS_KEY = "droneoptai.auth.users";

/*
 * Account đã register vẫn lưu localStorage
 * để refresh/dev restart không mất account.
 */
const MOCK_USERS: Record<UserRole, AuthUser> = {
  operator: {
    id: "mock-operator",
    name: "Operator Demo",
    email: "operator@droneopt.ai",
    role: "operator",
  },

  customer: {
    id: "mock-customer",
    name: "Customer Demo",
    email: "customer@droneopt.ai",
    role: "customer",
  },

  admin: {
    id: "mock-admin",
    name: "Admin Demo",
    email: "admin@droneopt.ai",
    role: "admin",
  },

  technician: {
    id: "mock-technician",
    name: "Technician Demo",
    email: "technician@droneopt.ai",
    role: "technician",
  },
};

/* =========================================================
   CURRENT SESSION

   Không persist bằng localStorage nữa.
   Refresh / mở lại app => trở về Guest.
========================================================= */

let currentSession: AuthUser | null = null;

/* =========================================================
   USERS
========================================================= */

function readUsers(): StoredUser[] {
  try {
    return JSON.parse(
      localStorage.getItem(USERS_KEY) ?? "[]",
    ) as StoredUser[];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(
    USERS_KEY,
    JSON.stringify(users),
  );
}

/* =========================================================
   PASSWORD
========================================================= */

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    data,
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
}

/* =========================================================
   USER ID
========================================================= */

function createId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `user-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

/* =========================================================
   AUTH SERVICE
========================================================= */

export const authService = {
  /* =========================
     CURRENT USER
  ========================= */

  getCurrentUser(): AuthUser | null {
    return currentSession;
  },

  /* =========================
     LOGIN
  ========================= */

  async login(
    payload: LoginPayload,
  ): Promise<AuthUser> {
    const email = payload.email
      .trim()
      .toLowerCase();

    const passwordHash = await hashPassword(
      payload.password,
    );

    const user = readUsers().find(
      (item) => item.email === email,
    );

    if (
      !user ||
      user.passwordHash !== passwordHash
    ) {
      throw new Error(
        "Email or password is incorrect.",
      );
    }

    const {
      passwordHash: _passwordHash,
      ...safeUser
    } = user;

    currentSession = safeUser;

    return safeUser;
  },

  /* =========================
     REGISTER
  ========================= */

  async register(
    payload: RegisterPayload,
  ): Promise<AuthUser> {
    const name = payload.name.trim();

    const email = payload.email
      .trim()
      .toLowerCase();

    const users = readUsers();

    if (!name) {
      throw new Error(
        "Please enter your full name.",
      );
    }

    if (
      users.some(
        (item) => item.email === email,
      )
    ) {
      throw new Error(
        "An account with this email already exists.",
      );
    }

    const passwordHash = await hashPassword(
      payload.password,
    );

    const user: StoredUser = {
      id: createId(),

      name,

      email,

      /*
       * Người dùng đăng ký thông thường
       * mặc định là Customer.
       */
      role: "customer",

      passwordHash,
    };

    writeUsers([...users, user]);

    const {
      passwordHash: _passwordHash,
      ...safeUser
    } = user;

    currentSession = safeUser;

    return safeUser;
  },

  /* =========================
     MOCK ROLE LOGIN
  ========================= */

  loginAsRole(role: UserRole): AuthUser {
    const user = MOCK_USERS[role];

    currentSession = user;

    return user;
  },

  /* =========================
     GOOGLE LOGIN MOCK
  ========================= */

  loginWithGoogle(): AuthUser {
    const user: AuthUser = {
      id: "mock-google-user",
      name: "Google User",
      email: "google.user@gmail.com",
      role: "customer",
    };

    currentSession = user;

    return user;
  },

  /* =========================
     LOGOUT
  ========================= */

  logout() {
    currentSession = null;
  },
};