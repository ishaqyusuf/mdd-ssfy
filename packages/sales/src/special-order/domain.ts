import type { SpecialOrderReleaseAudience } from "@gnd/settings";

export const SPECIAL_ORDER_DECLARATIONS = ["NO", "YES"] as const;

export type SpecialOrderDeclaration =
	(typeof SPECIAL_ORDER_DECLARATIONS)[number];

export type { SpecialOrderReleaseAudience } from "@gnd/settings";

export function canEnrollSpecialOrder(input: {
	releaseAudience: SpecialOrderReleaseAudience;
	actorIsActive: boolean;
	roleNames?: Array<string | null | undefined>;
}) {
	if (!input.actorIsActive) return false;
	if (input.releaseAudience === "ALL_STAFF") return true;
	return (input.roleNames ?? []).some(
		(roleName) => roleName?.trim().toLowerCase() === "super admin",
	);
}

export function validateSpecialOrderEnrollment(input: {
	currentDeclaration?: SpecialOrderDeclaration | null;
	nextDeclaration?: SpecialOrderDeclaration | null;
	canEnroll: boolean;
}) {
	const enrollmentRequested =
		input.currentDeclaration !== "YES" && input.nextDeclaration === "YES";
	const allowed = !enrollmentRequested || input.canEnroll;
	return {
		allowed,
		enrollmentRequested,
		code: allowed ? null : "SPECIAL_ORDER_ENROLLMENT_RESTRICTED",
	} as const;
}

export const SPECIAL_ORDER_STATUSES = [
	"NOT_REQUIRED",
	"SIGNATURE_PENDING",
	"CUSTOMER_APPROVED",
	"REAPPROVAL_REQUIRED",
	"CUSTOMER_DECLINED",
] as const;

export type SpecialOrderStatus = (typeof SPECIAL_ORDER_STATUSES)[number];

export const SPECIAL_ORDER_STATUS_LABELS = {
	NOT_REQUIRED: "Not required",
	SIGNATURE_PENDING: "Signature pending",
	CUSTOMER_APPROVED: "Customer approved",
	REAPPROVAL_REQUIRED: "Reapproval required",
	CUSTOMER_DECLINED: "Customer declined",
} satisfies Record<SpecialOrderStatus, string>;

export const INITIAL_SPECIAL_ORDER_POLICY = {
	title: "Special Order — Non-Returnable",
	acknowledgmentText:
		"I have reviewed the complete order and confirm that all Special Order items and specifications are correct.",
	policyText:
		"This order contains special, custom, or non-returnable items. These items are non-returnable and non-refundable. Review the complete order, including sizes, styles, quantities, handing, glass, bore, frame or jamb, finish, hardware, pricing, and all custom specifications before approving.",
} as const;

export type SpecialOrderState = {
	declaration?: SpecialOrderDeclaration | null;
	status?: SpecialOrderStatus | null;
	revision?: string | null;
	currentApprovalId?: string | null;
};

export type SpecialOrderDisplayState =
	| "LEGACY_NOT_EVALUATED"
	| SpecialOrderStatus;

export function resolveSpecialOrderDisplayState(
	state?: SpecialOrderState | null,
): SpecialOrderDisplayState {
	if (!state?.declaration) return "LEGACY_NOT_EVALUATED";
	if (state.declaration === "NO") return "NOT_REQUIRED";
	return state.status ?? "SIGNATURE_PENDING";
}

export function getSpecialOrderStatusLabel(
	state?: SpecialOrderState | null,
): string {
	const displayState = resolveSpecialOrderDisplayState(state);
	return displayState === "LEGACY_NOT_EVALUATED"
		? "Not evaluated"
		: SPECIAL_ORDER_STATUS_LABELS[displayState];
}

export function deriveSpecialOrderStatus(input: {
	declaration?: SpecialOrderDeclaration | null;
	currentApprovalId?: string | null;
	currentStatus?: SpecialOrderStatus | null;
}): SpecialOrderStatus | null {
	if (!input.declaration) return null;
	if (input.declaration === "NO") return "NOT_REQUIRED";
	if (input.currentApprovalId) return "CUSTOMER_APPROVED";
	if (
		input.currentStatus === "REAPPROVAL_REQUIRED" ||
		input.currentStatus === "CUSTOMER_DECLINED"
	) {
		return input.currentStatus;
	}
	return "SIGNATURE_PENDING";
}

