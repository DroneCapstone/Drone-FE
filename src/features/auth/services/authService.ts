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
const SESSION_KEY = "droneoptai.auth.session";

/* =========================================================
   MOCK USERS
   Chỉ dùng cho development / demo
========================================================= */

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

function writeSession(user: AuthUser) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify(user),
  );
}

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

function createId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `user-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

export const authService = {
  getCurrentUser(): AuthUser | null {
    try {
      return JSON.parse(
        localStorage.getItem(SESSION_KEY) ?? "null",
      ) as AuthUser | null;
    } catch {
      return null;
    }
  },

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

    writeSession(safeUser);

    return safeUser;
  },

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
       * Tạm thời mặc định customer.
       * Backend thật sẽ quyết định role.
       */
      role: "customer",

      passwordHash,
    };

    writeUsers([...users, user]);

    const {
      passwordHash: _passwordHash,
      ...safeUser
    } = user;

    writeSession(safeUser);

    return safeUser;
  },

  loginAsRole(role: UserRole): AuthUser {
    const user = MOCK_USERS[role];

    writeSession(user);

    return user;
  },

  /*
   * Demo UI Google Login.
   * Sau này thay bằng Google OAuth thật.
   */
  loginWithGoogle(): AuthUser {
    const user: AuthUser = {
      id: "mock-google-user",
      name: "Google User",
      email: "google.user@gmail.com",
      role: "customer",
    };

    writeSession(user);

    return user;
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
  },
};