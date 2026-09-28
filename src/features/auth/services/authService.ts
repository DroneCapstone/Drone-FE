import type {
  AuthTokens,
  AuthUser,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  UserRole,
} from "../types/auth";

const viteEnv = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
}).env;

const DEFAULT_API_BASE_URL =
  "https://execute-blind-pitch-frequently.trycloudflare.com/api/v1";

export const API_BASE_URL = (
  viteEnv?.VITE_API_BASE_URL ??
  DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "droneoptai.auth.user";

export class AuthApiError extends Error {
  status: number;
  payload: unknown;

  constructor(
    message: string,
    status: number,
    payload?: unknown,
  ) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.payload = payload;
  }
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function unwrapObject(
  payload: unknown,
): Record<string, unknown> {
  if (!isRecord(payload)) {
    return {};
  }

  if (isRecord(payload.data)) {
    return payload.data;
  }

  return payload;
}

function pickString(
  record: Record<string, unknown>,
  keys: string[],
  fallback = "",
) {
  for (const key of keys) {
    const value = record[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value;
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return fallback;
}

async function parseResponseBody(
  response: Response,
) {
  if (response.status === 204) {
    return null;
  }

  const contentType =
    response.headers.get("content-type") ?? "";

  if (
    contentType.includes(
      "application/json",
    )
  ) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
}

function getFastApiValidationMessage(
  payload: unknown,
) {
  if (!isRecord(payload)) {
    return null;
  }

  if (
    typeof payload.detail === "string"
  ) {
    return payload.detail;
  }

  if (Array.isArray(payload.detail)) {
    const messages = payload.detail
      .map((item) => {
        if (!isRecord(item)) {
          return null;
        }

        const message =
          typeof item.msg === "string"
            ? item.msg
            : "Invalid value";

        const location = Array.isArray(
          item.loc,
        )
          ? item.loc
              .filter(
                (part) =>
                  typeof part === "string" ||
                  typeof part === "number",
              )
              .map(String)
              .filter(
                (part) =>
                  part !== "body" &&
                  part !== "query",
              )
              .join(".")
          : "";

        return location
          ? `${location}: ${message}`
          : message;
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(" · ");
    }
  }

  if (
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return null;
}

function getMissingValidationFields(
  payload: unknown,
) {
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.detail)
  ) {
    return new Set<string>();
  }

  const result = new Set<string>();

  payload.detail.forEach((item) => {
    if (
      !isRecord(item) ||
      !Array.isArray(item.loc)
    ) {
      return;
    }

    const field = item.loc.at(-1);

    if (typeof field === "string") {
      result.add(field);
    }
  });

  return result;
}

async function authRequest<T = unknown>(
  path: string,
  init: RequestInit = {},
  accessToken?: string | null,
): Promise<T> {
  const headers = new Headers(
    init.headers,
  );

  headers.set(
    "Accept",
    "application/json",
  );

  if (
    init.body &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  if (accessToken) {
    headers.set(
      "Authorization",
      `Bearer ${accessToken}`,
    );
  }

  const withCredentials =
    viteEnv?.VITE_API_WITH_CREDENTIALS ===
    "true";

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...init,
      headers,
      credentials: withCredentials
        ? "include"
        : "omit",
    },
  );

  const payload =
    await parseResponseBody(response);

  if (!response.ok) {
    throw new AuthApiError(
      getFastApiValidationMessage(
        payload,
      ) ??
        `Authentication request failed (${response.status}).`,
      response.status,
      payload,
    );
  }

  return payload as T;
}

function normalizeRole(
  rawRole: unknown,
): UserRole {
  const role = String(rawRole ?? "")
    .trim()
    .toLowerCase();

  if (
    role === "operator" ||
    role === "customer" ||
    role === "technician" ||
    role === "admin"
  ) {
    return role;
  }

  throw new Error(
    `Unsupported user role returned by Backend: ${String(
      rawRole ?? "empty",
    )}`,
  );
}

function normalizeUser(
  payload: unknown,
): AuthUser {
  const root = unwrapObject(payload);

  const userRecord = isRecord(root.user)
    ? root.user
    : isRecord(root.profile)
      ? root.profile
      : root;

  const id = pickString(
    userRecord,
    ["id", "user_id", "userId"],
  );

  const email = pickString(
    userRecord,
    ["email"],
  );

  const name = pickString(
    userRecord,
    [
      "name",
      "full_name",
      "fullName",
      "username",
      "display_name",
      "displayName",
    ],
    email,
  );

  const roleValue =
    userRecord.role ??
    userRecord.user_role ??
    userRecord.userRole;

  if (!id || !email || !roleValue) {
    throw new Error(
      "Backend user profile is missing id, email, or role.",
    );
  }

  return {
    id,
    name: name || email,
    email,
    role: normalizeRole(roleValue),
  };
}

function extractTokens(
  payload: unknown,
): AuthTokens | null {
  const root = unwrapObject(payload);

  const tokenRecord = isRecord(root.tokens)
    ? root.tokens
    : root;

  const accessToken = pickString(
    tokenRecord,
    [
      "access_token",
      "accessToken",
      "token",
    ],
  );

  if (!accessToken) {
    return null;
  }

  const refreshToken = pickString(
    tokenRecord,
    ["refresh_token", "refreshToken"],
  );

  const tokenType = pickString(
    tokenRecord,
    ["token_type", "tokenType"],
    "bearer",
  );

  return {
    accessToken,
    refreshToken:
      refreshToken || undefined,
    tokenType,
  };
}

function extractMessage(
  payload: unknown,
  fallback: string,
) {
  if (typeof payload === "string") {
    return payload;
  }

  const root = unwrapObject(payload);

  return pickString(
    root,
    ["message", "detail", "status"],
    fallback,
  );
}

function persistTokens(
  tokens: AuthTokens,
  preserveExistingRefresh = false,
) {
  localStorage.setItem(
    ACCESS_TOKEN_KEY,
    tokens.accessToken,
  );

  if (tokens.refreshToken) {
    localStorage.setItem(
      REFRESH_TOKEN_KEY,
      tokens.refreshToken,
    );
  } else if (!preserveExistingRefresh) {
    localStorage.removeItem(
      REFRESH_TOKEN_KEY,
    );
  }
}

function persistUser(
  user: AuthUser,
) {
  localStorage.setItem(
    USER_KEY,
    JSON.stringify(user),
  );
}

function clearStoredSession() {
  [
    ACCESS_TOKEN_KEY,
    "accessToken",
    "auth_token",
    "authToken",
    "token",
    REFRESH_TOKEN_KEY,
    "refreshToken",
    USER_KEY,
  ].forEach((key) => {
    localStorage.removeItem(key);
  });
}

function readStoredUser(): AuthUser | null {
  try {
    const value =
      localStorage.getItem(USER_KEY);

    if (!value) {
      return null;
    }

    const parsed = JSON.parse(
      value,
    ) as unknown;

    return normalizeUser(parsed);
  } catch {
    return null;
  }
}

async function fetchCurrentUser(
  accessToken: string,
) {
  const payload =
    await authRequest<unknown>(
      "/users/me",
      {
        method: "GET",
      },
      accessToken,
    );

  return normalizeUser(payload);
}

async function performLoginRequest(
  payload: LoginPayload,
) {
  const email = payload.email
    .trim()
    .toLowerCase();

  try {
    return await authRequest<unknown>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          password: payload.password,
        }),
      },
    );
  } catch (reason) {
    if (
      !(reason instanceof AuthApiError) ||
      ![415, 422].includes(reason.status)
    ) {
      throw reason;
    }

    const missing =
      getMissingValidationFields(
        reason.payload,
      );

    if (
      !missing.has("username") &&
      reason.status !== 415
    ) {
      throw reason;
    }
  }

  try {
    return await authRequest<unknown>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          username: email,
          password: payload.password,
        }),
      },
    );
  } catch (reason) {
    if (
      !(reason instanceof AuthApiError) ||
      ![415, 422].includes(reason.status)
    ) {
      throw reason;
    }
  }

  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", payload.password);

  return authRequest<unknown>(
    "/auth/login",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body,
    },
  );
}

