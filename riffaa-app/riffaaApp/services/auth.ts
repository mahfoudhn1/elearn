import * as SecureStore from "expo-secure-store";
import type { UserProfile, UserRole } from "../types";
import {
  getCurrentUser,
  loginWithUsernameAndPassword,
  registerStudent,
  signInWithGoogle as signInWithGoogleApi,
  updateStudentProfile,
  type AuthSession,
  type BackendAuthResponse,
} from "./api/auth";
import { isNetworkError } from "./api/client";

const SESSION_KEY = "riffaa-session";

/** Shape the register screen collects before calling `signUpWithEmail`. */
export interface RegisterInput {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  password?: string;
  /** Cloudflare Turnstile token — required by the backend. */
  captcha?: string;
  wilaya?: string;
  /** "middle" | "high" from the UI. */
  schoolStage?: string;
  educationLevel?: string;
  branch?: string | null;
}

function profileFromSession(session: AuthSession): UserProfile {
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role as UserRole,
    language: "ar",
    theme: "dark",
  };
}

function profileFromUser(
  user: BackendAuthResponse["user"],
  fallback: AuthSession["user"],
): UserProfile {
  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
    user.username ||
    fallback.name;
  return {
    id: String(user.id ?? fallback.id),
    name: fullName,
    email: user.email || fallback.email,
    role: (user.role === "teacher" ? "instructor" : fallback.role) as UserRole,
    avatarUrl: user.avatar_url ?? user.avatar ?? undefined,
    language: "ar",
    theme: "dark",
  };
}

function isUnauthorized(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { response?: { status?: number } }).response?.status === 401
  );
}

export async function saveSession(session: AuthSession | null) {
  if (!session) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

/**
 * Restore the stored session and re-validate it against `users/me/`.
 *
 * The profile is no longer read from a local mock: an unknown user must not
 * silently delete a valid session, so we only clear it on a real 401. When the
 * server is merely unreachable we keep the session and fall back to the values
 * already stored with it.
 */
export async function restoreSession(): Promise<{
  session: AuthSession;
  profile: UserProfile;
} | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;

  let session: AuthSession;
  try {
    session = JSON.parse(raw) as AuthSession;
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }

  if (!session?.token || !session?.user) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }

  try {
    const user = await getCurrentUser();
    return { session, profile: profileFromUser(user, session.user) };
  } catch (error) {
    if (isUnauthorized(error)) {
      // A real 401 (after the client's refresh attempt) means the session is dead.
      await SecureStore.deleteItemAsync(SESSION_KEY);
      return null;
    }
    if (isNetworkError(error)) {
      // Offline / server unreachable: keep the session and trust what we stored.
      return { session, profile: profileFromSession(session) };
    }
    return { session, profile: profileFromSession(session) };
  }
}

export async function signInWithEmail(
  username: string,
  password: string,
  captchaToken?: string | null,
) {
  const { session, profile } = await loginWithUsernameAndPassword(
    username,
    password,
    captchaToken,
  );
  await saveSession(session);
  return { session, profile };
}

/**
 * Sign in with a Google ID token obtained from the native Google Sign-In flow.
 * Persists the session to SecureStore so the rest of the app behaves the same
 * as an email/password login.
 */
export async function signInWithGoogle(idToken: string) {
  const { session, profile } = await signInWithGoogleApi(idToken);
  await saveSession(session);
  return { session, profile };
}

/**
 * Register a student against Django, then sign in to obtain the JWT session.
 *
 * `register/` only creates the user; onboarding fields are attached afterwards
 * through `students/`. Wilaya is a plain string so it is sent directly; grade
 * and field-of-study are foreign keys, so they can only be sent once the UI
 * resolves their primary keys from `grades/` and `fieldofstudy/`.
 */
export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
  registrationData?: RegisterInput,
) {
  const input = registrationData ?? {};
  const username = input.username?.trim() || email;
  const [fallbackFirst, ...fallbackRest] = name.trim().split(" ");
  const firstName = input.firstName?.trim() || fallbackFirst || "";
  const lastName = input.lastName?.trim() || fallbackRest.join(" ");

  await registerStudent({
    username,
    first_name: firstName,
    last_name: lastName,
    email,
    password,
    password2: password,
    role: "student",
    captcha: input.captcha ?? "",
  });

  const { session, profile } = await signInWithEmail(username, password);

  if (input.wilaya) {
    try {
      await updateStudentProfile({ wilaya: input.wilaya });
    } catch {
      // Onboarding is best-effort here; the account itself already exists.
    }
  }

  return { session, profile };
}

export async function signOut() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
