import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Bug Reports Sales Orders table migration parity", () => {
	it("keeps the permission-gated header entry point in the right-side header controls", () => {
		const headerSource = readSource("components/header.tsx");
		const buttonSource = readSource(
			"components/bug-reports/bug-report-button.tsx",
		);

		expect(
			headerSource.includes(
				'import { BugReportButton } from "./bug-reports/bug-report-button";',
			),
		).toBe(true);
		expect(headerSource.includes("<BugReportButton />")).toBe(true);
		expect(
			headerSource.indexOf("<SalesRepRequestBadge />") <
				headerSource.indexOf("<BugReportButton />"),
		).toBe(true);
		expect(
			headerSource.indexOf("<BugReportButton />") <
				headerSource.indexOf("<NotificationCenter />"),
		).toBe(true);
		expect(
			headerSource.indexOf("<BugReportButton />") <
				headerSource.indexOf("<UserNav links={linkModules} />"),
		).toBe(true);
		expect(buttonSource.includes("auth.can?.submitBugReport")).toBe(true);
		expect(buttonSource.includes("if (!canReport) return null")).toBe(true);
		expect(buttonSource.includes('aria-label="Report a bug"')).toBe(true);
		expect(buttonSource.includes('title="Report a bug"')).toBe(true);
	});

	it("keeps screenshot and video capture controls with preview and current-page context", () => {
		const buttonSource = readSource(
			"components/bug-reports/bug-report-button.tsx",
		);
		const captureSource = readSource(
			"components/bug-reports/current-tab-capture.ts",
		);

		expect(buttonSource.includes("async function captureScreenshot")).toBe(
			true,
		);
		expect(buttonSource.includes("async function startRecording")).toBe(true);
		expect(
			buttonSource.includes("navigator.mediaDevices.getDisplayMedia"),
		).toBe(false);
		expect(buttonSource.includes("getDisplayMedia")).toBe(false);
		expect(buttonSource.includes("displayStream")).toBe(false);
		expect(buttonSource.includes("Screen recording")).toBe(false);
		expect(buttonSource.includes("window picker")).toBe(false);
		expect(buttonSource.includes("captureCurrentTabCanvas")).toBe(true);
		expect(buttonSource.includes('data-bug-report-ignore="true"')).toBe(true);
		expect(captureSource.includes('from "html-to-image"')).toBe(true);
		expect(captureSource.includes("isBugReportCaptureExcluded")).toBe(true);
		expect(captureSource.includes('document.createElement("canvas")')).toBe(
			true,
		);
		expect(buttonSource.includes("recordingCanvas.captureStream")).toBe(true);
		expect(buttonSource.includes("new MediaRecorder")).toBe(true);
		expect(buttonSource.includes("Screenshot")).toBe(true);
		expect(buttonSource.includes("Record Tab")).toBe(true);
		expect(buttonSource.includes("Record Video")).toBe(false);
		expect(buttonSource.includes('alt="Bug report screenshot preview"')).toBe(
			true,
		);
		expect(buttonSource.includes("controls")).toBe(true);
		expect(buttonSource.includes("currentUrl: window.location.href")).toBe(
			true,
		);
		expect(buttonSource.includes("userAgent: navigator.userAgent")).toBe(true);
	});

	it("keeps the video recorder footer centered and exposes mic/start/finish/cancel/reset actions", () => {
		const buttonSource = readSource(
			"components/bug-reports/bug-report-button.tsx",
		);

		expect(buttonSource.includes('id="bug-report-mic"')).toBe(true);
		expect(
			buttonSource.includes("Include your voice in the current-tab recording."),
		).toBe(true);
		expect(buttonSource.includes("checked={micEnabled}")).toBe(true);
		expect(buttonSource.includes("onCheckedChange={setMicEnabled}")).toBe(true);
		expect(buttonSource.includes("sticky bottom-0")).toBe(true);
		expect(buttonSource.includes("justify-center")).toBe(true);
		expect(buttonSource.includes("sm:justify-center")).toBe(true);
		expect(buttonSource.includes("recordingCanceledRef")).toBe(true);
		expect(buttonSource.includes("function cancelRecording")).toBe(true);
		expect(buttonSource.includes("Reset")).toBe(true);
		expect(buttonSource.includes("Cancel Recording")).toBe(true);
		expect(buttonSource.includes("Finish Recording")).toBe(true);
		expect(buttonSource.includes("Start Recording")).toBe(true);
		expect(buttonSource.includes("Record Again")).toBe(true);
	});

	it("keeps the shared Chat composer with voice-note recording and transcription-ready payload", () => {
		const buttonSource = readSource(
			"components/bug-reports/bug-report-button.tsx",
		);

		expect(buttonSource.includes('from "@/components/chat"')).toBe(true);
		expect(buttonSource.includes("<Chat")).toBe(true);
		expect(buttonSource.includes("messageRequired={false}")).toBe(true);
		expect(buttonSource.includes("onSubmitData={submitChatReport}")).toBe(true);
		expect(buttonSource.includes('source: "bug_report"')).toBe(true);
		expect(buttonSource.includes("hasVoiceNote: Boolean(voiceBlob)")).toBe(
			true,
		);
		expect(buttonSource.includes("async function startVoiceNote")).toBe(true);
		expect(buttonSource.includes("function stopVoiceNote")).toBe(true);
		expect(buttonSource.includes("Record voice")).toBe(true);
		expect(buttonSource.includes("Stop voice")).toBe(true);
		expect(buttonSource.includes("Voice note attached")).toBe(true);
		expect(buttonSource.includes('transcriptionStatus: "PENDING"')).toBe(true);
		expect(buttonSource.includes("<Textarea")).toBe(false);
	});

	it("keeps the Super Admin settings surface for employee bug-report access", () => {
		const settingsPageSource = readSource(
			"app/(sidebar)/settings/bug-reports/page.tsx",
		);
		const settingsComponentSource = readSource(
			"components/settings/bug-report-access-settings-page.tsx",
		);
		const accessColumnsSource = readSource(
			"components/tables-2/bug-report-access-employees/columns.tsx",
		);
		const accessTableSource = readSource(
			"components/tables-2/bug-report-access-employees/data-table.tsx",
		);
		const sidebarSource = readSource("components/sidebar-content.tsx");
		const sidebarLinksSource = readSource("components/sidebar-links.ts");

		expect(settingsPageSource.includes("BugReportAccessSettingsPage")).toBe(
			true,
		);
		expect(
			settingsPageSource.includes('title: "Bug Report Access | GND"'),
		).toBe(true);
		expect(settingsPageSource.includes("getInitialTableSettings")).toBe(true);
		expect(settingsPageSource.includes('"bug-report-access-employees"')).toBe(
			true,
		);
		expect(
			settingsPageSource.includes("initialSettings={initialSettings}"),
		).toBe(true);
		expect(settingsPageSource.includes("batchPrefetch")).toBe(false);
		expect(settingsPageSource.includes("trpc.hrm.getEmployees")).toBe(false);
		expect(settingsComponentSource.includes("roleTitle?.toLowerCase()")).toBe(
			true,
		);
		expect(
			settingsComponentSource.includes("Super Admin access required"),
		).toBe(true);
		expect(
			settingsComponentSource.includes("setEmployeeBugReportingAccess"),
		).toBe(true);
		expect(
			settingsComponentSource.includes("trpc.hrm.getEmployees.queryOptions"),
		).toBe(true);
		expect(settingsComponentSource.includes('accessStatus: "active"')).toBe(
			true,
		);
		expect(
			settingsComponentSource.includes("enabled: auth.enabled && isSuperAdmin"),
		).toBe(true);
		expect(settingsComponentSource.includes("bugReportingEnabled")).toBe(true);
		expect(
			settingsComponentSource.includes("BugReportAccessEmployeesTable"),
		).toBe(true);
		expect(
			settingsComponentSource.includes(
				"BugReportAccessEmployeesColumnVisibility",
			),
		).toBe(true);
		expect(settingsComponentSource.includes("onToggleAccess")).toBe(true);
		expect(settingsComponentSource.includes("filteredEmployees.map")).toBe(
			false,
		);
		expect(settingsComponentSource.includes("<Switch")).toBe(false);
		expect(accessColumnsSource.includes("<Switch")).toBe(true);
		expect(accessColumnsSource.includes("bugReportingEnabled")).toBe(true);
		expect(accessColumnsSource.includes("By role")).toBe(true);
		expect(accessTableSource.includes("onToggleAccess")).toBe(true);
		expect(accessTableSource.includes("VirtualRow")).toBe(true);
		expect(accessTableSource.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(accessTableSource.includes("useTableDnd(table)")).toBe(true);
		expect(accessTableSource.includes("<DndContext")).toBe(true);
		expect(
			accessTableSource.includes('id="bug-report-access-employees-table-dnd"'),
		).toBe(true);
		expect(accessTableSource.includes("enableColumnResizing: true")).toBe(true);
		expect(
			accessTableSource.includes("onColumnSizingChange: setColumnSizing"),
		).toBe(true);
		expect(
			accessTableSource.includes("onColumnOrderChange: setColumnOrder"),
		).toBe(true);
		expect(
			accessTableSource.includes("rowHeight={tableConfig.rowHeight}"),
		).toBe(true);
		expect(
			accessTableSource.includes("estimateSize: () => tableConfig.rowHeight"),
		).toBe(true);
		expect(accessTableSource.includes("startFromColumn: 1")).toBe(true);
		expect(settingsComponentSource.includes("Enabled employees")).toBe(true);
		expect(settingsComponentSource.includes("Open Bug Reports")).toBe(true);
		expect(sidebarSource.includes('href="/settings/bug-reports"')).toBe(true);
		expect(sidebarSource.includes("Bug report access")).toBe(true);
		expect(sidebarLinksSource.includes('"Bug Report Access"')).toBe(true);
		expect(sidebarLinksSource.includes('"/settings/bug-reports"')).toBe(true);
		expect(sidebarLinksSource.includes('_role.is("Super Admin")')).toBe(true);
	});

	it("keeps the route on the restarted table shell", () => {
		const pageSource = readSource("app/(sidebar)/support/bug-reports/page.tsx");
		const workspaceSource = readSource(
			"components/bug-reports/bug-report-workspace.tsx",
		);
		const buttonSource = readSource(
			"components/bug-reports/bug-report-button.tsx",
		);

		expect(pageSource.includes("ScrollableContent")).toBe(true);
		expect(pageSource.includes("getInitialTableSettings")).toBe(true);
		expect(pageSource.includes('"bug-reports"')).toBe(true);
		expect(pageSource.includes("initialSettings={initialSettings}")).toBe(true);
		expect(pageSource.includes("getQueryClient")).toBe(false);
		expect(pageSource.includes("fetchQuery")).toBe(false);
		expect(workspaceSource.includes("BugReportsDataTable")).toBe(true);
		expect(workspaceSource.includes("BugReportsColumnVisibility")).toBe(true);
		expect(workspaceSource.includes("reports.map")).toBe(false);
		expect(workspaceSource.includes("ReportListButton")).toBe(false);
		expect(workspaceSource.includes("rounded-md border p-3 text-left")).toBe(
			false,
		);
		expect(buttonSource.includes('from "@/components/chat"')).toBe(true);
		expect(buttonSource.includes("<Chat")).toBe(true);
		expect(buttonSource.includes('source: "bug_report"')).toBe(true);
		expect(buttonSource.includes("<Textarea")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, persisted settings, and row selection", () => {
		const source = readSource("components/tables-2/bug-reports/data-table.tsx");

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="bug-reports-table-dnd"')).toBe(true);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("startFromColumn: 1")).toBe(true);
		expect(source.includes("onCellClick")).toBe(true);
		expect(source.includes("onSelectReport")).toBe(true);
	});

	it("keeps compact tailored columns, sticky actions, and table registration", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/bug-reports/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/bug-reports/table-header.tsx",
		);

		expect(settingsSource.includes('| "bug-reports"')).toBe(true);
		expect(configSource.includes('"bug-reports": {')).toBe(true);
		expect(configSource.includes('tableId: "bug-reports"')).toBe(true);
		expect(configSource.includes("rowHeight: 64")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(220, 420, 280)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(118, 170, 136)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(110, 170, 126)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(86, 126, 96)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(126, 190, 146)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(56, 80, 64)")).toBe(true);
		expect(columnsSource.includes("md:sticky md:left-0")).toBe(true);
		expect(columnsSource.includes("md:sticky md:right-0")).toBe(true);
		expect(headerSource.includes("HorizontalPagination")).toBe(true);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
	});

	it("keeps Bug Report Access employees registered with compact tailored widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/bug-report-access-employees/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/bug-report-access-employees/table-header.tsx",
		);

		expect(settingsSource.includes('| "bug-report-access-employees"')).toBe(
			true,
		);
		expect(configSource.includes('"bug-report-access-employees": {')).toBe(
			true,
		);
		expect(
			configSource.includes('tableId: "bug-report-access-employees"'),
		).toBe(true);
		expect(configSource.includes("rowHeight: 56")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(220, 420, 280)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(132, 220, 160)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(170, 320, 210)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(112, 170, 126)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(96, 130, 104)")).toBe(true);
		expect(columnsSource.includes("md:sticky md:left-0")).toBe(true);
		expect(columnsSource.includes("md:sticky md:right-0")).toBe(true);
		expect(headerSource.includes("HorizontalPagination")).toBe(true);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
	});
});
