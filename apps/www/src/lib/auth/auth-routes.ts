import type { NextRequest } from "next/server";

export const AUTH_LOGIN_ROUTE = "/login/v2";
export const AUTH_LOGIN_ALIASES = ["/login", AUTH_LOGIN_ROUTE] as const;

export function isAuthLoginPath(pathname: string) {
	return AUTH_LOGIN_ALIASES.includes(
		pathname as (typeof AUTH_LOGIN_ALIASES)[number],
	);
}

export function createAuthLoginUrl(req: NextRequest, returnTo?: string | null) {
	const loginUrl = new URL(AUTH_LOGIN_ROUTE, req.url);

	if (returnTo) {
		loginUrl.searchParams.set("return_to", returnTo);
	}

	return loginUrl;
}
