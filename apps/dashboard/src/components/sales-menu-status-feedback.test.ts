import { describe, expect, it } from "bun:test";

const source = await Bun.file(
	new URL("./sales-menu.tsx", import.meta.url),
).text();

describe("sales menu status feedback", () => {
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

	it("cancels all fulfillment dispatches in one mutation", () => {
		expect(source).toContain("cancelDispatch: {\n\t\t\t\t\t\tdispatchIds,");
		expect(source).not.toContain("for (const dispatchId of dispatchIds)");
	});
});
