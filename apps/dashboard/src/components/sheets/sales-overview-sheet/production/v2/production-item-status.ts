export type ProductionItemStatusBadgeVariant =
	| "default"
	| "outline"
	| "secondary"
	| "success";

export type ProductionItemStatusBadge = {
	label: string;
	variant: ProductionItemStatusBadgeVariant;
};

export type ProductionItemStatus = {
	assigned: number;
	fulfilled: number;
	shippable: boolean;
	submitted: number;
	total: number;
};

type QuantityMatrix = {
	lh?: number | null;
	qty?: number | null;
	rh?: number | null;
};

export function getQuantityMatrixTotal(quantity?: QuantityMatrix | null) {
	const qty = Number(quantity?.qty || 0);

	return qty || Number(quantity?.lh || 0) + Number(quantity?.rh || 0);
}

export function getProductionItemStatusBadges({
	assigned,
	fulfilled,
	shippable,
	submitted,
	total,
}: ProductionItemStatus): ProductionItemStatusBadge[] {
	if (total <= 0) return [];

	const badges: ProductionItemStatusBadge[] = [];

	if (assigned <= 0) {
		badges.push({ label: "NOT ASSIGNED", variant: "outline" });
	} else if (assigned < total) {
		badges.push({
			label: `${assigned} OF ${total} ASSIGNED`,
			variant: "secondary",
		});
	} else if (submitted <= 0) {
		badges.push({ label: "ASSIGNED", variant: "success" });
	}

	if (submitted > 0 && submitted < total) {
		badges.push({
			label: `${submitted} OF ${total} SUBMITTED`,
			variant: "secondary",
		});
	} else if (submitted >= total && !shippable) {
		badges.push({ label: "PRODUCTION COMPLETED", variant: "success" });
	} else if (submitted >= total && fulfilled <= 0) {
		badges.push({ label: "READY TO FULFILL", variant: "default" });
	}

	if (shippable && fulfilled > 0 && fulfilled < total) {
		badges.push({
			label: `${fulfilled} OF ${total} FULFILLED`,
			variant: "secondary",
		});
	} else if (shippable && fulfilled >= total) {
		badges.push({ label: "FULFILLED", variant: "success" });
	}

	return badges;
}
