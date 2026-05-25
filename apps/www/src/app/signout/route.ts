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
    const setCookie = authSignOutResponse?.headers.get("set-cookie");
    if (setCookie) {
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
