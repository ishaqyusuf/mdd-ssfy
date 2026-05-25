import { NextRequest, NextResponse } from "next/server";

const NEXT_AUTH_COOKIE_PREFIXES = [
	"next-auth.",
	"__Secure-next-auth.",
	"__Host-next-auth.",
];

export function GET(request: NextRequest) {
	const response = NextResponse.redirect(new URL("/login/v2", request.url));

	for (const cookie of request.cookies.getAll()) {
		if (NEXT_AUTH_COOKIE_PREFIXES.some((prefix) => cookie.name.startsWith(prefix))) {
			response.cookies.delete(cookie.name);
		}
	}

	return response;
}
