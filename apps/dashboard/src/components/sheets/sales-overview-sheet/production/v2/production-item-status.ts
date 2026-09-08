export type ProductionItemStatusBadgeVariant =
	| "default"
	| "outline"
	| "secondary"
	| "success";

export function shouldShowProductionMaterialBadge({
	code,
	reported = 0,
	completed = 0,
	fulfilled = 0,
}: {
	code?: string | null;
	reported?: number | null;
	completed?: number;
	fulfilled?: number;
}) {
	if (!code || code === "ready_review_pending") return false;
	const hasSubmission = [reported, completed, fulfilled].some(
		(quantity) =>
			typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0,
	);
	return code !== "material_ready" || !hasSubmission;
}

export type ProductionItemStatusBadge = {
	label: string;
	variant: ProductionItemStatusBadgeVariant;
};

export type ProductionItemStatus = {
	assignmentCount: number;
	assigned: number;
	fulfilled: number;
	shippable: boolean;
	staffedAssignmentCount: number;
	submitted: number;
	reported?: number;
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
	assignmentCount,
	assigned,
	fulfilled,
	shippable,
	staffedAssignmentCount,
	submitted,
	reported = submitted,
	total,
}: ProductionItemStatus): ProductionItemStatusBadge[] {
	if (!Number.isFinite(total) || total <= 0) return [];
	const normalize = (value: number) =>
		Math.min(total, Math.max(0, Number.isFinite(value) ? value : 0));
	assigned = normalize(assigned);
	submitted = normalize(submitted);
	reported = Math.max(submitted, normalize(reported));
	fulfilled = normalize(fulfilled);
	const pending = reported > submitted;

	const badges: ProductionItemStatusBadge[] = [];

	if (reported < total && assigned <= 0) {
		badges.push({ label: "NOT ASSIGNED", variant: "outline" });
	} else if (
		assignmentCount > 0 &&
		staffedAssignmentCount < assignmentCount &&
		reported < total
	) {
		badges.push({
			label:
				staffedAssignmentCount > 0
					? `${staffedAssignmentCount} OF ${assignmentCount} STAFFED`
					: "WORKER NOT ASSIGNED",
			variant: "outline",
		});
	} else if (reported < total && assigned < total) {
		badges.push({
			label: `${assigned} OF ${total} ASSIGNED`,
			variant: "secondary",
		});
	} else if (reported <= 0) {
		badges.push({ label: "ASSIGNED", variant: "success" });
	}

	if (pending) {
		badges.push({
			label:
				reported >= total
					? "COMPLETED · REVIEW PENDING"
					: `${reported} OF ${total} SUBMITTED · REVIEW PENDING`,
			variant: "secondary",
		});
	} else if (submitted > 0 && submitted < total) {
		badges.push({
			label: `${submitted} OF ${total} COMPLETED`,
			variant: "secondary",
		});
	} else if (submitted >= total && fulfilled <= 0) {
		badges.push({ label: "PRODUCTION COMPLETED", variant: "success" });
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
