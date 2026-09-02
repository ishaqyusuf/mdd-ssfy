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
const completionDialogSource = await Bun.file(
	new URL("./sales-production-completion-dialogs.tsx", import.meta.url),
).text();

describe("sales menu status feedback", () => {
	it("uses fresh safety reads before starting fulfillment", () => {
		const callStart = source.indexOf(
			"salesInventoryMarkAsPreflight.queryOptions(",
		);
		expect(callStart).toBeGreaterThan(-1);
		expect(source.slice(callStart, callStart + 500)).toContain("staleTime: 0");
	});

	it("gates fulfillment and hands it to the monitored bulk workflow", () => {
		expect(source).toContain("auth.can.viewMarkSalesOrderFulfilled");
		expect(dispatchMenuSource).toContain(
			"auth.can.viewMarkSalesOrderFulfilled",
		);
		expect(source).toContain('taskName: "bulk-mark-sales-fulfilled"');
		expect(source).not.toContain(
			"trpc.dispatch.createDispatch.mutationOptions",
		);
	});

	it("shows distinct production-complete and fulfilled status icons", () => {
		expect(source).toContain(
			'<Icons.Factory className="mr-2 size-4 text-emerald-600" />',
		);
		expect(source).toContain(
			'<Icons.Truck className="mr-2 size-4 text-blue-600" />',
		);
		expect(source).toContain("showUnavailableFulfilled");
	});

	it("keeps a fulfillment start locked until its task is accepted", () => {
		expect(source).toContain("statusActionInFlightRef.current");
		expect(source).toContain("if (statusActionInFlightRef.current) return;");
	});

	it("waits for each monitored status task to be accepted before finishing the handoff", () => {
		const awaitedTaskStarts =
			source.match(
				/await (?:bulkProductionCompletionTask|bulkFulfillmentTask)\.trigger\(/g,
			) ?? [];
		expect(awaitedTaskStarts).toHaveLength(2);
	});

	it("shows visible feedback as soon as a monitored status task starts", () => {
		expect(source).toContain('title: "Bulk production completion started"');
		expect(source).toContain('title: "Bulk fulfillment started"');
	});

	it("shows visible feedback when a monitored status task completes", () => {
		expect(source).toContain('title: "Bulk production completion finished"');
		expect(source).toContain('title: "Bulk fulfillment completed"');
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

	it("defaults Fulfillment completion to today and uses the shadcn calendar", () => {
		expect(source).toContain(
			"setFulfillmentEffectiveDate(toSalesCompletionDateValue());",
		);
		expect(completionDialogSource).toContain(
			'import { Calendar } from "@gnd/ui/calendar";',
		);
		expect(completionDialogSource).toContain("<PopoverTrigger asChild>");
		expect(completionDialogSource).toContain("<Calendar");
		expect(completionDialogSource).not.toContain('type="date"');
	});
});
