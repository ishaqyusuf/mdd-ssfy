"use client";

import {
    type ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import type { AppSession } from "./session";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";
type SignInOptions = Record<string, unknown> & {
    callbackUrl?: string;
    callbackURL?: string;
    redirect?: boolean;
};
type SignInResult = {
    error?: string | null;
    ok: boolean;
    status: number;
    url?: string | null;
};

type AuthContextValue = {
    data: AppSession | null;
    status: SessionStatus;
    update: () => Promise<AppSession | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type SessionProviderProps = {
    children?: ReactNode;
    refetchOnWindowFocus?: boolean;
    refetchWhenOffline?: boolean;
};

export function SessionProvider({ children }: SessionProviderProps) {
    const [data, setData] = useState<AppSession | null>(null);
    const [status, setStatus] = useState<SessionStatus>("loading");

    const update = useCallback(async () => {
        setStatus((current) => (current === "loading" ? current : "loading"));
        const nextSession = await fetchSession();
        setData(nextSession);
        setStatus(nextSession ? "authenticated" : "unauthenticated");
        return nextSession;
    }, []);

    useEffect(() => {
        let active = true;

        fetchSession().then((nextSession) => {
            if (!active) return;
            setData(nextSession);
            setStatus(nextSession ? "authenticated" : "unauthenticated");
        });

        return () => {
            active = false;
        };
    }, []);

    const value = useMemo(
        () => ({
            data,
            status,
            update,
        }),
        [data, status, update],
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export function useSession(_options?: unknown) {
    const context = useContext(AuthContext);
    if (context) return context;

    return {
        data: null,
        status: "unauthenticated" as SessionStatus,
        update: async () => null,
    };
}

export async function signIn(provider: string, options: SignInOptions = {}) {
    if (provider !== "credentials") {
        throw new Error(`Unsupported sign-in provider: ${provider}`);
    }

    const callbackURL =
        typeof options.callbackURL === "string"
            ? options.callbackURL
            : typeof options.callbackUrl === "string"
              ? options.callbackUrl
              : "/";
    const redirect = options.redirect !== false;
    const response = await fetch("/api/auth/www-legacy-sign-in", {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({
            email: options.email,
            password: options.password,
            rememberMe: options.rememberMe,
            token: options.token,
            callbackURL,
        }),
    });
    const payload = await response.json().catch(() => null);
    const url =
        typeof payload?.url === "string" && payload.url
            ? payload.url
            : callbackURL;

    if (response.ok) {
        if (
            payload?.requiresPasswordMigration &&
            typeof payload.url === "string"
        ) {
            if (redirect) {
                window.location.assign(payload.url);
            }

            return {
                error: null,
                ok: true,
                status: response.status,
                url: payload.url,
            } satisfies SignInResult;
        }

        if (redirect) {
            window.location.assign(url);
        }

        return {
            error: null,
            ok: true,
            status: response.status,
            url,
        } satisfies SignInResult;
    }

    if (redirect) {
        window.location.assign("/login/v2?error=login+failed");
    }

    return {
        error: payload?.message ?? "login failed",
        ok: false,
        status: response.status,
        url: null,
    } satisfies SignInResult;
}

export async function signOut(options: { callbackUrl?: string } = {}) {
    const response = await fetch("/api/auth/sign-out", {
        method: "POST",
    });
    const url = options.callbackUrl ?? "/login/v2";

    if (response.ok) {
        window.location.assign(url);
    }

    return response;
}

async function fetchSession() {
    const response = await fetch("/api/auth-session", {
        method: "GET",
        cache: "no-store",
    });

    if (!response.ok) return null;

    const session = await response.json();
    return session?.user?.id ? (session as AppSession) : null;
}
