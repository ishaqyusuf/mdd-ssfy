import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**",
			},
		],
	},
};

const deploymentEnvironment =
	process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";

export default deploymentEnvironment === "production"
	? withSentryConfig(nextConfig, {
			authToken: process.env.SENTRY_AUTH_TOKEN,
			org: process.env.SENTRY_ORG,
			project: process.env.SENTRY_PROJECT,
			silent: !process.env.CI,
			telemetry: false,
			widenClientFileUpload: true,
			sourcemaps: { deleteSourcemapsAfterUpload: true },
			webpack: { treeshake: { removeDebugLogging: true } },
		})
	: nextConfig;
