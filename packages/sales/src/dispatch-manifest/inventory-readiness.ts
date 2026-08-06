export type DispatchInventoryReadiness =
	| "ready_to_load"
	| "reserved"
	| "partially_ready"
	| "backordered"
	| "inventory_review";

type ComponentReadinessInput = {
	required?: boolean | null;
	requiredQty?: number | null;
	inboundQty?: number | null;
	allocations?: Array<{ qty?: number | null; status?: string | null }> | null;
};

function sumStatus(
	component: ComponentReadinessInput,
	statuses: readonly string[],
) {
	return (component.allocations || []).reduce(
		(total, allocation) =>
			statuses.includes(allocation.status || "")
				? total + Number(allocation.qty || 0)
				: total,
		0,
	);
}

export function getDispatchInventoryReadiness(
	components: readonly ComponentReadinessInput[],
): DispatchInventoryReadiness {
	const required = components.filter((component) => component.required !== false);
	if (!required.length) return "inventory_review";
	if (
		required.some((component) =>
			(component.allocations || []).some(
				(allocation) => allocation.status === "pending_review",
			),
		)
	) {
		return "inventory_review";
	}
	const covers = (statuses: readonly string[]) =>
		required.every(
			(component) =>
				sumStatus(component, statuses) >= Number(component.requiredQty || 0),
		);
	if (covers(["picked", "consumed"])) return "ready_to_load";
	if (covers(["reserved", "picked", "consumed"])) return "reserved";
	const hasInboundShortage = required.some((component) => {
		const committed = sumStatus(component, ["reserved", "picked", "consumed"]);
		return (
			committed < Number(component.requiredQty || 0) &&
			Number(component.inboundQty || 0) > 0
		);
	});
	if (hasInboundShortage) return "backordered";
	if (
		required.some(
			(component) =>
				sumStatus(component, ["reserved", "picked", "consumed"]) > 0,
		)
	) {
		return "partially_ready";
	}
	return "inventory_review";
}
