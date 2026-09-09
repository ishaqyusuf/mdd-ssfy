import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function withIsolatedVercelConfig<T>(
	execute: (directory: string) => Promise<T>,
): Promise<T> {
	const directory = await mkdtemp(join(tmpdir(), "gnd-reliability-vercel-"));
	try {
		return await execute(directory);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}
