import { createHash } from "node:crypto";

import type { StageApplicability } from "./sales-pipeline";

export const ITEM_MATERIAL_STATUS_VERSION = "item-material-status/v1" as const;

export type ItemMaterialStatusCode =
	| "material_ready"
	| "ready_review_pending"
	| "allocation_approval"
	| "awaiting_inbound"
	| "material_shortage"
	| "setup_needed"
	| "material_conflict"
	| "status_unknown"
	| "not_required";

export type ItemMaterialStatusTone =
	| "success"
	| "warning"
	| "info"
	| "destructive"
	| "neutral";

export type ItemMaterialComponentEvidence = {
	componentId: number | null;
	name: string;
	unit?: string | null;
	requiredQty: number;
	receivedQty: number;
	committedAllocatedQty: number;
	pendingAllocationQty: number;
	openInboundQty: number;
	readiness:
		| "ready_for_production"
		| "fulfilled"
		| "awaiting_inbound"
		| "allocation_review"
		| "blocked"
		| "unknown";
	eligibilityConflict?: boolean;
	inbounds?: ItemMaterialInboundEvidence[];
};

export type ItemMaterialInboundEvidence = {
	id: number | null;
	status: string;
	expectedAt: Date | string | null;
	supplierName: string | null;
	quantity: number;
};

export type ItemMaterialStatusInput = {
	salesOrderId: number;
	salesItemId: number;
	applicability: StageApplicability;
	evidenceAvailable: boolean;
	reviewPending: boolean;
	components: ItemMaterialComponentEvidence[];
};

export type ItemMaterialQuantityGroup = {
	unit: string;
	required: number;
	received: number;
	committedAllocated: number;
	pendingAllocation: number;
	openInbound: number;
};

export type ItemMaterialBlocker = {
	componentId: number | null;
	componentName: string;
	code:
		| "MATERIAL_CONFLICT"
		| "STATUS_UNKNOWN"
		| "MATERIAL_SHORTAGE"
		| "AWAITING_INBOUND"
		| "ALLOCATION_APPROVAL";
	explanation: string;
};

export type ItemMaterialStatus = {
	version: typeof ITEM_MATERIAL_STATUS_VERSION;
	evidenceRevision: string;
	salesOrderId: number;
	salesItemId: number;
	applicability: StageApplicability;
	code: ItemMaterialStatusCode;
	label: string;
	tone: ItemMaterialStatusTone;
	explanation: string;
	reviewPending: boolean;
	quantityGroups: ItemMaterialQuantityGroup[];
	blockers: ItemMaterialBlocker[];
	inbounds: ItemMaterialInboundEvidence[];
	provenance: {
		evidenceAvailable: boolean;
		eligibilityConflict: boolean;
	};
};

export type ItemMaterialStatusAudience =
	| "internal"
	| "worker"
	| "driver"
	| "dealer"
	| "customer";

const presentations: Record<
	ItemMaterialStatusCode,
	{ label: string; tone: ItemMaterialStatusTone }
> = {
	material_ready: { label: "MATERIAL READY", tone: "success" },
	ready_review_pending: {
		label: "READY · REVIEW PENDING",
		tone: "warning",
	},
	allocation_approval: { label: "ALLOCATION APPROVAL", tone: "warning" },
	awaiting_inbound: { label: "AWAITING INBOUND", tone: "info" },
	material_shortage: { label: "MATERIAL SHORTAGE", tone: "destructive" },
	setup_needed: { label: "SETUP NEEDED", tone: "destructive" },
	material_conflict: { label: "MATERIAL CONFLICT", tone: "destructive" },
	status_unknown: { label: "STATUS UNKNOWN", tone: "warning" },
	not_required: { label: "NOT REQUIRED", tone: "neutral" },
};

export function getItemMaterialStatusPresentation(
	code: ItemMaterialStatusCode,
) {
	return { code, ...presentations[code] };
}

export function projectItemMaterialStatusForAudience(
	status: ItemMaterialStatus,
	audience: ItemMaterialStatusAudience,
) {
	if (audience !== "dealer" && audience !== "customer") return status;

	if (status.code === "material_ready") {
		return {
			code: "ready" as const,
			label: "Materials ready",
			tone: "success" as const,
		};
	}
	if (status.code === "not_required") {
		return {
			code: "not_required" as const,
			label: "No tracked materials",
			tone: "neutral" as const,
		};
	}
	if (status.code === "awaiting_inbound") {
		return {
			code: "in_progress" as const,
			label: "Materials in progress",
			tone: "info" as const,
		};
	}
	return {
		code: "pending" as const,
		label: "Materials pending",
		tone: "warning" as const,
	};
}

function quantity(value: number) {
	return Math.max(0, Number.isFinite(value) ? value : 0);
}

function displayQuantity(value: number) {
	return Number.isInteger(value)
		? String(value)
		: String(Number(value.toFixed(2)));
}

