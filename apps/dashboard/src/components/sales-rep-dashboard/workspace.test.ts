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
const performanceCardSource = readFileSync(
	resolve(import.meta.dir, "performance-card.tsx"),
	"utf8",
);
const salesTrendCardSource = readFileSync(
	resolve(import.meta.dir, "../sales-dashboard/trend-card.tsx"),
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

	it("uses valid theme colors for SVG bars and hover cursors", () => {
		for (const source of [performanceCardSource, salesTrendCardSource]) {
			expect(source).toContain('fill: "var(--muted)"');
			expect(source).toContain("fillOpacity:");
			expect(source).toContain('fill="var(--primary)"');
			expect(source).not.toContain("hsl(var(--muted)");
			expect(source).not.toContain("hsl(var(--primary)");
		}
	});

	it("renders remaining count link and does not hardcode slice(0, 2) on overdueReceivables", () => {
		expect(workspaceSource).not.toContain("data.attention.overdueReceivables.slice(0, 2)");
		expect(workspaceSource).toContain("renderedCount={data.attention.overdueReceivables.length}");
		expect(workspaceSource).toContain("remainingCount > 0");
	});
});
