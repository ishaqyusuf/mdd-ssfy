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

describe("Dashboard mobile header navigation", () => {
	test("keeps the mobile sidebar separate from the account trigger", () => {
		expect(headerSource).toContain("<SiteNav.MobileSidebar />");
		expect(headerSource).toContain("<HeaderActions />");
		expect(headerSource).toContain("<UserNav links={linkModules} />");
	});

	test("keeps Search and the existing utility actions in the header", () => {
		expect(headerSource).toContain('className="hidden sm:contents"');
		expect(headerSource).toContain('className="contents sm:hidden"');
		expect(headerSource.match(/<OpenSearchButton \/>/g)).toHaveLength(2);

		for (const component of [
			"SalesRepRequestBadge",
			"BugReportButton",
			"TestEmailModeButton",
			"NotificationCenter",
		]) {
			expect(userNavSource).toMatch(
				new RegExp(`function HeaderActions[\\s\\S]{0,240}<${component}`),
			);
		}
	});

	test("opens only the account dropdown content in the mobile bottom drawer", () => {
		expect(userNavSource).toMatch(/<Drawer[\s\S]{0,120}open=\{isOpen\}/);
		expect(userNavSource).toContain("<DrawerTitle>Account</DrawerTitle>");
		expect(userNavSource).toContain("<AccountIdentity />");
		expect(userNavSource).toContain("getAccountLinkGroups(links)");
		expect(userNavSource).toContain('href="/signout"');
		expect(userNavSource).not.toContain("SiteNav.ModuleSelector");
		expect(userNavSource).not.toContain("SiteNav.NavsList");
		expect(userNavSource).not.toContain('presentation="menu-item"');
		expect(userNavSource).not.toContain('href="/settings/profile"');
		expect(userNavSource).not.toContain(
			'href="/settings/notification-channels/v2"',
		);
	});

	test("shares the desktop dropdown link selection with the mobile drawer", () => {
		expect(userNavSource.match(/getAccountLinkGroups\(links\)/g)).toHaveLength(
			2,
		);
		expect(userNavSource.match(/href="\/signout"/g)).toHaveLength(2);
		expect(userNavSource).toContain('aria-label="Open account menu"');
		expect(userNavSource).toContain('aria-label="Close account menu"');
		expect(userNavSource).toContain("env(safe-area-inset-bottom)");
	});
});
