import { beforeEach, expect, mock, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const buttons: Array<{ children: unknown; onClick?: () => void }> = [];
const navigation: unknown[] = [];
const receivedInputs: Array<{inboundId:number; expectedRevision:string}> = [];
let selectedInboundId: number | null = null;
let input: unknown;
let cancellationError: Error | null = null;
let mutationIndex = 0;
let query: Record<string, unknown>;
const row = {
	id: 7,
	reference: "IN-7",
	supplier: "Test supplier",
	canReceive: true,
	revision: "a".repeat(64),
	reason: null,
	items: [{ id: 52, name: "Assigned door", remaining: 2 }],
};
const actualButtons = await import("@gnd/ui/button");
const OriginalButton = actualButtons.Button;
mock.module("@gnd/ui/button", () => ({
	...actualButtons,
	Button: (props: { children: unknown; onClick?: () => void }) => {
		buttons.push(props);
		return createElement(OriginalButton, props as never);
	},
}));
mock.module("@/hooks/use-sales-overview-query", () => ({
	useSalesOverviewQuery: () => ({
		setParams: (value: unknown) => navigation.push(value),
	}),
}));
mock.module(
	"@/components/sales-overview-system/hooks/use-sales-inventory-segment-query",
	() => ({
		useSalesInventorySegmentQuery: () => ({
			selectedInventoryInboundId: selectedInboundId,
			setInventorySegment: (...value: unknown[]) => navigation.push(value),
		}),
	}),
);
mock.module("@/trpc/client", () => ({
	useTRPC: () => ({
		sales: {
			productionPendingInbounds: {
				queryOptions: (value: unknown) => {
					input = value;
					return {};
				},
				queryKey: () => ["pending"],
			},
			receiveProductionInbound: { mutationOptions: (value: unknown) => value },
			cancelProductionInbound: { mutationOptions: (value: unknown) => value },
		},
	}),
}));
const tanstack = await import("@gnd/ui/tanstack");
mock.module("@gnd/ui/tanstack", () => ({
	...tanstack,
	useQuery: () => query,
	useMutation: () => ({ mutate: (value: {inboundId:number; expectedRevision:string}) => receivedInputs.push(value), isPending: false, error: mutationIndex++ === 0 ? cancellationError : null }),
	useQueryClient: () => ({ invalidateQueries: async () => {} }),
}));
const { ProductionPendingInbounds } = await import(
	"./production-pending-inbounds"
);
beforeEach(() => {
	buttons.length = 0;
	receivedInputs.length = 0;
	cancellationError = null;
	mutationIndex = 0;
	navigation.length = 0;
	selectedInboundId = null;
	query = {
		data: { receipts: [], nextReceiptCursor: null, count: 1, receivingEnabled: true, rows: [row], nextCursor: null },
	};
});
test("compact production section has supplier and two actions without material checklist", () => {
	const html = renderToStaticMarkup(
		<ProductionPendingInbounds salesOrderId={123} />,
	);
	expect(html).toContain("Test supplier");
	expect(html).toContain("Open inbound");
	expect(html).toContain("Mark as received");
	expect(html).not.toContain("Assigned door");
	expect(html).not.toContain("Decision note");
	buttons.find((button) => button.children === "Open inbound")!.onClick!();
	expect(navigation).toEqual([
		["inbounds", { inboundId: 7 }],
		{ salesTab: "inventory" },
	]);
});
test("worker policy off omits receipt while keeping scoped inbound navigation", () => {
	query = {
		data: { receipts: [], nextReceiptCursor: null,
			count: 1,
			receivingEnabled: false,
			rows: [{ ...row, canReceive: false }],
			nextCursor: null,
		},
	};
	const html = renderToStaticMarkup(
		<ProductionPendingInbounds salesOrderId={123} />,
	);
	expect(html).not.toContain("Mark as received");
	expect(html).toContain("Open inbound");
});
test("worker Inventory loads the exact inbound and exposes assigned contents with a return action", () => {
	selectedInboundId = 7;
	const html = renderToStaticMarkup(
		<ProductionPendingInbounds salesOrderId={123} inventoryMode />,
	);
	expect(input).toEqual({
		salesOrderId: 123,
		inboundId: 7,
		cursor: undefined,
		take: 10,
	});
	expect(html).toContain("Assigned door");
	buttons.find((button) => button.children === "Back to production")!
		.onClick!();
	expect(navigation).toEqual([{ salesTab: "production" }]);
});
test("empty, loading and error states remain distinct", () => {
	query = { data: { receipts: [], nextReceiptCursor: null, count: 0 } };
	expect(
		renderToStaticMarkup(<ProductionPendingInbounds salesOrderId={123} />),
	).toBe("");
	query = { isLoading: true };
	expect(
		renderToStaticMarkup(<ProductionPendingInbounds salesOrderId={123} />),
	).toContain("Loading pending inbounds");
	query = { isError: true };
	expect(
		renderToStaticMarkup(<ProductionPendingInbounds salesOrderId={123} />),
	).toContain("Retry pending inbounds");
});

test("saved admin receipt stays visible with cancellation after pending inbounds disappear", () => {
	query = { data: { count: 0, workerMode: false, rows: [], receipts: [{ receiptId: 42, inboundId: 7, canCancel: true, cancelled: false }], nextReceiptCursor: null } };
	const html = renderToStaticMarkup(<ProductionPendingInbounds salesOrderId={123} />);
	expect(html).toContain("marked as received");
	expect(html).toContain("Open inbound");
	expect(html).toContain("Cancel review");
});

test("worker pending materials show only receipt confirmation and no admin navigation", () => {
	query = { data: { count: 1, workerMode: true, receivingEnabled: true, rows: [row], receipts: [], nextReceiptCursor: null } };
	const html = renderToStaticMarkup(<ProductionPendingInbounds salesOrderId={123} />);
	expect(html).toContain("Have these materials arrived?");
	expect(html).toContain("Yes, received");
	expect(html).not.toContain("Open inbound");
	expect(html).not.toContain("Cancel review");
});

test("worker sees supervisor guidance after all receipts disappear but review remains pending", () => {
	query = { data: { count: 0, workerMode: true, needsSupervisor: true, receivingEnabled: true, rows: [], receipts: [], nextReceiptCursor: null } };
	const html = renderToStaticMarkup(<ProductionPendingInbounds salesOrderId={123} />);
	expect(html).toContain("Contact your supervisor");
	expect(html).not.toContain("Materials received.");
	expect(html).not.toContain("Cancel review");
});

test("cancellation conflict remains visible beside the unchanged receipt", () => {
 cancellationError = new Error("This receipt's materials or production records have changed. Open Inventory to review before cancelling.");
 query = {data: {receipts: [{receiptId: 99, inboundId: 7, canCancel: true, cancelled: false}], count: 0, rows: [], workerMode: false}};
 const html = renderToStaticMarkup(<ProductionPendingInbounds salesOrderId={123} />);
 expect(html).toContain('role="alert"');
 expect(html).toContain("Open Inventory to review before cancelling.");
 expect(html).toContain("marked as received.");
 expect(html).toContain("Cancel review");
});

 test("each worker inbound confirms its own revision and preserves separate supplier details", () => {
  query = {data:{count:2,workerMode:true,receivingEnabled:true,receipts:[],rows:[
   {...row,totalQty:2,expectedAt:null},
   {...row,id:8,reference:"IN-8",supplier:"Second supplier",totalQty:7,revision:"b".repeat(64),expectedAt:null},
  ]}};
  const html=renderToStaticMarkup(<ProductionPendingInbounds salesOrderId={123}/>);
  expect(html).toContain("Test supplier");
  expect(html).toContain("Second supplier");
  expect(html).toContain("Not scheduled");
  expect(html).not.toContain("Open inbound");
  const confirmations=buttons.filter(button=>button.children === "Yes, received");
  expect(confirmations.length).toBe(2);
  confirmations[1]!.onClick!();
  confirmations[0]!.onClick!();
  expect(receivedInputs.map(value=>[value.inboundId,value.expectedRevision])).toEqual([[8,"b".repeat(64)],[7,"a".repeat(64)]]);
 });
