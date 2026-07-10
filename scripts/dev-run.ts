#!/usr/bin/env bun

async function run(command: string[], env = process.env) {
	const child = Bun.spawn(command, {
		env,
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	});
	const exitCode = await child.exited;

	if (exitCode !== 0) {
		process.exit(exitCode);
	}
}

await run(["bun", "run", "dev:prepare"]);
await run(["turbo", "dev", "--parallel", ...Bun.argv.slice(2)], {
	...process.env,
	GND_DEV_SERVICES_STARTED: "1",
});
