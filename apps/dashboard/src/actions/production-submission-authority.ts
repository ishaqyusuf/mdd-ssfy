type ProductionSubmissionProfile = {
	role?: string | null;
	can?: {
		viewProduction?: boolean;
		editProduction?: boolean;
	} | null;
};

export function resolveProductionSubmissionAuthority(
	profile: ProductionSubmissionProfile,
	context: { isOrderSalesRep?: boolean } = {},
) {
	const elevatedRole = ["admin", "super admin"].includes(
		String(profile.role || "").toLowerCase(),
	);
	const canEditProduction = Boolean(profile.can?.editProduction);
	const isOrderSalesRep = Boolean(context.isOrderSalesRep);
	return {
		canSubmitProduction:
			elevatedRole ||
			canEditProduction ||
			Boolean(profile.can?.viewProduction) ||
			isOrderSalesRep,
		allowSubmitForOthers: elevatedRole || canEditProduction || isOrderSalesRep,
	};
}

export function requireProductionSubmissionAuthority(
	profile: ProductionSubmissionProfile,
	context: { isOrderSalesRep?: boolean } = {},
) {
	const authority = resolveProductionSubmissionAuthority(profile, context);
	if (!authority.canSubmitProduction) {
		throw new Error("Production access is required to report completed work.");
	}
	return authority;
}

export function requireProductionAssignmentAuthority(
	profile: ProductionSubmissionProfile,
) {
	if (!profile.can?.editProduction) {
		throw new Error("You do not have permission to manage production work.");
	}
}
