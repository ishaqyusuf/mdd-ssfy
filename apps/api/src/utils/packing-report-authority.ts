export type PackingAuthority = {
	userId?: number | null;
	can: {
		editPickup?: boolean;
		editOrders?: boolean;
		viewPacking?: boolean;
		viewDelivery?: boolean;
		viewPickup?: boolean;
	};
};

export function requireAuthenticatedPackingUser(userId?: number | null) {
	if (!userId)
		throw new Error("Authentication is required for packing reports.");
	return userId;
}

export function authorizePackingReportActor(
	authority: PackingAuthority,
	dispatchDriverId: number | null,
) {
	const userId = requireAuthenticatedPackingUser(authority.userId);
	const roleScoped =
		authority.can.editPickup ||
		authority.can.editOrders ||
		authority.can.viewPacking;
	const assignedActor =
		(authority.can.viewDelivery || authority.can.viewPickup) &&
		dispatchDriverId === userId;
	if (!roleScoped && !assignedActor) {
		throw new Error(
			"Only the assigned dispatch actor or a packing manager may report packing.",
		);
	}
	return {
		actorUserId: userId,
		scope: roleScoped ? "role" : "assignment",
	} as const;
}

export function authorizePackingReportReviewer(authority: PackingAuthority) {
	const userId = requireAuthenticatedPackingUser(authority.userId);
	if (
		!authority.can.editPickup &&
		!authority.can.editOrders &&
		!authority.can.viewPacking
	) {
		throw new Error("You do not have permission to review packing reports.");
	}
	return { reviewerUserId: userId, scope: "role" as const };
}

export function packingReportReviewerCapability(authority: PackingAuthority) {
	return {
		canReview:
			Boolean(authority.userId) &&
			Boolean(
				authority.can.editPickup ||
					authority.can.editOrders ||
					authority.can.viewPacking,
			),
		scope: "role" as const,
	};
}
