import { NextRequest, NextResponse } from "next/server";

const NEXT_AUTH_COOKIE_PREFIXES = [
    "next-auth.",
    "__Secure-next-auth.",
    "__Host-next-auth.",
];

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
    const response = NextResponse.redirect(getLoginUrl(request));

    for (const cookie of request.cookies.getAll()) {
        if (
            NEXT_AUTH_COOKIE_PREFIXES.some((prefix) =>
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
