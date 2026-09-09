import {
	type VercelLogSource,
	prepareVercelLogQuery,
	prepareVercelQueryPage,
} from "@gnd/observability/reliability";
import { runBoundedProcess } from "./bounded-process";

export async function readVercelQuery(
	source: VercelLogSource,
	window: { since: Date; until: Date; limit: number },
	now: Date,
	runtime: {
		nodePath: string;
		cliPath: string;
		configDirectory: string;
		token: string;
	},
	execute: typeof runBoundedProcess = runBoundedProcess,
) {
	if (
		!runtime.token ||
		![runtime.nodePath, runtime.cliPath, runtime.configDirectory].every(
			(path) => path.startsWith("/") && !path.includes("\0"),
		)
	)
		throw new Error("Invalid Vercel query runtime");
	if (!Number.isFinite(now.getTime()) || window.until > now)
		throw new Error("Invalid Vercel query window");
	const args = prepareVercelLogQuery({
		...window,
		account: source.account,
		project: source.project,
	});
	const output = await execute({
		executable: runtime.nodePath,
		args: [
			runtime.cliPath,
			...args,
			"--global-config",
			runtime.configDirectory,
		],
		env: { VERCEL_TOKEN: runtime.token, CI: "1", NO_COLOR: "1" },
		timeoutMs: 5000,
		maxBytes: 2_097_152,
	});
	return prepareVercelQueryPage(output, source, window, now);
}
