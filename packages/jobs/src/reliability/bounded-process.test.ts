import { expect, it } from "bun:test";
import { runBoundedProcess } from "./bounded-process";
it("runs argument arrays without shell expansion", async () => {
	const output = await runBoundedProcess({
		executable: process.execPath,
		args: [
			"-e",
			"process.stdout.write(process.argv[1])",
			"$(echo should-not-run)",
		],
		env: {},
		timeoutMs: 1000,
		maxBytes: 1024,
	});
	expect(output.toString()).toBe("$(echo should-not-run)");
});
it("rejects failed, oversized, and timed-out processes without exposing output", async () => {
	for (const script of [
		"process.stderr.write('private token');process.exit(1)",
		"process.stdout.write('x'.repeat(4096))",
		"setInterval(()=>{},1000)",
	]) {
		await expect(
			runBoundedProcess({
				executable: process.execPath,
				args: ["-e", script],
				env: {},
				timeoutMs: 100,
				maxBytes: 1024,
			}),
		).rejects.toThrow("RELIABILITY_PROCESS_FAILED");
	}
});
