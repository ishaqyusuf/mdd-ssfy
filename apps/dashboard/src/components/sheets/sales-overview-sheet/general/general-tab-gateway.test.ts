import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

function source(path: string) {
	return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("Sales Overview General rollout boundary", () => {
	test("keeps one canonical sheet and gates only the General tab", () => {
		const controller = source("../controller.tsx");
		const gateway = source("./general-tab-gateway.tsx");

		expect(controller.includes("<GeneralTabGateway")).toBe(true);
		expect(controller.match(/GeneralTabGateway/g)?.length).toBe(2);
		expect(controller.includes("<TransactionsTab")).toBe(true);
		expect(controller.includes("<ProductionTab")).toBe(true);
		expect(gateway.includes('generalViewVersion === "v2"')).toBe(true);
		expect(gateway.includes("dynamic(")).toBe(true);
		expect(gateway.includes("GeneralTabV2Skeleton")).toBe(true);
	});

	test("places initial keyboard focus on the visible Sales Overview tab control", () => {
		const sheet = source("../index.tsx");
		const layout = source("../layout.tsx");

		expect(sheet.includes('primarySize="3xl"')).toBe(true);
		expect(sheet.includes('secondarySize="2xl"')).toBe(true);
		expect(sheet.includes("onOpenAutoFocus")).toBe(true);
		expect(sheet.includes("event.preventDefault()")).toBe(true);
		expect(sheet.includes("target.offsetParent !== null")).toBe(true);
		expect(sheet.includes("target.focus()")).toBe(true);
		expect(layout.match(/data-sales-overview-initial-focus/g)?.length).toBe(2);
		expect(layout.includes("<TabsList")).toBe(true);
		expect(layout.includes("<TabsTrigger")).toBe(true);
		expect(layout.includes('role="tab"')).toBe(false);
	});

	test("uses a compact delivery popover with the standard fulfillment calendar", () => {
		const deliveryPopover = source("./v2/delivery-option-popover.tsx");

		expect(deliveryPopover.includes("<Popover")).toBe(true);
		expect(deliveryPopover.includes("<PopoverTrigger")).toBe(true);
		expect(deliveryPopover.match(/<PopoverContent/g)?.length).toBe(1);
		expect(deliveryPopover.includes("<Dialog")).toBe(false);
		expect(deliveryPopover.includes("Fulfillment date")).toBe(true);
		expect(deliveryPopover.includes('from "@gnd/ui/calendar"')).toBe(true);
		expect(deliveryPopover.includes("<Calendar")).toBe(true);
		expect(deliveryPopover.includes('mode="single"')).toBe(true);
		expect(deliveryPopover.includes("datePickerOpen")).toBe(false);
		expect(deliveryPopover.includes("Icons.CalendarIcon")).toBe(false);
		expect(deliveryPopover.includes('type="date"')).toBe(false);
		expect(
			deliveryPopover.includes(
				"Choose how and when this order should be fulfilled.",
			),
		).toBe(false);
		expect(deliveryPopover.includes("<Icons.Edit3")).toBe(true);
		expect(deliveryPopover.includes("<Icons.Pencil")).toBe(false);
		expect(deliveryPopover.includes('className="ml-auto"')).toBe(true);
		expect(deliveryPopover.includes("flex justify-end gap-2")).toBe(true);
		expect(deliveryPopover.includes("Service date")).toBe(false);
		expect(deliveryPopover.includes("auth.can?.editPickup")).toBe(true);
		expect(deliveryPopover.includes("open && canEdit")).toBe(true);
		expect(deliveryPopover.includes("fallbackFulfillmentDate")).toBe(true);
		expect(
			deliveryPopover.includes("salesDeliveryInfo.queryKey({ salesId })"),
		).toBe(true);
	});

	test("keeps the V2 command surface continuous and gives finance a borderless rail", () => {
		const general = source("./v2/general-tab-v2.tsx");
		const finance = source("./v2/financial-rail.tsx");

		expect(general.includes("grid grid-cols-3")).toBe(false);
		expect(general.includes("SalesPrioritySelect")).toBe(false);
		expect(general.includes("border-b bg-background/95 py-3")).toBe(true);
		expect(general.includes("lg:border-r")).toBe(true);
		expect(general.includes("minmax(280px,0.92fr)")).toBe(true);
		expect(finance.includes("@gnd/ui/card")).toBe(false);
		expect(finance.includes("<Card")).toBe(false);
		expect(finance.includes('aria-label="Financial summary"')).toBe(true);
	});

	test("uses the approved V2 header and keeps exactly three primary actions", () => {
		const layout = source("../layout.tsx");
		const actionBar = source("../general-action-bar.tsx");

		expect(layout.includes('generalViewVersion === "v2"')).toBe(true);
		expect(layout.includes("Sales overview ·")).toBe(true);
		expect(layout.includes("documentStatus.label")).toBe(true);
		expect(layout.includes("Updated {data.salesDate}")).toBe(true);
		expect(layout.includes("SalesPrioritySelect")).toBe(true);
		expect(layout.includes("border-b-2 border-transparent")).toBe(false);
		expect(
			layout.includes(
				"w-fit max-w-full flex-wrap justify-start gap-1 rounded-md border",
			),
		).toBe(true);
		expect(actionBar.includes("grid grid-cols-3")).toBe(true);
		expect(actionBar.includes("SendForPackingMenuItem")).toBe(true);
		expect(actionBar.includes("SendForPackingButton")).toBe(false);
	});

	test("keeps the tab and General scroll boundaries visually continuous", () => {
		const sheet = source("../index.tsx");
		const layout = source("../layout.tsx");
		const general = source("./v2/general-tab-v2.tsx");
		const skeleton = source("./v2/general-tab-v2-skeleton.tsx");

		expect(sheet.includes('className="-mt-4"')).toBe(false);
		expect(
			sheet.includes('contentClassName={isGeneralV2 ? "pb-0 sm:pb-0"'),
		).toBe(true);
		expect(layout.includes('className="w-full border-b border-border"')).toBe(
			true,
		);
		expect(general.match(/pb-24/g)?.length).toBe(2);
		expect(general.includes("lg:border-r lg:pb-24")).toBe(true);
		expect(general.includes('className="border-t pt-4"')).toBe(false);
		expect(skeleton.match(/pb-24/g)?.length).toBe(2);
	});

	test("uses compact customer and invoice dropdown controls", () => {
		const customer = source("./v2/customer-section.tsx");
		const finance = source("./v2/financial-rail.tsx");
		const paymentMethod = source(
			"../../../sales-overview-payment-method-select.tsx",
		);

		expect(customer.includes(">Edit customer<")).toBe(false);
		expect(customer.includes("<DropdownMenu")).toBe(true);
		expect(customer.includes("Customer")).toBe(true);
		expect(customer.includes("Shipping")).toBe(true);
		expect(customer.includes("Billing")).toBe(true);
		expect(customer.includes('className="size-3 shrink-0"')).toBe(true);
		expect(customer.includes("justify-between gap-3")).toBe(true);
		expect(finance.includes('variant="inline"')).toBe(true);
		expect(finance.includes('className="py-1"')).toBe(false);
		expect(paymentMethod.includes('variant?: "row" | "inline"')).toBe(true);
	});

	test("keeps V2 operations and fulfillment controls intentionally compact", () => {
		const general = source("./v2/general-tab-v2.tsx");
		const operations = source("./v2/operations-section.tsx");
		const fulfillment = source("./v2/fulfillment-signal-section.tsx");
		const order = source("./v2/order-section.tsx");
		const customer = source("./v2/customer-section.tsx");

		expect(general.includes("FulfillmentSignalSection")).toBe(true);
		expect(general.includes("SpecialOrderOverviewCard")).toBe(false);
		expect(operations.includes('label: "Production"')).toBe(true);
		expect(operations.includes('label: "Fulfillment"')).toBe(true);
		expect(operations.includes('label: "Payment"')).toBe(false);
		expect(operations.includes('label: "Shipping"')).toBe(false);
		expect(fulfillment.includes("Signed")).toBe(true);
		expect(fulfillment.includes("currentEvidence.customerName")).toBe(true);
		expect(fulfillment.includes("acknowledgedAt")).toBe(true);
		expect(fulfillment.includes("/signature")).toBe(true);
		expect(order.includes("compact")).toBe(true);
		expect(order.includes('presentation="popover"')).toBe(true);
		expect(customer.includes("iconOnly")).toBe(true);
	});

	test("keeps Special Order actions inside the expanded V2 disclosure", () => {
		const fulfillment = source("./v2/fulfillment-signal-section.tsx");
		const controls = source("../special-order-overview-card.tsx");
		const inlineActions = source(
			"../special-order-overview-inline-actions.tsx",
		);

		expect(fulfillment.includes("Manage special order")).toBe(false);
		expect(fulfillment.includes("<Dialog")).toBe(false);
		expect(
			fulfillment.includes(
				'<SpecialOrderOverviewControls presentation="inline"',
			),
		).toBe(true);
		expect(controls.includes('presentation?: "card" | "inline"')).toBe(true);
		expect(inlineActions.includes("Are you sure you want to continue?")).toBe(
			true,
		);
		expect(inlineActions.includes("Mark as Special Order")).toBe(true);
		expect(inlineActions.includes("Copy approval link")).toBe(true);
		expect(inlineActions.includes("Remove Special Order")).toBe(true);
	});

	test("uses a keyboard-native sales representative picker", () => {
		const transfer = source("../../../sales-rep-transfer-control.tsx");

		expect(transfer.includes("<CommandInput")).toBe(true);
		expect(transfer.includes("<CommandList")).toBe(true);
		expect(transfer.includes("<CommandItem")).toBe(true);
		expect(transfer.includes("aria-selected={isSelected}")).toBe(true);
		expect(transfer.includes("getSaleOverview.queryKey({")).toBe(true);
	});

	test("opens payment creation in the URL-driven secondary pane", () => {
		const params = source("../../../../hooks/use-sales-overview-query.ts");
		const sheet = source("../index.tsx");
		const controller = source("../controller.tsx");
		const finance = source("./v2/financial-rail.tsx");
		const transactions = source("../transactions-tab.tsx");
		const paymentPane = source("../payment-create-pane.tsx");
		const processor = source(
			"../../../widgets/sales-payment-processor/sales-payment-processor.tsx",
		);

		expect(params.includes("salesPayment: parseAsString")).toBe(true);
		expect(sheet.includes('kind: "payment-create"')).toBe(true);
		expect(sheet.includes("openPaymentCreatePane")).toBe(true);
		expect(sheet.includes("query.salesPayment")).toBe(true);
		expect(controller.match(/onCreatePayment/g)?.length).toBeGreaterThanOrEqual(
			4,
		);
		expect(finance.includes("onCreatePayment")).toBe(true);
		expect(finance.includes("<SalesPaymentProcessor")).toBe(false);
		expect(transactions.includes("onCreatePayment")).toBe(true);
		expect(paymentPane.includes("salesRefunds.overview.queryKey")).toBe(true);
		expect(paymentPane.includes("sales.getSaleOverview.queryKey")).toBe(true);
		expect(paymentPane.includes("<Sheet.SecondaryFooter")).toBe(true);
		expect(paymentPane.includes("overflow-x-hidden")).toBe(true);
		expect(processor.includes("SalesPaymentProcessorContent")).toBe(true);
		expect(processor.includes("createPortal(paymentActions")).toBe(true);
		expect(processor.match(/placeholder="Payment Method"/g)?.length).toBe(1);
	});

	test("uses a quiet receipt list instead of analytics cards", () => {
		const transactions = source("../transactions-tab.tsx");

		expect(transactions.includes("lg:grid-cols-5")).toBe(false);
		expect(transactions.includes("<table")).toBe(false);
		expect(transactions.includes('aria-label="Order payment summary"')).toBe(
			true,
		);
		expect(transactions.includes("No transactions yet")).toBe(true);
		expect(transactions.match(/Make payment/g)?.length).toBeGreaterThanOrEqual(
			2,
		);
	});
});