export function deriveSpecialOrderRevisionTransition(input: {
	declaration?: SpecialOrderDeclaration | null;
	currentRevision?: string | null;
	nextRevision?: string | null;
	currentApprovalId?: string | null;
	currentStatus?: SpecialOrderStatus | null;
}) {
	const revisionChanged =
		input.declaration === "YES" &&
		Boolean(input.currentRevision) &&
		input.currentRevision !== input.nextRevision;
	const hadCustomerEvidence =
		Boolean(input.currentApprovalId) ||
		input.currentStatus === "CUSTOMER_DECLINED";
	const nextApprovalId =
		input.declaration === "YES" &&
		input.currentRevision === input.nextRevision
			? (input.currentApprovalId ?? null)
			: null;
	const nextStatus =
		revisionChanged && hadCustomerEvidence
			? "REAPPROVAL_REQUIRED"
			: deriveSpecialOrderStatus({
					declaration: input.declaration,
					currentApprovalId: nextApprovalId,
					currentStatus: revisionChanged ? null : input.currentStatus,
				});

	return {
		hadCustomerEvidence,
		nextApprovalId,
		nextStatus,
		revisionChanged,
	};
}

export const SPECIAL_ORDER_COMMIT_INTENTS = [
	"autosave",
	"draft",
	"close",
	"new",
	"final",
] as const;

export type SpecialOrderCommitIntent =
	(typeof SPECIAL_ORDER_COMMIT_INTENTS)[number];

export function hasSpecialOrderCustomerEmail(
	email?: string | null,
): email is string {
	const value = email?.trim() || "";
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function requiresSpecialOrderCustomerEmail(input: {
	declaration?: SpecialOrderDeclaration | null;
	customerEmail?: string | null;
	commitIntent?: SpecialOrderCommitIntent;
}) {
	return (
		input.declaration === "YES" &&
		input.commitIntent !== "autosave" &&
		!hasSpecialOrderCustomerEmail(input.customerEmail)
	);
}

export function requiresSpecialOrderDeclaration(input: {
	type: "order" | "quote";
	commitIntent: SpecialOrderCommitIntent;
	isInternalDashboardOrder?: boolean;
	canEnroll?: boolean;
}) {
	return (
		input.type === "order" &&
		input.isInternalDashboardOrder !== false &&
		input.canEnroll !== false &&
		["close", "new", "final"].includes(input.commitIntent)
	);
}

export function validateSpecialOrderDeclaration(input: {
	type: "order" | "quote";
	commitIntent: SpecialOrderCommitIntent;
	declaration?: SpecialOrderDeclaration | null;
	isInternalDashboardOrder?: boolean;
	canEnroll?: boolean;
}) {
	const required = requiresSpecialOrderDeclaration(input);
	return {
		valid: !required || Boolean(input.declaration),
		required,
		code:
			required && !input.declaration
				? "SPECIAL_ORDER_DECLARATION_REQUIRED"
				: null,
	};
}

function canonicalizeRevisionValue(value: unknown): unknown {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value.toISOString();
	}
	if (Array.isArray(value)) {
		const canonical = value.map(canonicalizeRevisionValue);
		const identified = canonical.map((child) => ({
			child,
			identity: revisionArrayIdentity(child),
		}));
		return identified.every((entry) => entry.identity !== null)
			? [...identified]
					.sort((left, right) =>
						(left.identity ?? "").localeCompare(right.identity ?? ""),
					)
					.map((entry) => entry.child)
			: canonical;
	}
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>)
				.filter(([, child]) => child !== undefined)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, child]) => [key, canonicalizeRevisionValue(child)]),
		);
	}
	if (typeof value === "number") {
		return Number.isFinite(value) ? Number(value.toFixed(4)) : null;
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed || null;
	}
	return value ?? null;
}

const REVISION_ARRAY_IDENTITY_KEYS = [
	"uid",
	"id",
	"stepUid",
	"componentUid",
	"itemUid",
	"lineUid",
	"salesItemId",
	"type",
] as const;

function revisionArrayIdentity(value: unknown): string | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const record = value as Record<string, unknown>;
	for (const key of REVISION_ARRAY_IDENTITY_KEYS) {
		const identity = record[key];
		if (typeof identity === "string" && identity.trim()) {
			return `${key}:${identity.trim()}`;
		}
		if (typeof identity === "number" && Number.isFinite(identity)) {
			return `${key}:${identity}`;
		}
	}
	return null;
}

export function buildSpecialOrderApprovalRevision(projection: unknown) {
	const canonical = JSON.stringify(canonicalizeRevisionValue(projection));
	return createHash("sha256").update(canonical).digest("hex");
}

function selectRevisionFields(
	value: unknown,
	keys: readonly string[],
): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	const source = value as Record<string, unknown>;
	return Object.fromEntries(
		keys
			.filter((key) => source[key] !== undefined)
			.map((key) => [key, source[key]]),
	);
}

