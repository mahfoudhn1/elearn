
import type { AxiosError } from "axios";
import * as SecureStore from "expo-secure-store";
import type { UserProfile, UserRole } from "../../types";
import { apiClient, describeApiError, extractApiErrorMessage, isNetworkError } from "./client";

const SESSION_KEY = "riffaa-session";

export type AuthSession = {
  user: {
    id: string;
    email: string;
    name: string;
    role: "student" | "instructor";
  };
  token: string;
  refreshToken?: string;
};

type BackendAuthResponse = {
  user: {
    id: number | string;
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    avatar_url?: string | null;
    avatar?: string | null;
  };
  message?: string;
  /** JWT access token — the backend may send `access` (JWT) or `access_token` (legacy). */
  access?: string;
  refresh?: string;
  access_token?: string;
  refresh_token?: string;
};

function normalizeApiError(error: unknown): Error {
  // No HTTP response: either the device is offline or the server is unreachable.
  // `describeApiError` distinguishes the two with a clear message.
  if (isNetworkError(error)) {
    return new Error(describeApiError(error));
  }

  if (error && typeof error === "object") {
    const axiosError = error as AxiosError<Record<string, unknown>>;

    console.warn("[auth] API error:", {
      status: axiosError.response?.status,
      data: axiosError.response?.data,
    });

    if (axiosError.response?.data) {
      return new Error(extractApiErrorMessage(axiosError.response.data));
    }
  }

  return error instanceof Error
    ? error
    : new Error("تعذر الاتصال بالخادم");
}

/**
 * Convert Django role names to the role names used by the app.
 *
 * Django:
 *   teacher
 *   student
 *
 * App:
 *   instructor
 *   student
 */
function normalizeRole(role?: string): "student" | "instructor" {
  if (
    role === "teacher" ||
    role === "instructor"
  ) {
    return "instructor";
  }

  return "student";
}

function normalizeProfile(
  user: BackendAuthResponse["user"],
  fallbackUsername: string
): UserProfile {
  const firstName = user.first_name?.trim() ?? "";
  const lastName = user.last_name?.trim() ?? "";

  const fullName =
    `${firstName} ${lastName}`.trim() ||
    user.username ||
    fallbackUsername;

  return {
    id: String(user.id),
    name: fullName,
    email: user.email || fallbackUsername,
    role: normalizeRole(user.role) as UserRole,
    avatarUrl:
      user.avatar_url ??
      user.avatar ??
      undefined,
    bio: undefined,
    language: "ar",
    theme: "light",
  };
}

/**
 * Convert the exact Django response into the session
 * expected by the React Native app.
 *
 * The auth endpoint has been normalised to return JWT `access`/`refresh` keys,
 * but some older clients/stages still send `access_token`/`refresh_token`.
 */
function normalizeAuthenticationPayload(
  payload: BackendAuthResponse,
  fallbackUsername: string
) {
  const accessToken = payload.access ?? payload.access_token;
  if (!accessToken) {
    throw new Error("الخادم لم يرجع رمز JWT صالح");
  }

  const profile = normalizeProfile(
    payload.user,
    fallbackUsername
  );

  const session: AuthSession = {
    user: {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role as "student" | "instructor",
    },
    token: accessToken,
    refreshToken: payload.refresh ?? payload.refresh_token,
  };

  return {
    session,
    profile,
  };
}

/**
 * Login with Django.
 */