function componentCode(
	component: ItemMaterialComponentEvidence,
): ItemMaterialStatusCode {
	if (component.eligibilityConflict) return "material_conflict";
	if (component.readiness === "unknown") return "status_unknown";
	if (component.readiness === "blocked") return "material_shortage";
	if (
		component.readiness === "awaiting_inbound" ||
		(component.openInboundQty > 0 &&
			Math.max(component.receivedQty, component.committedAllocatedQty) <
				component.requiredQty)
	) {
		return "awaiting_inbound";
	}
	if (
		component.readiness === "allocation_review" ||
		component.pendingAllocationQty > 0
	) {
		return "allocation_approval";
	}
	if (
		component.readiness === "ready_for_production" ||
		component.readiness === "fulfilled"
	) {
		return "material_ready";
	}
	return "material_shortage";
}

const precedence: ItemMaterialStatusCode[] = [
	"material_conflict",
	"status_unknown",
	"setup_needed",
	"material_shortage",
	"awaiting_inbound",
	"allocation_approval",
	"ready_review_pending",
	"material_ready",
	"not_required",
];

export function getDominantItemMaterialStatusCode(
	codes: ItemMaterialStatusCode[],
) {
	return (
		precedence.find((candidate) => codes.includes(candidate)) ||
		"status_unknown"
	);
}

function aggregateCode(input: ItemMaterialStatusInput) {
	if (
		input.applicability === "conflict" ||
		input.components.some((component) => component.eligibilityConflict)
	) {
		return "material_conflict" as const;
	}
	if (!input.evidenceAvailable || input.applicability === "unknown") {
		return "status_unknown" as const;
	}
	if (input.applicability === "not_required" && input.components.length === 0) {
		return "not_required" as const;
	}
	if (input.components.length === 0) return "setup_needed" as const;

	const codes = input.components.map(componentCode);
	const code = getDominantItemMaterialStatusCode(codes);
	if (code === "material_ready" && input.reviewPending) {
		return "ready_review_pending" as const;
	}
	return code;
}

function quantityGroups(components: ItemMaterialComponentEvidence[]) {
	const groups = new Map<string, ItemMaterialQuantityGroup>();
	for (const component of components) {
		const unit = component.unit?.trim() || "unit";
		const current = groups.get(unit) || {
			unit,
			required: 0,
			received: 0,
			committedAllocated: 0,
			pendingAllocation: 0,
			openInbound: 0,
		};
		current.required += quantity(component.requiredQty);
		current.received += quantity(component.receivedQty);
		current.committedAllocated += quantity(component.committedAllocatedQty);
		current.pendingAllocation += quantity(component.pendingAllocationQty);
		current.openInbound += quantity(component.openInboundQty);
		groups.set(unit, current);
	}
	return [...groups.values()].sort((left, right) =>
		left.unit.localeCompare(right.unit),
	);
}

function componentExplanation(
	code: ItemMaterialStatusCode,
	component: ItemMaterialComponentEvidence,
) {
	const required = quantity(component.requiredQty);
	const received = quantity(component.receivedQty);
	const openInbound = quantity(component.openInboundQty);
	const confirmedCoverage = Math.max(
		received,
		quantity(component.committedAllocatedQty),
	);
	const shortage = Math.max(0, required - confirmedCoverage - openInbound);
	if (code === "material_conflict") {
		return "This item has production work, but its inventory production classification disagrees.";
	}
	if (code === "status_unknown") {
		return "Material status could not be verified. No readiness claim is made.";
	}
	if (code === "allocation_approval") {
		return `${displayQuantity(received)} of ${displayQuantity(required)} received; allocation approval is still required.`;
	}
	if (code === "awaiting_inbound") {
		return `${displayQuantity(openInbound)} remaining on inbound; ${displayQuantity(received)} of ${displayQuantity(required)} received.`;
	}
	if (code === "material_shortage") {
		return `${displayQuantity(shortage || required)} of ${displayQuantity(required)} still has no confirmed coverage.`;
	}
	return "All required material is approved for this item.";
}

function explanation(
	code: ItemMaterialStatusCode,
	components: ItemMaterialComponentEvidence[],
) {
	if (code === "setup_needed") {
		return "No current material configuration can be matched to this production item.";
	}
	if (code === "not_required") {
		return "This item does not require tracked production material.";
	}
	if (code === "ready_review_pending") {
		return "Material is ready; the saved production submission still needs review finalization.";
	}
	if (code === "material_ready") {
		return "All required material is approved for this item.";
	}
	const component = components.find(
		(candidate) => componentCode(candidate) === code,
	);
	return component
		? componentExplanation(code, component)
		: code === "material_conflict"
			? "This item has production work, but its inventory production classification disagrees."
			: "Material status could not be verified. No readiness claim is made.";
}

