export type SalesFormWorkflowCapabilities = {
	canEditWorkflowComponents: boolean;
	canEditWorkflowComponentPricing: boolean;
	canArchiveWorkflowComponents: boolean;
	canEditSectionOverrides: boolean;
	canManageRedirects: boolean;
	canManageDoorSizeVariants: boolean;
	canManageDoorSuppliers: boolean;
	canDeleteSelectedComponents: boolean;
	canEnableCustomComponents: boolean;
	canUseMouldingCalculator: boolean;
	canEditFlatLineDetails: boolean;
	canEditLinePricing: boolean;
	canEditDealerVisibleTotals: boolean;
	isDealershipMode: boolean;
	isStorefrontMode: boolean;
};

export function createSalesFormWorkflowCapabilities(
	patch: Partial<SalesFormWorkflowCapabilities> = {},
): SalesFormWorkflowCapabilities {
	return {
		canEditWorkflowComponents: false,
		canEditWorkflowComponentPricing: false,
		canArchiveWorkflowComponents: false,
		canEditSectionOverrides: false,
		canManageRedirects: false,
		canManageDoorSizeVariants: false,
		canManageDoorSuppliers: false,
		canDeleteSelectedComponents: false,
		canEnableCustomComponents: false,
		canUseMouldingCalculator: false,
		canEditFlatLineDetails: false,
		canEditLinePricing: false,
		canEditDealerVisibleTotals: false,
		isDealershipMode: false,
		isStorefrontMode: false,
		...patch,
	};
}

export function createInternalSalesFormWorkflowCapabilities(input?: {
	isWorkflowAdmin?: boolean;
	canEditLinePricing?: boolean;
	canEditWorkflowComponentPricing?: boolean;
}): SalesFormWorkflowCapabilities {
	const isWorkflowAdmin = Boolean(input?.isWorkflowAdmin);
	const canEditLinePricing = Boolean(input?.canEditLinePricing);

	return createSalesFormWorkflowCapabilities({
		canEditWorkflowComponents: isWorkflowAdmin,
		canEditWorkflowComponentPricing: Boolean(
			input?.canEditWorkflowComponentPricing,
		),
		canArchiveWorkflowComponents: isWorkflowAdmin,
		canEditSectionOverrides: isWorkflowAdmin,
		canManageRedirects: isWorkflowAdmin,
		canManageDoorSizeVariants: isWorkflowAdmin,
		canManageDoorSuppliers: isWorkflowAdmin,
		canDeleteSelectedComponents: true,
		canEnableCustomComponents: isWorkflowAdmin,
		canUseMouldingCalculator: true,
		canEditFlatLineDetails: true,
		canEditLinePricing,
		canEditDealerVisibleTotals: false,
		isDealershipMode: false,
		isStorefrontMode: false,
	});
}

export function createDealerSalesFormWorkflowCapabilities(): SalesFormWorkflowCapabilities {
	return createSalesFormWorkflowCapabilities({
		canEditWorkflowComponents: false,
		canEditSectionOverrides: false,
		canManageRedirects: false,
		canManageDoorSizeVariants: false,
		canManageDoorSuppliers: false,
		canDeleteSelectedComponents: true,
		canEnableCustomComponents: false,
		canUseMouldingCalculator: true,
		canEditFlatLineDetails: false,
		canEditLinePricing: false,
		canEditDealerVisibleTotals: false,
		isDealershipMode: true,
		isStorefrontMode: false,
	});
}

export function createStorefrontSalesFormWorkflowCapabilities(): SalesFormWorkflowCapabilities {
	return createSalesFormWorkflowCapabilities({
		canEditWorkflowComponents: false,
		canEditSectionOverrides: false,
		canManageRedirects: false,
		canManageDoorSizeVariants: false,
		canManageDoorSuppliers: false,
		canDeleteSelectedComponents: true,
		canEnableCustomComponents: false,
		canUseMouldingCalculator: true,
		canEditFlatLineDetails: false,
		canEditLinePricing: false,
		canEditDealerVisibleTotals: false,
		isDealershipMode: false,
		isStorefrontMode: true,
	});
}
