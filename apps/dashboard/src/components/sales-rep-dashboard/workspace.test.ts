import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const workspaceSource = readFileSync(
	resolve(import.meta.dir, "workspace.tsx"),
	"utf8",
);
const routeSource = readFileSync(
	resolve(import.meta.dir, "../../app/(sidebar)/(sales)/sales-rep/page.tsx"),
	"utf8",
);

describe("sales rep dashboard migration", () => {
	it("uses the dedicated rep dashboard contract", () => {
		expect(routeSource).toContain("trpc.salesRepDashboard.overview");
		expect(routeSource).toContain("trpc.salesRepDashboard.trend");
		expect(routeSource).toContain("trpc.salesRepDashboard.activity");
	});

	it("does not build on the rejected design route or legacy tabs", () => {
		expect(routeSource).not.toContain("sales-rep/design");
		expect(routeSource).not.toContain("SalesRepTabSelector");
		expect(routeSource).not.toContain("TabsContent");
		expect(workspaceSource).not.toContain("sales-rep/design");
	});

	it("keeps core controls and summaries usable at phone widths", () => {
		expect(workspaceSource).toContain("grid grid-cols-2");
		expect(workspaceSource).toContain("w-full");
		expect(workspaceSource).toContain("sm:");
		expect(workspaceSource).toContain("min-w-0");
	});
});
