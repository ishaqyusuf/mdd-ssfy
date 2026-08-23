type ProductionSubmissionProfile = {
	role?: string | null;
	can?: {
		viewProduction?: boolean;
		editProduction?: boolean;
	} | null;
};

export function resolveProductionSubmissionAuthority(
	profile: ProductionSubmissionProfile,
) {
	const elevatedRole = ["admin", "super admin"].includes(
		String(profile.role || "").toLowerCase(),
	);
	const canEditProduction = Boolean(profile.can?.editProduction);
	return {
		canSubmitProduction:
			elevatedRole || canEditProduction || Boolean(profile.can?.viewProduction),
		allowSubmitForOthers: elevatedRole || canEditProduction,
	};
}

export function requireProductionSubmissionAuthority(
	profile: ProductionSubmissionProfile,
) {
	const authority = resolveProductionSubmissionAuthority(profile);
	if (!authority.canSubmitProduction) {
		throw new Error("Production access is required to report completed work.");
	}
	return authority;
}
