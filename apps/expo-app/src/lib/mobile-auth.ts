import { getWebUrl } from "@/lib/base-url";
import type { Profile } from "@/lib/session-store";

type MobileAuthSession = Profile & {
  activeSession?: {
    expires?: string | Date | null;
    id: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  } | null;
  rememberMe?: boolean;
};

type MobileSignInInput = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

function authUrl(path: string) {
  return `${getWebUrl().replace(/\/$/, "")}/api/auth/${path.replace(/^\//, "")}`;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : typeof payload?.error === "string"
          ? payload.error
          : "Authentication failed.";
    throw new Error(message);
  }

  return payload as T;
}

export async function mobileSignIn(input: MobileSignInInput) {
  const response = await fetch(authUrl("www-mobile-sign-in"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await readJsonResponse<
    | MobileAuthSession
    | {
        requiresPasswordMigration?: boolean;
        url?: string;
      }
  >(response);

  if ("requiresPasswordMigration" in payload && payload.requiresPasswordMigration) {
    throw new Error("Password update is required before mobile sign-in.");
  }

  return payload as MobileAuthSession;
}

export async function mobileSession(token: string) {
  const response = await fetch(authUrl("www-mobile-session"), {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  return readJsonResponse<MobileAuthSession>(response);
}

export async function mobileSignOut(token?: string | null) {
  if (!token) return;

  await fetch(authUrl("www-mobile-sign-out"), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
    },
  }).catch(() => null);
}
