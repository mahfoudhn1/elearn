
import axios, { AxiosHeaders } from "axios";
import * as SecureStore from "expo-secure-store";
import { translate } from "../i18n";
import { isDeviceOffline } from "../connectivity";

const SESSION_KEY = "riffaa-session";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "") ||
  "https://riffaa.com/api";
  console.log("[api] BASE URL:", API_BASE_URL);
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

function buildAuthorizationHeader(token: string): string {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return "";
  }

  if (
    normalizedToken.startsWith("Bearer ") ||
    normalizedToken.startsWith("Token ")
  ) {
    return normalizedToken;
  }

  return `Bearer ${normalizedToken}`;
}

/**
 * Attach the stored JWT to every API request.
 */
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const raw =
        await SecureStore.getItemAsync(SESSION_KEY);

      if (!raw) {
        console.log("[api] No stored session");
        return config;
      }

      const session = JSON.parse(raw) as {
        token?: string;
      };

      if (!session.token) {
        console.log("[api] Session has no token");
        return config;
      }

      const headers = new AxiosHeaders(
        config.headers
      );

      headers.set(
        "Authorization",
        buildAuthorizationHeader(session.token)
      );

      headers.set(
        "Accept",
        "application/json"
      );

      config.headers = headers;

      console.log(
        "[api]",
        config.method?.toUpperCase(),
        config.url,
        "→ authenticated"
      );
    } catch (error) {
      console.warn(
        "[api] Failed to attach auth token:",
        error
      );
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Single-flight access-token refresh. Parallel 401s share one refresh request so
 * the backend is not hit repeatedly with the same refresh token.
 */
let refreshPromise: Promise<string> | null = null;

async function performTokenRefresh(refreshToken: string): Promise<string> {
  const response = await axios.post(
    `${API_BASE_URL}/token/refresh/`,
    { refreshToken },
    {
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      timeout: 20000,
    }
  );

  const access = response.data?.access_token ?? response.data?.access;
  if (!access) {
    throw new Error("Token refresh failed");
  }

  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (raw) {
    const session = JSON.parse(raw) as Record<string, unknown>;
    session.token = access;
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  }

  return access as string;
}

function getFreshAccessToken(refreshToken: string): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = performTokenRefresh(refreshToken).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Log API responses/errors while debugging.
 */
apiClient.interceptors.response.use(
  (response) => {
    console.log(
      "[api]",
      response.status,
      response.config.method?.toUpperCase(),
      response.config.url
    );

    return response;
  },
  async (error) => {
    const config = error?.config as
      | (typeof error.config & { _retry?: boolean })
      | undefined;
    const url = String(config?.url ?? "");

    // One refresh + retry on 401, never for the refresh call itself.
    if (
      error?.response?.status === 401 &&
      config &&
      !config._retry &&
      !url.includes("token/refresh")
    ) {
      config._retry = true;
      try {
        const raw = await SecureStore.getItemAsync(SESSION_KEY);
        const session = raw
          ? (JSON.parse(raw) as { refreshToken?: string })
          : null;

        if (session?.refreshToken) {
          const token = await getFreshAccessToken(session.refreshToken);
          const headers = new AxiosHeaders(config.headers);
          headers.set("Authorization", buildAuthorizationHeader(token));
          config.headers = headers;
          return apiClient(config);
        }
      } catch {
        // Refresh failed: drop the dead session and clear the in-memory auth
        // state so the root guard renders the login screen.
        await SecureStore.deleteItemAsync(SESSION_KEY);
        const { useAuthStore } = await import("../../store/authStore");
        useAuthStore.getState().clearAuth();
      }
    }

    if (isNetworkError(error)) {
      const offline = isDeviceOffline();
      console.warn(`[api] ${offline ? "offline" : "server unreachable"} — request failed:`, {
        code: error.code,
        message: error.message,
        url: error.config?.url,
      });
    } else if (error.response) {
      console.warn("[api] Server error:", {
        status: error.response.status,
        url: error.config?.url,
        data: error.response.data,
      });
    } else if (error.request) {
      console.warn("[api] No response from server:", {
        message: error.message,
        url: error.config?.url,
      });
    } else {
      console.warn("[api] Request error:", error.message);
    }

    return Promise.reject(error);
  }
);

/**
 * True when the request never reached the server (no connectivity, DNS failure
 * or timeout) as opposed to a real HTTP error response.
 */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    response?: unknown;
    request?: unknown;
    code?: string;
    message?: string;
  };

  if (candidate.response) {
    return false;
  }

  if (candidate.code === "ERR_NETWORK" || candidate.code === "ECONNABORTED") {
    return true;
  }

  return /network error|timeout|failed to fetch/i.test(candidate.message ?? "");
}

/**
 * Localized, user-facing description of an API failure.
 *
 * A failed request can mean two very different things: the device really has no
 * connection, or the device is online but the server could not be reached
 * (wrong DNS, server down, etc.). Only the first should blame the connection.
 */
export function describeApiError(error: unknown): string {
  if (isNetworkError(error)) {
    return isDeviceOffline()
      ? translate("offlineError")
      : translate("serverUnreachable");
  }

  const payload = (error as { response?: { data?: unknown } })?.response?.data;
  return extractApiErrorMessage(payload);
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export async function getAuthHeaders(): Promise<
  Record<string, string>
> {
  try {
    const raw =
      await SecureStore.getItemAsync(SESSION_KEY);

    if (!raw) {
      return {};
    }

    const session = JSON.parse(raw) as {
      token?: string;
    };

    if (!session.token) {
      return {};
    }

    return {
      Authorization: buildAuthorizationHeader(
        session.token
      ),
    };
  } catch {
    return {};
  }
}

export function extractApiErrorMessage(
  payload: unknown
): string {
  if (typeof payload === "string") {
    return payload;
  }

  if (
    payload &&
    typeof payload === "object"
  ) {
    const record =
      payload as Record<string, unknown>;

    if (
      typeof record.detail === "string"
    ) {
      return record.detail;
    }

    if (
      Array.isArray(record.non_field_errors) &&
      typeof record.non_field_errors[0] === "string"
    ) {
      return record.non_field_errors[0];
    }

    if (
      typeof record.message === "string"
    ) {
      return record.message;
    }

    if (
      typeof record.error === "string"
    ) {
      return record.error;
    }
  }

  return "فشل الطلب مع الخادم";
}

export { apiClient };

