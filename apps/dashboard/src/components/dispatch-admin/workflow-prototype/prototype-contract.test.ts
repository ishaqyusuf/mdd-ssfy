import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prototypeDirectory = import.meta.dir;
const sourceFiles = [
	"workflow-prototype.tsx",
	"prototype-admin-panel.tsx",
	"prototype-driver-panel.tsx",
];

describe("fulfillment prototype boundary", () => {
	test("does not import production data or mutation clients", () => {
		const source = sourceFiles
			.map((file) => readFileSync(join(prototypeDirectory, file), "utf8"))
			.join("\n");

		expect(source).not.toContain("useTRPC");
		expect(source).not.toContain("useMutation");
		expect(source).not.toContain("trpc.");
		expect(source).toContain("No production writes");
	});

	test("uses approved lifecycle and exception terminology", () => {
		const source = sourceFiles
			.map((file) => readFileSync(join(prototypeDirectory, file), "utf8"))
			.join("\n");

		expect(source).toContain("Order status");
		expect(source).toContain("Dispatch status");
		expect(source).toContain("Assigned to");
		expect(source).toContain("Back order");
		expect(source).toContain("Admin has been notified");
	});
});
