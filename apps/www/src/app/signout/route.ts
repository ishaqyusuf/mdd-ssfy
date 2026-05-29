import { NextRequest, NextResponse } from "next/server";

const NEXT_AUTH_COOKIE_PREFIXES = [
    "next-auth.",
    "__Secure-next-auth.",
    "__Host-next-auth.",
];
const BETTER_AUTH_COOKIE_PREFIXES = [
    "gnd-www-auth.",
    "__Secure-gnd-www-auth.",
    "__Host-gnd-www-auth.",
];

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const authSignOutResponse = await fetch(
        new URL("/api/auth/sign-out", request.url),
        {
            method: "POST",
            headers: request.headers,
            cache: "no-store",
        },
    ).catch(() => null);
    const response = NextResponse.redirect(getLoginUrl(request));
    const setCookieHeaders = getSetCookieHeaders(authSignOutResponse?.headers);
    for (const setCookie of setCookieHeaders) {
        response.headers.append("set-cookie", setCookie);
    }

    for (const cookie of request.cookies.getAll()) {
        if (
            NEXT_AUTH_COOKIE_PREFIXES.some((prefix) =>
                cookie.name.startsWith(prefix),
            ) ||
            BETTER_AUTH_COOKIE_PREFIXES.some((prefix) =>
                cookie.name.startsWith(prefix),
            )
        ) {
            response.cookies.delete(cookie.name);
        }
    }

    return response;
}

function getSetCookieHeaders(headers?: Headers) {
    if (!headers) return [];

    const getSetCookie = (
        headers as Headers & { getSetCookie?: () => string[] }
    ).getSetCookie?.();
    if (getSetCookie?.length) return getSetCookie;

    return splitSetCookieHeader(headers.get("set-cookie"));
}

function splitSetCookieHeader(setCookie: string | null) {
    if (!setCookie) return [];

    const result: string[] = [];
    let start = 0;
    let index = 0;

    while (index < setCookie.length) {
        if (setCookie[index] === ",") {
            let next = index + 1;
            while (setCookie[next] === " ") next++;
            while (
                next < setCookie.length &&
                setCookie[next] !== "=" &&
                setCookie[next] !== ";" &&
                setCookie[next] !== ","
            ) {
                next++;
            }

            if (setCookie[next] === "=") {
                const part = setCookie.slice(start, index).trim();
                if (part) result.push(part);
                start = index + 1;
                while (setCookie[start] === " ") start++;
                index = start;
                continue;
            }
        }

        index++;
    }

    const last = setCookie.slice(start).trim();
    if (last) result.push(last);
    return result;
}

export const POST = GET;

function getLoginUrl(request: NextRequest) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto");

    if (forwardedHost) {
        return new URL(
            "/login/v2",
            `${forwardedProto || request.nextUrl.protocol.replace(":", "")}://${forwardedHost}`,
        );
    }

    return new URL("/login/v2", request.url);
}
