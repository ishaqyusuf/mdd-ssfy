import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const sidebarLayoutSource = readFileSync(
	new URL("../../app/(sidebar)/layout.tsx", import.meta.url),
	"utf8",
);

describe("inbound needs attention development boundary", () => {
	test("mounts the global provider only behind the shared development flag", () => {
		expect(sidebarLayoutSource).toContain(
			'import { Env } from "@/components/env";',
		);
		expect(sidebarLayoutSource).toMatch(
			/<Env isDev>\s*<InboundNeedsAttentionProviderLazy \/>\s*<\/Env>/,
		);
	});
});
