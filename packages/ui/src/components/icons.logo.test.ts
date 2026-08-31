import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
	join(process.cwd(), "packages/ui/src/components/icons.tsx"),
	"utf8",
);

describe("shared mini-logo variants", () => {
	test("preserve aspect ratio when navigation constrains their width", () => {
		const miniLogos = source.match(/<Image[^>]*src="\/logo_mini\.png"[^>]*>/g);

		assert.equal(miniLogos?.length, 2);
		for (const logo of miniLogos ?? []) {
			assert.match(logo, /className="h-auto max-w-full"/);
			assert.match(logo, /width=\{48\}/);
			assert.match(logo, /height=\{48\}/);
		}
	});
});
