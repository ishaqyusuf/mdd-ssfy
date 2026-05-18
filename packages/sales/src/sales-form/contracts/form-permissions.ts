export type SalesFormPermissions = {
	canEditCustomer: boolean;
	canEditPricing: boolean;
	canSaveDraft: boolean;
	canFinalize: boolean;
	canPrint: boolean;
	canTakePayment: boolean;
	canSendPacking: boolean;
	canManageDispatch: boolean;
	canOpenInternalOverview: boolean;
	canOpenSettings: boolean;
};

export function createSalesFormPermissions(
	patch: Partial<SalesFormPermissions> = {},
): SalesFormPermissions {
	return {
		canEditCustomer: false,
		canEditPricing: false,
		canSaveDraft: false,
		canFinalize: false,
		canPrint: false,
		canTakePayment: false,
		canSendPacking: false,
		canManageDispatch: false,
		canOpenInternalOverview: false,
		canOpenSettings: false,
		...patch,
	};
}