const CUSTOMER_VISIBLE_ROW_FIELDS = [
	"id",
	"uid",
	"title",
	"description",
	"service",
	"dimension",
	"swing",
	"doorType",
	"qty",
	"lhQty",
	"rhQty",
	"totalQty",
	"unitPrice",
	"doorPrice",
	"jambSizePrice",
	"casingPrice",
	"lineTotal",
	"totalPrice",
	"taxxable",
] as const;

function projectRevisionRows(value: unknown) {
	return Array.isArray(value)
		? value.map((row) => selectRevisionFields(row, CUSTOMER_VISIBLE_ROW_FIELDS))
		: [];
}

export function buildSpecialOrderCustomerVisibleRevision(input: {
	customer: unknown;
	customerProfile: unknown;
	billingAddress: unknown;
	shippingAddress: unknown;
	orderDate: unknown;
	lineItems: unknown[];
	extraCosts: unknown[];
	summary: unknown;
}) {
	const lineItems = input.lineItems.map((value) => {
		const line = selectRevisionFields(value, [
			...CUSTOMER_VISIBLE_ROW_FIELDS,
			"formSteps",
			"shelfItems",
			"housePackageTool",
			"meta",
		]);
		const meta = selectRevisionFields(line.meta, ["serviceRows", "mouldingRows"]);
		const housePackage = selectRevisionFields(line.housePackageTool, [
			"id",
			"height",
			"doorType",
			"totalPrice",
			"totalDoors",
			"molding",
			"doors",
		]);
		return {
			...selectRevisionFields(line, CUSTOMER_VISIBLE_ROW_FIELDS),
			formSteps: Array.isArray(line.formSteps)
				? line.formSteps.map((step) => {
						const projected = selectRevisionFields(step, [
							"id",
							"stepId",
							"componentId",
							"prodUid",
							"value",
							"qty",
							"price",
							"basePrice",
							"step",
						]);
						return {
							...projected,
							step: selectRevisionFields(projected.step, ["id", "uid", "title"]),
						};
					})
				: [],
			shelfItems: projectRevisionRows(line.shelfItems),
			housePackageTool: Object.keys(housePackage).length
				? {
						...housePackage,
						molding: selectRevisionFields(housePackage.molding, [
							"id",
							"uid",
							"title",
							"value",
							"price",
						]),
						doors: projectRevisionRows(housePackage.doors),
					}
				: null,
			serviceRows: projectRevisionRows(meta.serviceRows),
			mouldingRows: projectRevisionRows(meta.mouldingRows),
		};
	});
	return buildSpecialOrderApprovalRevision({
		customer: input.customer,
		customerProfile: input.customerProfile,
		billingAddress: input.billingAddress,
		shippingAddress: input.shippingAddress,
		orderDate: input.orderDate,
		lineItems,
		extraCosts: input.extraCosts.map((cost) =>
			selectRevisionFields(cost, ["id", "type", "label", "name", "amount", "taxxable"]),
		),
		summary: selectRevisionFields(input.summary, [
			"subTotal",
			"adjustedSubTotal",
			"taxRate",
			"taxTotal",
			"grandTotal",
			"totalWithCcc",
			"discount",
			"discountPct",
			"percentDiscountValue",
			"labor",
			"delivery",
			"otherCosts",
			"taxableSubTotal",
			"ccc",
		]),
	});
}

export const SPECIAL_ORDER_OPERATION_CATEGORIES = [
	"PURCHASING",
	"PRODUCTION",
	"PACKING",
	"DISPATCH",
] as const;

export type SpecialOrderOperationCategory =
	(typeof SPECIAL_ORDER_OPERATION_CATEGORIES)[number];
export type SpecialOrderEnforcementMode =
	| "WARNING_ONLY"
	| "BLOCK_PURCHASING_AND_PRODUCTION"
	| "BLOCK_ALL_OPERATIONS";

export function evaluateSpecialOrderOperation(input: {
	declaration?: SpecialOrderDeclaration | null;
	status?: SpecialOrderStatus | null;
	enforcementMode: SpecialOrderEnforcementMode;
	operation: SpecialOrderOperationCategory;
}) {
	const governed = input.declaration === "YES";
	const approved = input.status === "CUSTOMER_APPROVED";
	const approvalRequired = governed && !approved;
	const blocksPurchasingOrProduction =
		input.enforcementMode === "BLOCK_PURCHASING_AND_PRODUCTION" &&
		(input.operation === "PURCHASING" || input.operation === "PRODUCTION");
	const blocksAll = input.enforcementMode === "BLOCK_ALL_OPERATIONS";
	const blocked =
		approvalRequired && (blocksPurchasingOrProduction || blocksAll);
	return {
		allowed: !blocked,
		blocked,
		warning: approvalRequired && !blocked,
		approvalRequired,
		code: blocked ? "SPECIAL_ORDER_APPROVAL_REQUIRED" : null,
	};
}
import { createHash } from "node:crypto";
