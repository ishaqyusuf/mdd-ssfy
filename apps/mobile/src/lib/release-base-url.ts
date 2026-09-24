type ReleaseBaseUrlModule = {
	CANONICAL_IOS_RELEASE_ORIGIN: string;
	isCanonicalIosReleaseOrigin(value: string | undefined): boolean;
	isPublicHttpsOrigin(value: string | undefined): boolean;
	resolveConfiguredReleaseBaseUrl(input: {
		appVariant?: unknown;
		envVariant?: string;
		baseUrl?: string;
		isDev?: boolean;
	}): string | null;
};

const releaseBaseUrl =
	require("../../config/release-base-url.cjs") as ReleaseBaseUrlModule;

export const isPublicHttpsOrigin = releaseBaseUrl.isPublicHttpsOrigin;
export const CANONICAL_IOS_RELEASE_ORIGIN =
	releaseBaseUrl.CANONICAL_IOS_RELEASE_ORIGIN;
export const isCanonicalIosReleaseOrigin =
	releaseBaseUrl.isCanonicalIosReleaseOrigin;
export const resolveConfiguredReleaseBaseUrl =
	releaseBaseUrl.resolveConfiguredReleaseBaseUrl;
