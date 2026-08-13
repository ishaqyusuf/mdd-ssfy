import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

function readSource(path: string) {
	return readFileSync(new URL(path, import.meta.url), "utf8");
}

const layoutSource = readSource(
	"../../app/(sidebar)/settings/sales/layout.tsx",
);
const menuSource = readSource("../secondary-menu.tsx");
const documentsRouteSource = readSource(
	"../../app/(sidebar)/settings/sales/page.tsx",
);
const dealerOrdersRouteSource = readSource(
	"../../app/(sidebar)/settings/sales/dealer-orders/page.tsx",
);
const specialOrdersRouteSource = readSource(
	"../../app/(sidebar)/settings/sales/special-orders/page.tsx",
);
const sidebarSource = readSource("../sidebar-links.ts");

describe("Sales Settings route-backed navigation", () => {
	it("exposes the three approved settings destinations in the shared layout", () => {
		for (const [label, path] of [
			["Documents", "/settings/sales"],
			["Dealer orders", "/settings/sales/dealer-orders"],
			["Special orders", "/settings/sales/special-orders"],
		]) {
			expect(layoutSource.includes(`label: "${label}"`)).toBe(true);
			expect(layoutSource.includes(`path: "${path}"`)).toBe(true);
		}

		expect(layoutSource.includes("max-w-[920px]")).toBe(true);
		expect(layoutSource.includes("<SecondaryMenu")).toBe(true);
	});

	it("uses semantic, keyboard-visible pathname links for active state", () => {
		expect(menuSource.includes("usePathname()")).toBe(true);
		expect(menuSource.includes("pathname === item.path")).toBe(true);
		expect(menuSource.includes('aria-current={isActive ? "page"')).toBe(true);
		expect(menuSource.includes("<nav aria-label={ariaLabel}")).toBe(true);
		expect(menuSource.includes("<ul")).toBe(true);
		expect(menuSource.includes("<li")).toBe(true);
		expect(menuSource.includes("focus-visible:ring-2")).toBe(true);
		expect(menuSource.includes("overflow-x-auto")).toBe(true);
	});

	it("keeps the original URL as Documents and isolates each route component", () => {
		expect(documentsRouteSource.includes("<SalesPrintSettingsPage />")).toBe(
			true,
		);
		expect(documentsRouteSource.includes("SpecialOrderSettingsSection")).toBe(
			false,
		);
		expect(documentsRouteSource.includes("DealerOrderSettingsPage")).toBe(
			false,
		);

		expect(
			dealerOrdersRouteSource.includes("<DealerOrderSettingsPage />"),
		).toBe(true);
		expect(dealerOrdersRouteSource.includes("getSpecialOrderSettings")).toBe(
			false,
		);

		expect(
			specialOrdersRouteSource.includes("<SpecialOrderSettingsSection />"),
		).toBe(true);
		expect(specialOrdersRouteSource.includes("getPrintPreviewOrders")).toBe(
			false,
		);
		expect(specialOrdersRouteSource.includes("getSpecialOrderSettings")).toBe(
			false,
		);
	});

	it("provides metadata, hydration, loading, and error boundaries per route", () => {
		for (const [routeSource, routePath] of [
			[documentsRouteSource, "../../app/(sidebar)/settings/sales"],
			[
				dealerOrdersRouteSource,
				"../../app/(sidebar)/settings/sales/dealer-orders",
			],
			[
				specialOrdersRouteSource,
				"../../app/(sidebar)/settings/sales/special-orders",
			],
		]) {
			expect(routeSource.includes("generateMetadata")).toBe(true);
			expect(routeSource.includes("<HydrateClient>")).toBe(true);
			expect(
				existsSync(new URL(`${routePath}/loading.tsx`, import.meta.url)),
			).toBe(true);
			expect(
				existsSync(new URL(`${routePath}/error.tsx`, import.meta.url)),
			).toBe(true);
		}
	});

	it("keeps Sales Settings super-admin-only and adoption outside the tabs", () => {
		expect(
			sidebarSource.includes(
				'_link("Sales Settings", "Printer", "/settings/sales").access(',
			),
		).toBe(true);
		expect(sidebarSource.includes('_role.is("Super Admin")')).toBe(true);
		expect(layoutSource.includes("sales-form-adoption")).toBe(false);
	});
});
