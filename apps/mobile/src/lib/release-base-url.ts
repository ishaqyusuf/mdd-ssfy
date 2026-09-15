type ReleaseBaseUrlModule = {
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
export const resolveConfiguredReleaseBaseUrl =
	releaseBaseUrl.resolveConfiguredReleaseBaseUrl;
