import { expect, it } from "bun:test";
import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { withIsolatedVercelConfig } from "./isolated-vercel-config";
it("removes invocation-local configuration after success and failure", async () => {
	for (const fail of [false, true]) {
		let saved = "";
		const execution = withIsolatedVercelConfig(async (directory) => {
			saved = directory;
			await writeFile(join(directory, "fixture.json"), "{}");
			if (fail) throw new Error("fixture failure");
			return "complete";
		});
		if (fail) await expect(execution).rejects.toThrow("fixture failure");
		else expect(await execution).toBe("complete");
		await expect(access(saved)).rejects.toThrow();
	}
});
