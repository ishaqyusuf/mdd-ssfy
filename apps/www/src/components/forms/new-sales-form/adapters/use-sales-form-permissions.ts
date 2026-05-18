import { createSalesFormPermissions } from "@gnd/sales/sales-form";

export function useSalesFormPermissions(type: "order" | "quote") {
	return createSalesFormPermissions({
		canEditCustomer: true,
		canEditPricing: true,
		canSaveDraft: true,
		canFinalize: true,
		canPrint: true,
		canTakePayment: type === "order",
		canSendPacking: type === "order",
		canManageDispatch: type === "order",
		canOpenInternalOverview: true,
		canOpenSettings: true,
	});
}
