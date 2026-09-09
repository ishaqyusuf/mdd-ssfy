import { execFile } from "node:child_process";

/** Explicit environment and argument array; never return raw process diagnostics. */
export function runBoundedProcess(input: {
	executable: string;
	args: readonly string[];
	env: Record<string, string>;
	timeoutMs: number;
	maxBytes: number;
}): Promise<Buffer> {
	if (
		!input.executable.startsWith("/") ||
		!Number.isInteger(input.timeoutMs) ||
		input.timeoutMs < 100 ||
		input.timeoutMs > 30_000 ||
		!Number.isInteger(input.maxBytes) ||
		input.maxBytes < 1 ||
		input.maxBytes > 2_097_152
	)
		throw new Error("Invalid reliability process budget");
	return new Promise((resolve, reject) => {
		execFile(
			input.executable,
			[...input.args],
			{
				env: input.env,
				timeout: input.timeoutMs,
				maxBuffer: input.maxBytes,
				encoding: "buffer",
				killSignal: "SIGKILL",
				shell: false,
			},
			(error, stdout) => {
				if (error) reject(new Error("RELIABILITY_PROCESS_FAILED"));
				else resolve(stdout);
			},
		);
	});
}
