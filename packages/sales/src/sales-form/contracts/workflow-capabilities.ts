export type SalesFormWorkflowCapabilities = {
	canEditWorkflowComponents: boolean;
	canEditWorkflowComponentDetails: boolean;
	canCreateWorkflowComponents: boolean;
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
	canEditServiceLinePricing: boolean;
	canEditDealerVisibleTotals: boolean;
	isDealershipMode: boolean;
	isStorefrontMode: boolean;
};

export function createSalesFormWorkflowCapabilities(
	patch: Partial<SalesFormWorkflowCapabilities> = {},
): SalesFormWorkflowCapabilities {
	return {
		canEditWorkflowComponents: false,
		canEditWorkflowComponentDetails: false,
		canCreateWorkflowComponents: false,
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
		canEditServiceLinePricing: false,
		canEditDealerVisibleTotals: false,
		isDealershipMode: false,
		isStorefrontMode: false,
		...patch,
	};
}

export function createInternalSalesFormWorkflowCapabilities(input?: {
	isWorkflowAdmin?: boolean;
	canEditSalesComponent?: boolean;
	canEditLinePricing?: boolean;
	canEditServiceLinePricing?: boolean;
	canEditWorkflowComponentPricing?: boolean;
}): SalesFormWorkflowCapabilities {
	const isWorkflowAdmin = Boolean(input?.isWorkflowAdmin);
	const canEditSalesComponent = Boolean(input?.canEditSalesComponent);
	const canEditLinePricing = Boolean(input?.canEditLinePricing);

	return createSalesFormWorkflowCapabilities({
		canEditWorkflowComponents: isWorkflowAdmin,
		canEditWorkflowComponentDetails: canEditSalesComponent,
		canCreateWorkflowComponents: canEditSalesComponent,
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
		canEditServiceLinePricing: Boolean(input?.canEditServiceLinePricing),
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
