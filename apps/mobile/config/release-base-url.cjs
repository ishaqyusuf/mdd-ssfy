const RELEASE_VARIANTS = new Set(["preview", "production"]);
const RESERVED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "::1"]);

/**
 * @param {string | undefined} value
 */
function isPublicHttpsOrigin(value) {
	if (!value) return false;
	try {
		const parsed = new URL(value);
		const hostname = parsed.hostname.toLowerCase();
		const octets = hostname.split(".").map(Number);
		const privateIpv4 =
			octets.length === 4 &&
			octets.every(
				(octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255,
			) &&
			(octets[0] === 0 ||
				octets[0] === 10 ||
				(octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) ||
				octets[0] === 127 ||
				(octets[0] === 169 && octets[1] === 254) ||
				(octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
				(octets[0] === 192 && octets[1] === 168));
		return (
			parsed.protocol === "https:" &&
			!parsed.username &&
			!parsed.password &&
			parsed.pathname === "/" &&
			!parsed.search &&
			!parsed.hash &&
			hostname.includes(".") &&
			!RESERVED_HOSTNAMES.has(hostname) &&
			!hostname.endsWith(".localhost") &&
			!hostname.endsWith(".local") &&
			!hostname.endsWith(".internal") &&
			!hostname.endsWith(".lan") &&
			!hostname.endsWith(".home") &&
			!hostname.endsWith(".test") &&
			!hostname.endsWith(".invalid") &&
			!privateIpv4
		);
	} catch {
		return false;
	}
}

/**
 * @param {{
 *   appVariant?: unknown;
 *   envVariant?: string;
 *   baseUrl?: string;
 *   isDev?: boolean;
 * }} input
 */
function resolveConfiguredReleaseBaseUrl(input) {
	const variant =
		typeof input.appVariant === "string" && input.appVariant.trim()
			? input.appVariant.toLowerCase()
			: (input.envVariant?.toLowerCase() ?? "");
	if (
		!RELEASE_VARIANTS.has(variant) ||
		(input.isDev && variant === "production")
	) {
		return null;
	}
	const baseUrl = input.baseUrl?.trim();
	if (!baseUrl) {
		throw new Error(
			"Preview and production mobile builds require EXPO_PUBLIC_BASE_URL.",
		);
	}
	if (variant === "production" && !isPublicHttpsOrigin(baseUrl)) {
		throw new Error(
			"Production mobile builds require a public HTTPS EXPO_PUBLIC_BASE_URL origin.",
		);
	}
	return baseUrl.replace(/\/$/, "");
}

module.exports = {
	isPublicHttpsOrigin,
	resolveConfiguredReleaseBaseUrl,
};
