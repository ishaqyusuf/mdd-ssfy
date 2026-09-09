import { createRequire } from "node:module";
import { resolve } from "node:path";

/** Resolve the package installed by Trigger's additionalPackages build extension. */
export function resolveVercelRuntime() {
	const runtimeRequire = createRequire(resolve(process.cwd(), "package.json"));
	return {
		nodePath: process.execPath,
		cliPath: runtimeRequire.resolve("vercel/dist/vc.js"),
	};
}
