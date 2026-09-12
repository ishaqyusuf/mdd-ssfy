import type {
	InitializedNewSalesFormSeed,
	NewSalesFormSeedBaseRecord,
	NewSalesFormSeedInitializationIssue,
} from "../application/new-sales-form-seed-initializer";
import type { NewSalesFormSeed } from "../contracts/new-sales-form-seed";

export const LOW_TOUCH_DRAFT_COMMAND_POLICY = {
	prepareNativeDraft: true,
	previewInvoice: true,
	finalSave: "explicit-human-command",
	sendInvoice: "explicit-human-command",
	capturePayment: "explicit-human-command",
	allocateInventory: "explicit-human-command",
	productionAction: "explicit-human-command",
} as const;

export type SalesRequestLowTouchCommercialCurrency = {
	configuration: boolean;
	providerBenchmark: boolean;
	catalog: boolean;
	customer: boolean;
	customerProfile: boolean;
	prices: boolean;
	taxes: boolean;
	delivery: boolean;
	discounts: boolean;
	stock: boolean;
	permissions: boolean;
};

export type SalesRequestLowTouchIneligibilityCode =
	| "source-not-supported"
	| "unresolved-facts"
	| "custom-value"
	| "initializer-issue"
	| "unpriced-component"
	| "shelf-items-not-supported"
	| "customer-required"
	| "configuration-stale"
	| "provider-not-proven"
	| "catalog-stale"
	| "customer-stale"
	| "customer-profile-stale"
	| "prices-stale"
	| "taxes-stale"
	| "delivery-stale"
	| "discounts-stale"
	| "stock-stale"
	| "permissions-stale";

export type SalesRequestLowTouchIneligibilityReason = {
	code: SalesRequestLowTouchIneligibilityCode;
};

export type SalesRequestLowTouchDraftEligibilityInput = {
	source: "pasted-text";
	seed: NewSalesFormSeed;
	initialized: InitializedNewSalesFormSeed<NewSalesFormSeedBaseRecord>;
	current: SalesRequestLowTouchCommercialCurrency;
};

const PRICE_ISSUES = new Set<NewSalesFormSeedInitializationIssue["reason"]>([
	"component-price-missing",
	"service-price-missing",
	"delivery-price-missing",
	"hpt-door-price-missing",
]);

const CUSTOM_ISSUES = new Set<NewSalesFormSeedInitializationIssue["reason"]>([
	"custom-step-not-supported",
	"custom-value-requires-review",
]);

function objectValue(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function hasCustomSeedValue(seed: NewSalesFormSeed) {
	return seed.lineItems.some((line) =>
		line.formSteps.some((step) => "value" in step),
	);
}

function selectedComponents(step: unknown) {
	const meta = objectValue(objectValue(step).meta);
	return Array.isArray(meta.selectedComponents) ? meta.selectedComponents : [];
}

function isCustomComponent(component: unknown) {
	const value = objectValue(component);
	const meta = objectValue(value._metaData);
	return (
		value.custom === true ||
		meta.custom === true ||
		String(value.uid || "").startsWith("custom-preview:")
	);
}

function componentPriceMissing(component: unknown) {
	return objectValue(objectValue(component)._metaData).priceMissing === true;
}

function recordHasCustomComponent(
	initialized: SalesRequestLowTouchDraftEligibilityInput["initialized"],
) {
	return initialized.record.lineItems.some((line) =>
		(line.formSteps || []).some((step) =>
			selectedComponents(step).some(isCustomComponent),
		),
	);
}

function recordHasMissingPrice(
	initialized: SalesRequestLowTouchDraftEligibilityInput["initialized"],
) {
	return initialized.record.lineItems.some((line) => {
		const selectedPriceMissing = (line.formSteps || []).some((step) =>
			selectedComponents(step).some(componentPriceMissing),
		);
		const doors = line.housePackageTool?.doors || [];
		const doorPriceMissing = doors.some(
			(door) => objectValue(door.meta).priceMissing === true,
		);
		return selectedPriceMissing || doorPriceMissing;
	});
}

function recordHasShelfItems(
	initialized: SalesRequestLowTouchDraftEligibilityInput["initialized"],
) {
	return initialized.record.lineItems.some(
		(line) => (line.shelfItems?.length || 0) > 0,
	);
}

const COMMERCIAL_REASON_ORDER = [
	["configuration", "configuration-stale"],
	["providerBenchmark", "provider-not-proven"],
	["catalog", "catalog-stale"],
	["customer", "customer-stale"],
	["customerProfile", "customer-profile-stale"],
	["prices", "prices-stale"],
	["taxes", "taxes-stale"],
	["delivery", "delivery-stale"],
	["discounts", "discounts-stale"],
	["stock", "stock-stale"],
	["permissions", "permissions-stale"],
] as const satisfies ReadonlyArray<
	readonly [
		keyof SalesRequestLowTouchCommercialCurrency,
		SalesRequestLowTouchIneligibilityCode,
	]
>;

/**
 * Evaluates whether an already reviewed proposal may enter the native, unsaved
 * draft/preview path. It never authorizes final save or any downstream command.
 */
export function evaluateSalesRequestLowTouchDraftEligibility(
	input: SalesRequestLowTouchDraftEligibilityInput,
) {
	if (input.source !== "pasted-text") {
		return {
			eligible: false,
			reasons: [{ code: "source-not-supported" as const }],
		};
	}

	const reasonCodes: SalesRequestLowTouchIneligibilityCode[] = [];
	const add = (code: SalesRequestLowTouchIneligibilityCode) => {
		if (!reasonCodes.includes(code)) reasonCodes.push(code);
	};
	const issues = input.initialized.issues;

	if (input.seed.unresolved.length || input.initialized.unresolved.length) {
		add("unresolved-facts");
	}
	if (
		hasCustomSeedValue(input.seed) ||
		issues.some((issue) => CUSTOM_ISSUES.has(issue.reason)) ||
		recordHasCustomComponent(input.initialized)
	) {
		add("custom-value");
	}
	if (
		issues.some(
			(issue) =>
				!PRICE_ISSUES.has(issue.reason) && !CUSTOM_ISSUES.has(issue.reason),
		)
	) {
		add("initializer-issue");
	}
	if (
		issues.some((issue) => PRICE_ISSUES.has(issue.reason)) ||
		recordHasMissingPrice(input.initialized)
	) {
		add("unpriced-component");
	}
	if (recordHasShelfItems(input.initialized)) {
		add("shelf-items-not-supported");
	}
	if (!input.initialized.record.form?.customerId) {
		add("customer-required");
	}
	for (const [fact, code] of COMMERCIAL_REASON_ORDER) {
		if (!input.current[fact]) add(code);
	}

	return {
		eligible: reasonCodes.length === 0,
		reasons: reasonCodes.map((code) => ({ code })),
	};
}