async function performRegisterRequest(
  payload: RegisterPayload,
) {
  const name = payload.name.trim();
  const email = payload.email
    .trim()
    .toLowerCase();

  try {
    return await authRequest<unknown>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password: payload.password,
        }),
      },
    );
  } catch (reason) {
    if (
      !(reason instanceof AuthApiError) ||
      reason.status !== 422
    ) {
      throw reason;
    }

    const missing =
      getMissingValidationFields(
        reason.payload,
      );

    if (!missing.has("full_name")) {
      throw reason;
    }
  }

  return authRequest<unknown>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        full_name: name,
        email,
        password: payload.password,
      }),
    },
  );
}

async function performResetPasswordRequest(
  payload: ResetPasswordPayload,
) {
  const variants = [
    {
      token: payload.token,
      new_password: payload.newPassword,
    },
    {
      token: payload.token,
      password: payload.newPassword,
    },
    {
      reset_token: payload.token,
      new_password: payload.newPassword,
    },
  ];

  let lastError: unknown;

  for (const body of variants) {
    try {
      return await authRequest<unknown>(
        "/auth/reset-password",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
    } catch (reason) {
      lastError = reason;

      if (
        !(reason instanceof AuthApiError) ||
        reason.status !== 422
      ) {
        throw reason;
      }
    }
  }

  throw lastError;
}

async function performRefreshRequest(
  refreshToken: string,
) {
  const variants = [
    { refresh_token: refreshToken },
    { refreshToken },
  ];

  let lastError: unknown;

  for (const body of variants) {
    try {
      return await authRequest<unknown>(
        "/auth/refresh",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
    } catch (reason) {
      lastError = reason;

      if (
        !(reason instanceof AuthApiError) ||
        reason.status !== 422
      ) {
        throw reason;
      }
    }
  }

  throw lastError;
}

const MOCK_USERS: Record<
  UserRole,
  AuthUser
> = {
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

export const authService = {
  getCurrentUser(): AuthUser | null {
    return readStoredUser();
  },

  getAccessToken() {
    return localStorage.getItem(
      ACCESS_TOKEN_KEY,
    );
  },

  getRefreshToken() {
    return localStorage.getItem(
      REFRESH_TOKEN_KEY,
    );
  },

  async login(
    payload: LoginPayload,
  ): Promise<AuthUser> {
    const response =
      await performLoginRequest(payload);

    const tokens = extractTokens(response);

    if (!tokens) {
      throw new Error(
        "Login response did not contain an access token.",
      );
    }

    persistTokens(tokens);

    let user: AuthUser;

    try {
      user = await fetchCurrentUser(
        tokens.accessToken,
      );
    } catch (reason) {
      try {
        user = normalizeUser(response);
      } catch {
        clearStoredSession();
        throw reason;
      }
    }

    persistUser(user);
    return user;
  },

  async register(
    payload: RegisterPayload,
  ): Promise<AuthUser> {
    const response =
      await performRegisterRequest(payload);

    const tokens = extractTokens(response);

    if (tokens) {
      persistTokens(tokens);

      try {
        const user =
          await fetchCurrentUser(
            tokens.accessToken,
          );

        persistUser(user);
        return user;
      } catch {
        const user =
          normalizeUser(response);

        persistUser(user);
        return user;
      }
    }

    return this.login({
      email: payload.email,
      password: payload.password,
    });
  },

  async forgotPassword(
    payload: ForgotPasswordPayload,
  ) {
    const response =
      await authRequest<unknown>(
        "/auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({
            email: payload.email
              .trim()
              .toLowerCase(),
          }),
        },
      );

    return extractMessage(
      response,
      "Password reset instructions were sent if the account exists.",
    );
  },

  async resetPassword(
    payload: ResetPasswordPayload,
  ) {
    const response =
      await performResetPasswordRequest(
        payload,
      );

    return extractMessage(
      response,
      "Password reset successfully. You can sign in with your new password.",
    );
  },

  async refreshAccessToken() {
    const refreshToken =
      this.getRefreshToken();

    if (!refreshToken) {
      return null;
    }

    try {
      const response =
        await performRefreshRequest(
          refreshToken,
        );

      const tokens =
        extractTokens(response);

      if (!tokens) {
        clearStoredSession();
        return null;
      }

      persistTokens(
        tokens,
        true,
      );

      return tokens.accessToken;
    } catch {
      clearStoredSession();
      return null;
    }
  },

  async restoreSession() {
    let accessToken =
      this.getAccessToken();

    if (!accessToken) {
      clearStoredSession();
      return null;
    }

    try {
      const user =
        await fetchCurrentUser(
          accessToken,
        );

      persistUser(user);
      return user;
    } catch (reason) {
      if (
        reason instanceof AuthApiError &&
        reason.status === 401
      ) {
        accessToken =
          await this.refreshAccessToken();

        if (accessToken) {
          const user =
            await fetchCurrentUser(
              accessToken,
            );

          persistUser(user);
          return user;
        }
      }

      clearStoredSession();
      return null;
    }
  },

  loginAsRole(
    role: UserRole,
  ): AuthUser {
    const user = MOCK_USERS[role];

    persistUser(user);
    return user;
  },

  loginWithGoogle() {
    window.location.assign(
      `${API_BASE_URL}/auth/google`,
    );
  },

  async logout() {
    const accessToken =
      this.getAccessToken();

    try {
      if (accessToken) {
        await authRequest(
          "/auth/logout",
          {
            method: "POST",
          },
          accessToken,
        );
      }
    } finally {
      clearStoredSession();
    }
  },
};
