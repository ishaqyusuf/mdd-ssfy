import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const headerSource = readFileSync(
	new URL("./header.tsx", import.meta.url),
	"utf8",
);

describe("WWW header sidebar hover contract", () => {
	test("does not participate in the desktop sidebar hover surface", () => {
		expect(headerSource).not.toContain("data-site-nav-hover-surface");
		expect(headerSource).not.toContain("handleNavMouseEnter");
		expect(headerSource).not.toContain("handleNavMouseLeave");
	});
});
