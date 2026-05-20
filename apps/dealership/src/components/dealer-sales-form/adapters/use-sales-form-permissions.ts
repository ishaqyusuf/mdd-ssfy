import { createSalesFormPermissions } from "@gnd/sales/sales-form";

export function useSalesFormPermissions() {
	return createSalesFormPermissions({
		canEditCustomer: true,
		canEditPricing: true,
		canSaveDraft: true,
		canFinalize: true,
		canPrint: false,
		canTakePayment: false,
		canSendPacking: false,
		canManageDispatch: false,
		canOpenInternalOverview: false,
		canOpenSettings: false,
	});
}
