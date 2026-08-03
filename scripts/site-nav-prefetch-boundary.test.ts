import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const sidebarLinkComponents = [
	"packages/site-nav/src/components/nav-item.tsx",
	"packages/site-nav/src/components/nav-child-item.tsx",
] as const;

describe("site navigation prefetch boundary", () => {
	it.each(sidebarLinkComponents)(
		"%s keeps automatic viewport prefetch disabled",
		(file) => {
			const source = readFileSync(resolve(root, file), "utf8");

			expect(source).toContain("prefetch={false}");
			expect(source).not.toMatch(/^\s*prefetch\s*$/m);
		},
	);
});
