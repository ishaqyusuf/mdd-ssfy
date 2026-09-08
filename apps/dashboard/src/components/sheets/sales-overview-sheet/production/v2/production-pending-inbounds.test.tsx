import { beforeEach, expect, mock, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const buttons: Array<{ children: unknown; onClick?: () => void }> = [];
const navigation: unknown[] = [];
let selectedInboundId: number | null = null;
let input: unknown;
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
		},
	}),
}));
const tanstack = await import("@gnd/ui/tanstack");
mock.module("@gnd/ui/tanstack", () => ({
	...tanstack,
	useQuery: () => query,
	useMutation: () => ({ isPending: false }),
	useQueryClient: () => ({ invalidateQueries: async () => {} }),
}));
const { ProductionPendingInbounds } = await import(
	"./production-pending-inbounds"
);
beforeEach(() => {
	buttons.length = 0;
	navigation.length = 0;
	selectedInboundId = null;
	query = {
		data: { count: 1, receivingEnabled: true, rows: [row], nextCursor: null },
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
		data: {
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
	query = { data: { count: 0 } };
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
