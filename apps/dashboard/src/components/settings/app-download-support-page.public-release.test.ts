import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const source = readFileSync(
	join(dirname(fileURLToPath(import.meta.url)), "app-download-support-page.tsx"),
	"utf8",
);

describe("public iOS mobile-support guidance", () => {
	it("does not promise TestFlight or Apple portal invitations", () => {
		expect(source).not.toContain("TestFlight");
		expect(source).not.toContain("perform invitations manually");
		expect(source).toContain("download GND Millwork from the App Store");
		expect(source).toContain("A company account is still required to sign in");
		expect(source).toContain("Android distribution remains admin-managed");
		expect(source).toContain('status === "INVITED"');
		expect(source).toContain('"Access details sent"');
		expect(source).not.toContain('"Guidance sent"');
	});
});
