const STANDARD_WEB_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;
const REMEMBER_ME_WEB_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const WEB_AUTH_SESSION_MAX_AGE_SECONDS =
	REMEMBER_ME_WEB_SESSION_MAX_AGE_SECONDS;

const STANDARD_WEB_SESSION_REFRESH_WINDOW_MS = 1000 * 60 * 60;
const REMEMBER_ME_WEB_SESSION_REFRESH_WINDOW_MS = 1000 * 60 * 60 * 24;

export function normalizeRememberMe(value: unknown) {
	return value === true || value === "true" || value === "on";
}

function getWebSessionMaxAgeSeconds(rememberMe?: boolean) {
	return rememberMe
		? REMEMBER_ME_WEB_SESSION_MAX_AGE_SECONDS
		: STANDARD_WEB_SESSION_MAX_AGE_SECONDS;
}

export function buildWebSessionExpiry({
	from = Date.now(),
	rememberMe = false,
}: {
	from?: number;
	rememberMe?: boolean;
}) {
	return new Date(from + getWebSessionMaxAgeSeconds(rememberMe) * 1000);
}

export function getWebSessionRefreshWindowMs(rememberMe?: boolean) {
	return rememberMe
		? REMEMBER_ME_WEB_SESSION_REFRESH_WINDOW_MS
		: STANDARD_WEB_SESSION_REFRESH_WINDOW_MS;
}
