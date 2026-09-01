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

	test("warns that Status-only cannot fabricate proof or business effects", () => {
		expect(dialogSource).toContain(
			"record {milestone} completion. Full workflow",
		);
		expect(dialogSource).toContain(
			"missing operational assignments or {milestone} workflow",
		);
		for (const phrase of [
			"No delivery proof",
			"inventory commitment",
			"dispatch",
			"shipment",
			"tax",
			"accounting",
			"notification",
			"commission",
			"payout",
		]) {
			expect(dialogSource).toContain(phrase);
		}
		expect(dialogSource).toContain(
			"Use this only when real-world fulfillment happened outside GND.",
		);
	});

	test("uses dedicated mark, cancel, provenance, and refresh paths", () => {
		expect(menuSource).toContain("markFulfillmentCompletionStatusOnly");
		expect(menuSource).toContain("cancelFulfillmentCompletionStatusOnly");
		expect(menuSource).toContain("activeFulfillmentRecord");
		expect(menuSource).toContain(
			"Fulfillment status-only completion cancelled",
		);
		expect(menuSource).toContain("salesCompletionProjectionQuery.refetch()");
	});
});