export async function loginWithUsernameAndPassword(
  username: string,
  password: string,
  captchaToken?: string | null
) {  const isEmail = username.includes("@");

  try {
    console.log("[auth] Logging in:", username);

    const response =
      await apiClient.post<BackendAuthResponse>(
        "auth/",
        {
          ...(isEmail
            ? { email: username }
            : { username }),

          password,

          ...(captchaToken
            ? { captcha: captchaToken }
            : {}),
        },
        {
          headers: {
            "X-Mobile-Client": "true",
          },
        }
      );

    const { session, profile } =
      normalizeAuthenticationPayload(
        response.data,
        username
      );

    /**
     * IMPORTANT:
     * Save the exact session format expected by client.ts.
     */
    await SecureStore.setItemAsync(
      SESSION_KEY,
      JSON.stringify(session)
    );

    console.log("[auth] Login successful");
    console.log("[auth] User:", profile.id);
    console.log("[auth] Role:", profile.role);

    return {
      session,
      profile,
      backend: response.data,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * Exchange a Google ID token for Riffaa JWTs.
 *
 * The native Google Sign-In flow (configured with the web client ID) returns an
 * `id_token` that the backend verifies against `GOOGLE_CLIENT_ID`. On success we
 * receive `access`/`refresh` plus the serialized user.
 */
export async function signInWithGoogle(idToken: string) {
  const response = await apiClient.post<BackendAuthResponse>(
    "auth/callback/google/",
    { id_token: idToken },
    {
      headers: {
        "X-Mobile-Client": "true",
      },
    }
  );

  const { session, profile } = normalizeAuthenticationPayload(
    response.data,
    response.data.user.email || response.data.user.username || "google"
  );

  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));

  console.log("[auth] Google sign-in successful");
  console.log("[auth] User:", profile.id);
  console.log("[auth] Role:", profile.role);

  return {
    session,
    profile,
    backend: response.data,
  };
}

/**
 * Get the currently stored session.
 */
export async function getStoredSession(): Promise<AuthSession | null> {
  try {
    const raw =
      await SecureStore.getItemAsync(SESSION_KEY);

    if (!raw) {
      return null;
    }

    const session = JSON.parse(raw) as AuthSession;

    if (!session?.token || !session?.user) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      return null;
    }

    return session;
  } catch (error) {
    console.warn(
      "[auth] Failed to restore session:",
      error
    );

    await SecureStore.deleteItemAsync(SESSION_KEY);

    return null;
  }
}

/**
 * Refresh the access token.
 */
export async function refreshAccessToken(
  refreshToken: string
) {
  try {
    // The Django backend reads `refreshToken` (cookie fallback) and answers with
    // `access_token` / `refresh_token`.
    const response = await apiClient.post(
      "token/refresh/",
      {
        refreshToken,
      }
    );

    const newAccessToken =
      response.data?.access_token ??
      response.data?.access;

    if (!newAccessToken) {
      throw new Error(
        "الخادم لم يرجع رمز وصول جديد"
      );
    }

    const currentSession =
      await getStoredSession();

    if (currentSession) {
      const updatedSession: AuthSession = {
        ...currentSession,
        token: newAccessToken,
      };

      await SecureStore.setItemAsync(
        SESSION_KEY,
        JSON.stringify(updatedSession)
      );
    }

    return newAccessToken;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * Logout.
 */
export async function logout() {
  try {
    await SecureStore.deleteItemAsync(
      SESSION_KEY
    );
  } catch (error) {
    console.warn(
      "[auth] Failed to clear session:",
      error
    );
  }
}

export function extractErrorMessage(
  payload: unknown
) {
  return extractApiErrorMessage(payload);
}

/** Exact body the Django `register/` endpoint expects. */
export interface RegisterStudentPayload {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password2: string;
  role?: "student" | "teacher";
  /**
   * Cloudflare Turnstile token. Required by the backend (`verify_captcha`);
   * without it registration is rejected with `{ error: "Invalid CAPTCHA" }`.
   */
  captcha: string;
}

/**
 * Create the Django user. Onboarding fields (wilaya / grade / field of study)
 * are NOT part of this endpoint — they live on `students/` (see
 * `updateStudentProfile`).
 */
export async function registerStudent(payload: RegisterStudentPayload) {
  const response = await apiClient.post<{
    user: BackendAuthResponse["user"];
    message?: string;
  }>("register/", payload);
  return response.data;
}

/** Fields the Django `students/` serializer accepts. */
export interface StudentProfilePayload {
  wilaya?: string;
  /** Primary key from `grades/`. */
  grade_id?: number;
  /** Primary key from `fieldofstudy/` (the "branch"). */
  field_of_study_id?: number;
  phone_number?: string;
}

/** Attach the onboarding data to the authenticated student's profile. */
export async function updateStudentProfile(payload: StudentProfilePayload) {
  const response = await apiClient.post("students/", payload);
  return response.data;
}

type ProfileWithUser = BackendAuthResponse["user"] & {
  user?: BackendAuthResponse["user"];
};

/**
 * Current authenticated profile.
 *
 * There is no `users/me/` route: students are served by `students/me/` and
 * teachers by `teacher/profile/me/`. Both embed the `user` object, so we return
 * that when present.
 */
export async function getCurrentUser() {
  const pick = (data: ProfileWithUser) => data.user ?? data;

  try {
    const response = await apiClient.get<ProfileWithUser>("students/me/");
    return pick(response.data);
  } catch (error) {
    const status = (error as AxiosError)?.response?.status;
    if (status !== 404) throw error;
    const response = await apiClient.get<ProfileWithUser>("teacher/profile/me/");
    return pick(response.data);
  }
}

export type { BackendAuthResponse };

