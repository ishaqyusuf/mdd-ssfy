import { describe, expect, it } from "bun:test";

const source = await Bun.file(
	new URL("./sales-menu.tsx", import.meta.url),
).text();

describe("sales menu status feedback", () => {
	it("uses fresh safety reads before starting fulfillment", () => {
		for (const procedure of [
			"salesInventoryMarkAsPreflight",
			"salesDeliveryInfo",
		]) {
			const callStart = source.indexOf(`${procedure}.queryOptions(`);
			expect(callStart).toBeGreaterThan(-1);
			expect(source.slice(callStart, callStart + 500)).toContain(
				"staleTime: 0",
			);
		}
	});

	it("keeps a fulfillment start locked until its task is accepted", () => {
		expect(source).toContain("statusActionInFlightRef.current");
		expect(source).toContain("if (statusActionInFlightRef.current) return;");
	});

	it("shows visible feedback as soon as a monitored status task starts", () => {
		expect(source).toContain('title: "Sales status update started"');
		expect(source).toContain(
			'description: "You can keep working while the order status updates."',
		);
	});

	it("shows visible feedback when a monitored status task completes", () => {
		expect(source).toContain('title: "Sales status updated"');
		expect(source).toContain(
			'description: "The order list and saved tab counts are refreshing."',
		);
	});

	it("keeps portal menu selections from opening the underlying sales row", () => {
		expect(source).toContain("onClick={(event) => event.stopPropagation()}");
		expect(source).toContain(
			"onPointerDown={(event) => event.stopPropagation()}",
		);
	});

	it("routes fulfillment cancellation through the guarded review dialog", () => {
		expect(source).toContain("SalesWorkflowCancellationDialog");
		expect(source).toContain('actions.openWorkflowCancellation("fulfillment")');
	});
});
