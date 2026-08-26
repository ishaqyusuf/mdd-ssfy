import { describe, expect, it } from "bun:test";

const source = await Bun.file(
	new URL("./sales-menu.tsx", import.meta.url),
).text();
const dispatchMenuSource = await Bun.file(
	new URL(
		"./sheets/sales-overview-sheet/dispatch-list-menu.tsx",
		import.meta.url,
	),
).text();

describe("sales menu status feedback", () => {
	it("uses fresh safety reads before starting fulfillment", () => {
		const callStart = source.indexOf(
			"salesInventoryMarkAsPreflight.queryOptions(",
		);
		expect(callStart).toBeGreaterThan(-1);
		expect(source.slice(callStart, callStart + 500)).toContain("staleTime: 0");
	});

	it("gates fulfillment and resolves its dispatch through the narrow endpoint", () => {
		expect(source).toContain("auth.can.viewMarkSalesOrderFulfilled");
		expect(dispatchMenuSource).toContain(
			"auth.can.viewMarkSalesOrderFulfilled",
		);
		expect(source).toContain("ensureSalesOrderFulfillmentDispatch");
		expect(source).not.toContain(
			"trpc.dispatch.createDispatch.mutationOptions",
		);
	});

	it("keeps a fulfillment start locked until its task is accepted", () => {
		expect(source).toContain("statusActionInFlightRef.current");
		expect(source).toContain("if (statusActionInFlightRef.current) return;");
	});

	it("waits for each monitored status task to be accepted before finishing the handoff", () => {
		const awaitedTaskStarts =
			source.match(/await salesControlTask\.trigger\(/g) ?? [];
		expect(awaitedTaskStarts).toHaveLength(2);
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
