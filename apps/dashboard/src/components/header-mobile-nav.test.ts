import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const headerSource = readFileSync(
	new URL("./header.tsx", import.meta.url),
	"utf8",
);
const userNavSource = readFileSync(
	new URL("./user-nav.tsx", import.meta.url),
	"utf8",
);
const utilitySources = [
	"./search/open-search-button.tsx",
	"./sales-rep-request-badge.tsx",
	"./bug-reports/bug-report-button.tsx",
	"./notification-center/notification-center.tsx",
]
	.map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
	.join("\n");
const searchModalSource = readFileSync(
	new URL("./search/search-modal.tsx", import.meta.url),
	"utf8",
);

describe("Dashboard mobile header navigation", () => {
	test("uses the avatar as the single mobile navigation trigger", () => {
		expect(headerSource).not.toContain("<SiteNav.MobileSidebar />");
		expect(headerSource).not.toContain("<OpenSearchButton />");
		expect(headerSource).not.toContain("<NotificationCenter />");
		expect(headerSource).toContain("<UserNav links={linkModules} />");
	});

	test("opens mobile account navigation in the shared bottom drawer", () => {
		expect(userNavSource).toMatch(/<Drawer[\s\S]{0,120}open=\{isOpen\}/);
		expect(userNavSource).toContain("<SiteNav.ModuleSelector");
		expect(userNavSource).toContain("<SiteNav.NavsList");
		expect(userNavSource).toContain("onSelect={() => setOpen(false)}");
	});

	test("keeps header utilities available through labeled mobile actions", () => {
		for (const component of [
			"OpenSearchButton",
			"SalesRepRequestBadge",
			"BugReportTrigger",
			"TestEmailModeAction",
			"NotificationCenter",
		]) {
			expect(userNavSource).toMatch(
				new RegExp(`<${component}[\\s\\S]{0,180}presentation="menu-item"`),
			);
		}

		for (const label of [
			"Search",
			"Sales requests",
			"Report a bug",
			"Test email mode",
			"Notifications",
			"Log out",
		]) {
			expect(`${userNavSource}\n${utilitySources}`).toContain(label);
		}
	});

	test("keeps mobile overlay handoffs owned outside or inside the drawer", () => {
		expect(userNavSource).toContain("setBugReportOpen(true)");
		expect(userNavSource).toContain("<BugReportButton");
		expect(userNavSource).toContain("hideTrigger");
		expect(userNavSource).toContain("onNavigate={() => setOpen(false)}");
		expect(utilitySources).toContain("NotificationDrawerSurface");
		expect(utilitySources).toContain("Back to account and navigation");
		expect(userNavSource).toContain("inert={coveredByNotifications}");
		expect(utilitySources).toContain('isMenuItem ? "min-h-0 flex-1"');
		expect(utilitySources).toContain("if (isMenuItem && !didClose)");
		expect(utilitySources).toContain("notificationBackRef.current?.focus()");
		expect(utilitySources).toContain("notificationTriggerRef.current?.focus()");
		expect(utilitySources).toContain("env(safe-area-inset-bottom)");
	});

	test("gives the mobile search handoff an accessible dialog title", () => {
		expect(searchModalSource).toContain("<DialogTitle");
		expect(searchModalSource).toContain("Search the workspace");
	});
});
