type Allocation = {
	id: number;
	qty: number;
	status:
		| "pending_review"
		| "approved"
		| "reserved"
		| "picked"
		| "consumed"
		| "released"
		| "cancelled";
};

/** Required quantities are already converted to component inventory units. */
export function planShortLoadInventoryReconciliation(
	components: Array<{
		componentId: number;
		packedRequirement: number;
		allocations: Allocation[];
	}>,
) {
	const releases: Array<{
		allocationId: number;
		qty: number;
		requiresPhysicalReturn: boolean;
	}> = [];
	const seen = new Set<number>();
	const round = (value: number) => Math.round(value * 1e6) / 1e6;
	for (const component of components) {
		if (
			!Number.isFinite(component.packedRequirement) ||
			component.packedRequirement < 0
		)
			throw new Error("Invalid packed component requirement.");
		let retain = component.packedRequirement;
		const allocations = [...component.allocations].sort(
			(a, b) =>
				(a.status === "picked" ? 0 : 1) - (b.status === "picked" ? 0 : 1) ||
				a.id - b.id,
		);
		for (const allocation of allocations) {
			if (seen.has(allocation.id))
				throw new Error("Duplicate inventory allocation.");
			seen.add(allocation.id);
			if (!Number.isFinite(allocation.qty) || allocation.qty < 0)
				throw new Error("Invalid inventory allocation quantity.");
			if (allocation.status === "released" || allocation.status === "cancelled")
				continue;
			if (
				allocation.status === "consumed" ||
				allocation.status === "pending_review"
			)
				throw new Error(
					"Resolve consumed or pending inventory before confirming a short load.",
				);
			const kept =
				allocation.status === "picked" ? Math.min(retain, allocation.qty) : 0;
			retain = round(retain - kept);
			const release = round(allocation.qty - kept);
			if (release > 0)
				releases.push({
					allocationId: allocation.id,
					qty: release,
					requiresPhysicalReturn: allocation.status === "picked",
				});
		}
		if (retain > 0)
			throw new Error(
				"Packed items are not fully covered by picked inventory.",
			);
	}
	return {
		releases,
		requiresPhysicalReturn: releases.some(
			(item) => item.requiresPhysicalReturn,
		),
	};
}