function blockerFor(component: ItemMaterialComponentEvidence) {
	const code = componentCode(component);
	const blockerCode: ItemMaterialBlocker["code"] | null =
		code === "material_conflict"
			? "MATERIAL_CONFLICT"
			: code === "status_unknown"
				? "STATUS_UNKNOWN"
				: code === "material_shortage"
					? "MATERIAL_SHORTAGE"
					: code === "awaiting_inbound"
						? "AWAITING_INBOUND"
						: code === "allocation_approval"
							? "ALLOCATION_APPROVAL"
							: null;
	return blockerCode
		? {
				componentId: component.componentId,
				componentName: component.name,
				code: blockerCode,
				explanation: componentExplanation(code, component),
			}
		: null;
}

function itemInboundEvidence(
	components: Array<
		ItemMaterialComponentEvidence & { inbounds: ItemMaterialInboundEvidence[] }
	>,
) {
	const dateKey = (value: Date | string | null) => {
		if (!value) return "undated";
		const parsed = new Date(value);
		return Number.isFinite(parsed.getTime())
			? parsed.toISOString().slice(0, 10)
			: String(value);
	};
	const unique = new Map<string, ItemMaterialInboundEvidence>();
	for (const inbound of components.flatMap((component) => component.inbounds)) {
		const key =
			inbound.id == null
				? [inbound.status, inbound.expectedAt, inbound.supplierName].join(":")
				: `id:${inbound.id}`;
		const current = unique.get(key);
		unique.set(
			key,
			current
				? { ...current, quantity: Math.max(current.quantity, inbound.quantity) }
				: inbound,
		);
	}
	const grouped = new Map<string, ItemMaterialInboundEvidence>();
	for (const inbound of unique.values()) {
		const key = [
			inbound.status,
			dateKey(inbound.expectedAt),
			inbound.supplierName,
		].join(":");
		const current = grouped.get(key);
		grouped.set(
			key,
			current
				? { ...current, quantity: current.quantity + inbound.quantity }
				: inbound,
		);
	}

	let remaining = components.reduce(
		(total, component) => total + component.openInboundQty,
		0,
	);
	return [...grouped.values()].flatMap((inbound) => {
		const displayedQuantity = Math.min(inbound.quantity, remaining);
		remaining -= displayedQuantity;
		return displayedQuantity > 0
			? [{ ...inbound, quantity: displayedQuantity }]
			: [];
	});
}

export function resolveItemMaterialStatus(
	input: ItemMaterialStatusInput,
): ItemMaterialStatus {
	const normalizedComponents = input.components
		.map((component) => ({
			...component,
			unit: component.unit?.trim() || null,
			requiredQty: quantity(component.requiredQty),
			receivedQty: quantity(component.receivedQty),
			committedAllocatedQty: quantity(component.committedAllocatedQty),
			pendingAllocationQty: quantity(component.pendingAllocationQty),
			openInboundQty: quantity(component.openInboundQty),
			inbounds: (component.inbounds || [])
				.map((inbound) => ({
					...inbound,
					status: inbound.status.trim() || "pending",
					supplierName: inbound.supplierName?.trim() || null,
					quantity: quantity(inbound.quantity),
				}))
				.filter((inbound) => inbound.quantity > 0)
				.sort(
					(left, right) =>
						new Date(left.expectedAt || 0).getTime() -
							new Date(right.expectedAt || 0).getTime() ||
						(left.id ?? 0) - (right.id ?? 0),
				),
		}))
		.sort(
			(left, right) =>
				(left.componentId ?? 0) - (right.componentId ?? 0) ||
				left.name.localeCompare(right.name),
		);
	const code = aggregateCode({ ...input, components: normalizedComponents });
	const presentation = presentations[code];
	const revisionPayload = {
		version: ITEM_MATERIAL_STATUS_VERSION,
		salesOrderId: input.salesOrderId,
		salesItemId: input.salesItemId,
		applicability: input.applicability,
		evidenceAvailable: input.evidenceAvailable,
		reviewPending: input.reviewPending,
		components: normalizedComponents,
	};

	return {
		version: ITEM_MATERIAL_STATUS_VERSION,
		evidenceRevision: createHash("sha256")
			.update(JSON.stringify(revisionPayload))
			.digest("hex"),
		salesOrderId: input.salesOrderId,
		salesItemId: input.salesItemId,
		applicability: input.applicability,
		code,
		...presentation,
		explanation: explanation(code, normalizedComponents),
		reviewPending: input.reviewPending,
		quantityGroups: quantityGroups(normalizedComponents),
		blockers: normalizedComponents.flatMap((component) => {
			const blocker = blockerFor(component);
			return blocker ? [blocker] : [];
		}),
		inbounds: itemInboundEvidence(normalizedComponents),
		provenance: {
			evidenceAvailable: input.evidenceAvailable,
			eligibilityConflict:
				input.applicability === "conflict" ||
				normalizedComponents.some((component) => component.eligibilityConflict),
		},
	};
}
