const { spawnSync } = require("node:child_process");
const { tmpdir } = require("node:os");
const path = require("node:path");

// Bun 1.3 reloads apps/mobile/.env* after `env -u`; run the checker from a
// neutral directory so local dotenv files cannot enter release configuration.
const env = Object.fromEntries(
	Object.entries(process.env).filter(
		([key]) => key !== "EXPO_PUBLIC_EMAIL" && key !== "EXPO_PUBLIC_TOK",
	),
);
env.EXPO_NO_DOTENV = "1";
env.BUN_AUTO_INSTALL = "0";

const result = spawnSync(
	"bun",
	[path.join(__dirname, "ios-release-readiness.ts")],
	{ cwd: tmpdir(), env, stdio: "inherit" },
);

if (result.error) {
	process.stderr.write(`Could not start the iOS release checker: ${result.error.message}\n`);
	process.exit(1);
}
process.exit(result.status ?? 1);
