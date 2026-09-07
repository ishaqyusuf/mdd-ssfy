import { describe, expect, test } from "bun:test";

const dialogSource = await Bun.file(
	new URL("./sales-production-completion-dialogs.tsx", import.meta.url),
).text();
const menuSource = await Bun.file(
	new URL("./sales-menu.tsx", import.meta.url),
).text();

describe("Status-only Fulfillment completion UI contract", () => {
	test("keeps Full workflow as the default and requires its existing permission", () => {
		expect(menuSource).toContain(
			"setFulfillmentCompletionChoice(getDefaultSalesCompletionChoice())",
		);
		expect(menuSource).toContain(
			"canRunFullWorkflow={auth.can.viewMarkSalesOrderFulfilled}",
		);
		expect(dialogSource).toContain('props.choice === "FULL_WORKFLOW" &&');
		expect(dialogSource).toContain(
			"Full-workflow permission is required for this choice.",
		);
	});

	test("keeps option descriptions without duplicate warnings or a completion reason field", () => {
		expect(dialogSource).toContain("record ${milestone} completion");
		expect(dialogSource).toContain("Full workflow is selected by default.");
		expect(dialogSource).toContain(
			"missing operational assignments or ${milestone} workflow",
		);
		expect(dialogSource).not.toContain("This selection may include recent orders");
		expect(dialogSource).not.toContain("This records milestone status");
		expect(dialogSource).not.toContain("status-only-reason");
		expect(dialogSource).toContain("props.cancellationReason");
	});

	test("uses dedicated mark, cancel, provenance, and refresh paths", () => {
		expect(menuSource).toContain("markFulfillmentCompletionStatusOnly");
		expect(menuSource).toContain("markFulfillmentCompletionStatusOnlyBulk");
		expect(menuSource).toContain("statusActionWasBulkRef.current");
		expect(menuSource).toContain("trpc.sales.productionSummary.pathKey()");
		expect(menuSource).toContain("cancelFulfillmentCompletionStatusOnly");
		expect(menuSource).toContain("activeFulfillmentRecord");
		expect(menuSource).toContain(
			"Fulfillment status-only completion cancelled",
		);
		expect(menuSource).toContain("salesCompletionProjectionQuery.refetch()");
	});

	test("loads the current projection for dedicated completion or Sales Order editors", () => {
		expect(menuSource).toContain("canLoadStatusOnlyCompletionProjection");
		expect(menuSource).toContain("canViewSalesCompletion");
		expect(menuSource).toContain("auth.can.editStatusOnlySalesCompletion");
		expect(menuSource).toContain("auth.can.editOrders");
		expect(menuSource).toContain("canLoadStatusOnlyCompletionProjection &&");
	});

	test("keeps administrative override as audit provenance rather than a visible action group", () => {
		expect(menuSource).not.toContain(">Administrative override<");
		expect(menuSource).not.toContain("beginsAdministrativeOverrideGroup");
		expect(menuSource).toContain("hasOnlyLifecycleExceptionCandidates");
		expect(dialogSource).not.toContain("Administrative status override");
		expect(dialogSource).not.toContain("Record administrative override");
		expect(dialogSource).toContain("Record milestone only");
	});

	test("offers Full workflow or Status only for lifecycle exceptions", () => {
		expect(menuSource).toMatch(
			/const openProductionAdministrativeOverride[\s\S]*?setProductionCompletionChoice\(getDefaultSalesCompletionChoice\(\)\)/,
		);
		expect(menuSource).toMatch(
			/const openFulfillmentAdministrativeOverride[\s\S]*?setFulfillmentCompletionChoice\(getDefaultSalesCompletionChoice\(\)\)/,
		);
		expect(dialogSource).not.toContain("{!administrativeOverride ? (");
		expect(dialogSource).toContain(
			"Choose how GND should record ${milestone} completion",
		);
	});

	test("keeps completion dialogs inside small responsive viewports", () => {
		const responsiveDialogClass =
			'className="max-h-[calc(100dvh-2rem)] overflow-y-auto"';

		expect(dialogSource.split(responsiveDialogClass)).toHaveLength(3);
	});
});
