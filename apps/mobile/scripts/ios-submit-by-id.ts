import path from "node:path";

const APP_ROOT = path.join(import.meta.dir, "..");
const BUILD_ID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const RETIRED_PUBLIC_CANDIDATES = new Set([
	"3f3a6acf-ac06-42b8-ab72-1837480f49cc",
	"f3985128-844d-432c-bbc3-e0e4c93e37ac",
]);

export function parseReviewedBuildId(args: string[]): string {
	const idOptions = args.filter((arg) => arg === "--id" || arg.startsWith("--id="));
	if (idOptions.length !== 1 || args.length !== (args[0] === "--id" ? 2 : 1)) {
		throw new Error("Public iOS upload requires only --id <reviewed-EAS-build-id>.");
	}
	const id = args[0] === "--id" ? args[1] : args[0].slice("--id=".length);
	if (!BUILD_ID_PATTERN.test(id ?? "")) {
		throw new Error("Public iOS upload requires a valid EAS build UUID.");
	}
	if (RETIRED_PUBLIC_CANDIDATES.has(id.toLowerCase())) {
		throw new Error("This older iOS build is retired as a public-release candidate; create and review a new build.");
	}
	return id;
}

if (import.meta.main) {
	let buildId: string;
	try {
		buildId = parseReviewedBuildId(process.argv.slice(2));
	} catch (error) {
		console.error(error instanceof Error ? error.message : "Invalid iOS build ID.");
		process.exit(1);
	}

	const child = Bun.spawn([
		"bun",
		"run",
		"with-env:prod",
		"env",
		"-u",
		"EXPO_PUBLIC_EMAIL",
		"-u",
		"EXPO_PUBLIC_TOK",
		"eas",
		"submit",
		"-p",
		"ios",
		"--profile",
		"production",
		"--id",
		buildId,
	], {
		cwd: APP_ROOT,
		env: {
			...process.env,
			BUN_AUTO_INSTALL: "0",
			EXPO_NO_DOTENV: "1",
		},
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	});
	process.exit(await child.exited);
}
