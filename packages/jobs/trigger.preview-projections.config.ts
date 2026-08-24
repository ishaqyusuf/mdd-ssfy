import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { defineConfig } from "@trigger.dev/sdk/v3";

const previewProjectId =
	process.env.TRIGGER_PREVIEW_PROJECTIONS_PROJECT_ID?.trim() ||
	"proj_vwljjpifrjlpehfhrkmz";

export default defineConfig({
	project: previewProjectId,
	runtime: "node",
	logLevel: "log",
	maxDuration: 900,
	retries: {
		enabledInDev: false,
		default: {
			maxAttempts: 3,
			minTimeoutInMs: 1_000,
			maxTimeoutInMs: 10_000,
			factor: 2,
			randomize: true,
		},
	},
	build: {
		extensions: [
			prismaExtension({
				mode: "legacy",
				version: "^6.5.0",
				directUrlEnvVarName: "DATABASE_URL",
				schema: "./src/schema.prisma",
			}),
		],
		external: ["canvas", "next"],
	},
	dirs: ["./src/preview-tasks"],
});
