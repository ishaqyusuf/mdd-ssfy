import type {
	SalesFormExtraCostRecord,
	SalesFormLineItemRecord,
	SalesFormSummaryRecord,
} from "../application/record-normalization";

type Identity = number | string | null;

export type SalesRequestFinalSaveCandidate = {
	type?: string | null;
	salesId?: number | null;
	slug?: string | null;
	form: Record<string, unknown>;
	lineItems: SalesFormLineItemRecord[];
	extraCosts: SalesFormExtraCostRecord[];
	summary: SalesFormSummaryRecord;
	[key: string]: unknown;
};

export type SalesRequestFinalSaveAuthoritativeEvidence = {
	configurationScope: string | null;
	configurationRevision: string | null;
	provider: string | null;
	model: string | null;
	providerBenchmark: {
		provider: string;
		model: string;
		passed: boolean;
	} | null;
	customerId: Identity;
	customerProfileId: Identity;
	customerProfileRevision: string | null;
	stock: "known" | "unknown";
	tax: "known" | "unknown";
	permission: {
		allowed: boolean;
		revision: string | null;
	};
};

export type SalesRequestFinalSaveRunEvidence = {
	generated: {
		source: "pasted-text";
		configurationScope: string;
		configurationRevision: string;
		provider: string;
		model: string;
		seedDigest: string;
		unsupportedFactCount: number;
		customValueCount: number;
		unpricedItemCount: number;
	};
	applied: {
		commercialFingerprint: string;
		seedDigest: string;
		customerId: Identity;
		customerProfileId: Identity;
		customerProfileRevision: string;
		permissionRevision: string;
	};
};

export type SalesRequestFinalSavePreflightInput = {
	authoritative: SalesRequestFinalSaveAuthoritativeEvidence;
	run: SalesRequestFinalSaveRunEvidence;
	candidate: SalesRequestFinalSaveCandidate;
};

export type SalesRequestFinalSaveBlocker =
	| { code: "surface-not-supported" }
	| { code: "existing-record" }
	| { code: "unsupported-facts"; count: number }
	| { code: "custom-values"; count: number }
	| { code: "unpriced-items"; count: number }
	| { code: "shelf-items-not-supported" }
	| { code: "services-not-supported" }
	| { code: "delivery-not-supported" }
	| { code: "nonzero-discount" }
	| { code: "stock-unknown" }
	| { code: "tax-unknown" }
	| { code: "provider-benchmark-missing" }
	| {
			code: "configuration-stale";
			generatedScope: string;
			currentScope: string | null;
			generatedRevision: string;
			currentRevision: string | null;
	  }
	| {
			code: "seed-binding-mismatch";
			generatedSeedDigest: string;
			appliedSeedDigest: string;
	  }
	| {
			code: "provider-model-stale";
			generatedProvider: string;
			generatedModel: string;
			currentProvider: string | null;
			currentModel: string | null;
	  }
	| { code: "customer-profile-stale" }
	| { code: "permission-denied-or-stale" }
	| {
			code: "commercial-fingerprint-mismatch";
			expected: string;
			actual: string;
	  };

export type SalesRequestFinalSavePreflightResult = {
	ok: boolean;
	blockers: SalesRequestFinalSaveBlocker[];
	commercialFingerprint: string;
};

function objectValue(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function stringValue(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
	if (value == null || value === "") return null;
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

function booleanValue(value: unknown) {
	return typeof value === "boolean" ? value : null;
}

function taxableValue(value: Record<string, unknown>) {
	return booleanValue(value.taxable) ?? booleanValue(value.taxxable);
}

function stableJson(value: unknown): string {
	if (value === null || typeof value !== "object") {
		return JSON.stringify(value) ?? "null";
	}
	if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
	const record = value as Record<string, unknown>;
	return `{${Object.keys(record)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
		.join(",")}}`;
}

function sortedCanonicalRows<T>(rows: T[]) {
	return rows.sort((left, right) =>
		stableJson(left).localeCompare(stableJson(right)),
	);
}

function selectedComponents(step: Record<string, unknown>) {
	const components = objectValue(step.meta).selectedComponents;
	return Array.isArray(components) ? components.map(objectValue) : [];
}

function selectedProductUids(step: Record<string, unknown>) {
	const explicit = objectValue(step.meta).selectedProdUids;
	const values = Array.isArray(explicit)
		? explicit
		: selectedComponents(step).map((component) => component.uid);
	return [
		...new Set(values.map(stringValue).filter(Boolean) as string[]),
	].sort();
}

function canonicalComponent(component: Record<string, unknown>) {
	const meta = objectValue(component._metaData);
	return {
		id: numberValue(component.id),
		uid: stringValue(component.uid),
		basePrice: numberValue(component.basePrice),
		salesPrice: numberValue(component.salesPrice),
		price: numberValue(component.price),
		unitPrice: numberValue(component.unitPrice),
		addon: numberValue(component.addon),
		overridePrice: numberValue(component.overridePrice),
		priceMissing: meta.priceMissing === true,
		custom: component.custom === true || meta.custom === true,
	};
}

function canonicalSelection(value: unknown) {
	const step = objectValue(value);
	const stepRecord = objectValue(step.step);
	return {
		stepId: numberValue(step.stepId),
		stepUid:
			stringValue(stepRecord.uid) ??
			stringValue(objectValue(step.meta).stepUid),
		componentId: numberValue(step.componentId),
		prodUid: stringValue(step.prodUid),
		selectedProdUids: selectedProductUids(step),
		basePrice: numberValue(step.basePrice),
		price: numberValue(step.price),
		components: sortedCanonicalRows(
			selectedComponents(step).map(canonicalComponent),
		),
	};
}

function canonicalHptDoor(value: unknown) {
	const door = objectValue(value);
	const meta = objectValue(door.meta);
	return {
		dimension: stringValue(door.dimension),
		swing: stringValue(door.swing),
		lhQty: numberValue(door.lhQty),
		rhQty: numberValue(door.rhQty),
		totalQty: numberValue(door.totalQty),
		doorPrice: numberValue(door.doorPrice),
		jambSizePrice: numberValue(door.jambSizePrice),
		casingPrice: numberValue(door.casingPrice),
		unitPrice: numberValue(door.unitPrice),
		lineTotal: numberValue(door.lineTotal),
		stepProductId: numberValue(door.stepProductId),
		componentUid: stringValue(meta.componentUid),
		baseUnitPrice: numberValue(meta.baseUnitPrice),
		doorSalesUnitPrice: numberValue(meta.doorSalesUnitPrice),
		priceMissing: meta.priceMissing === true,
	};
}

function canonicalMouldingRow(value: unknown) {
	const row = objectValue(value);
	const calculation = objectValue(row.calculation);
	return {
		uid: stringValue(row.uid),
		mouldingProductId: numberValue(row.mouldingProductId ?? row.moldingId),
		stepProductId: numberValue(row.stepProductId),
		qty: numberValue(row.qty),
		basePrice: numberValue(row.basePrice),
		salesPrice: numberValue(row.salesPrice),
		price: numberValue(row.price),
		unitPrice: numberValue(row.unitPrice),
		overridePrice: numberValue(row.overridePrice),
		addon: numberValue(row.addon),
		unitLabor: numberValue(row.unitLabor),
		laborQty: numberValue(row.laborQty),
		lineTotal: numberValue(row.lineTotal ?? row.totalPrice),
		taxable: taxableValue(row),
		linearFeet: numberValue(calculation.linearFeet ?? row.linearFeet),
		pieceLength: numberValue(calculation.pieceLength ?? row.pieceLength),
		wastePercentage: numberValue(
			calculation.wastePercentage ?? row.wastePercentage,
		),
		priceMissing: row.priceMissing === true,
	};
}

function canonicalLine(value: SalesFormLineItemRecord) {
	const line = objectValue(value);
	const meta = objectValue(line.meta);
	const hpt = objectValue(line.housePackageTool);
	const doors = Array.isArray(hpt.doors) ? hpt.doors : [];
	const mouldingRows = Array.isArray(meta.mouldingRows)
		? meta.mouldingRows
		: [];
	return {
		uid: stringValue(line.uid),
		qty: numberValue(line.qty),
		unitPrice: numberValue(line.unitPrice),
		lineTotal: numberValue(line.lineTotal),
		taxable: taxableValue(line),
		selections: sortedCanonicalRows(
			(Array.isArray(line.formSteps) ? line.formSteps : []).map(
				canonicalSelection,
			),
		),
		housePackageTool: doors.length
			? {
					totalDoors: numberValue(hpt.totalDoors),
					totalPrice: numberValue(hpt.totalPrice),
					doors: sortedCanonicalRows(doors.map(canonicalHptDoor)),
				}
			: null,
		mouldingRows: sortedCanonicalRows(mouldingRows.map(canonicalMouldingRow)),
	};
}

const SUMMARY_FIELDS = [
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
] as const;

function canonicalCommercialValue(candidate: SalesRequestFinalSaveCandidate) {
	const form = objectValue(candidate.form);
	const summary = objectValue(candidate.summary);
	return {
		type: stringValue(candidate.type),
		form: {
			customerId: numberValue(form.customerId),
			customerProfileId: numberValue(form.customerProfileId),
			billingAddressId: numberValue(form.billingAddressId),
			shippingAddressId: numberValue(form.shippingAddressId),
			deliveryOption: stringValue(form.deliveryOption),
			paymentTerm: stringValue(form.paymentTerm),
			paymentMethod: stringValue(form.paymentMethod),
			taxCode: stringValue(form.taxCode),
			sellerOfRecord: stringValue(form.sellerOfRecord),
			resaleCertificateOnFile: booleanValue(form.resaleCertificateOnFile),
		},
		lineItems: sortedCanonicalRows(candidate.lineItems.map(canonicalLine)),
		extraCosts: sortedCanonicalRows(
			candidate.extraCosts.map((value) => {
				const cost = objectValue(value);
				return {
					uid: stringValue(cost.uid),
					type: stringValue(cost.type),
					amount: numberValue(cost.amount),
					taxable: taxableValue(cost),
				};
			}),
		),
		summary: Object.fromEntries(
			SUMMARY_FIELDS.map((field) => [field, numberValue(summary[field])]),
		),
	};
}

/**
 * Builds the exact, portable canonical value used to bind Apply evidence to a
 * final-save candidate. The prefix versions the projection; the JSON itself is
 * retained instead of using a collision-prone browser-side digest.
 */
export function buildSalesRequestCommercialFingerprint(
	candidate: SalesRequestFinalSaveCandidate,
) {
	return `sales-request-commercial-v1:${stableJson(
		canonicalCommercialValue(candidate),
	)}`;
}

function hasCustomValue(candidate: SalesRequestFinalSaveCandidate) {
	return candidate.lineItems.some((line) =>
		(line.formSteps || []).some((rawStep) =>
			selectedComponents(objectValue(rawStep)).some((component) => {
				const meta = objectValue(component._metaData);
				return (
					component.custom === true ||
					meta.custom === true ||
					String(component.uid || "").startsWith("custom-preview:")
				);
			}),
		),
	);
}

function candidateUnpricedCount(candidate: SalesRequestFinalSaveCandidate) {
	let count = 0;
	for (const line of candidate.lineItems) {
		if (
			[line.qty, line.unitPrice, line.lineTotal].some(
				(value) => value == null || !Number.isFinite(Number(value)),
			)
		) {
			count += 1;
		}
		for (const step of line.formSteps || []) {
			for (const component of selectedComponents(objectValue(step))) {
				if (objectValue(component._metaData).priceMissing === true) count += 1;
			}
		}
		for (const door of Array.isArray(line.housePackageTool?.doors)
			? line.housePackageTool.doors
			: []) {
			if (objectValue(door.meta).priceMissing === true) count += 1;
		}
		const rows = objectValue(line.meta).mouldingRows;
		for (const row of Array.isArray(rows) ? rows : []) {
			if (objectValue(row).priceMissing === true) count += 1;
		}
	}
	return count;
}

function selectedFamilyUids(candidate: SalesRequestFinalSaveCandidate) {
	return candidate.lineItems.flatMap((line) =>
		(line.formSteps || []).flatMap((step) => {
			const value = objectValue(step);
			return [stringValue(value.prodUid), ...selectedProductUids(value)].filter(
				Boolean,
			) as string[];
		}),
	);
}

function hasShelfItems(candidate: SalesRequestFinalSaveCandidate) {
	return (
		candidate.lineItems.some((line) => (line.shelfItems || []).length > 0) ||
		selectedFamilyUids(candidate).some((uid) =>
			["shelf", "shelves", "shelf-item", "shelf-items"].includes(
				uid.toLowerCase(),
			),
		)
	);
}

function hasServices(candidate: SalesRequestFinalSaveCandidate) {
	return (
		candidate.lineItems.some((line) => {
			const rows = objectValue(line.meta).serviceRows;
			return Array.isArray(rows) && rows.length > 0;
		}) ||
		selectedFamilyUids(candidate).some((uid) =>
			["service", "services"].includes(uid.toLowerCase()),
		)
	);
}

function hasDelivery(candidate: SalesRequestFinalSaveCandidate) {
	const summary = objectValue(candidate.summary);
	return (
		String(candidate.form.deliveryOption || "").toLowerCase() === "delivery" ||
		candidate.extraCosts.some(
			(cost) => String(cost.type || "").toLowerCase() === "delivery",
		) ||
		Number(summary.delivery || 0) !== 0
	);
}

function hasNonzeroDiscount(candidate: SalesRequestFinalSaveCandidate) {
	const summary = objectValue(candidate.summary);
	return ["discount", "discountPct", "percentDiscountValue"].some(
		(field) => Number(summary[field] || 0) !== 0,
	);
}

function normalizeIdentity(value: Identity | undefined) {
	return value == null || String(value).trim() === "" ? null : String(value);
}

function sameIdentity(left: Identity | undefined, right: Identity | undefined) {
	return normalizeIdentity(left) === normalizeIdentity(right);
}

function sameRequiredString(left: unknown, right: unknown) {
	const normalizedLeft = stringValue(left);
	return normalizedLeft !== null && normalizedLeft === stringValue(right);
}

function unsupportedCandidateFactCount(
	candidate: SalesRequestFinalSaveCandidate,
) {
	const lineUids = candidate.lineItems.map((line) => stringValue(line.uid));
	return (
		lineUids.filter((uid) => uid === null).length +
		(lineUids.length - new Set(lineUids).size)
	);
}

/**
 * Pure final-save decision core. Callers must resolve every authoritative fact
 * before invoking it; this function performs no reads, writes, or provider calls.
 */
export function evaluateSalesRequestFinalSavePreflight(
	input: SalesRequestFinalSavePreflightInput,
): SalesRequestFinalSavePreflightResult {
	const { authoritative, run, candidate } = input;
	const blockers: SalesRequestFinalSaveBlocker[] = [];
	const fingerprint = buildSalesRequestCommercialFingerprint(candidate);
	if (candidate.type !== "order" && candidate.type !== "quote") {
		blockers.push({ code: "surface-not-supported" });
	}
	if (candidate.salesId != null || stringValue(candidate.slug) !== null) {
		blockers.push({ code: "existing-record" });
	}
	const unsupportedCount =
		Math.max(0, run.generated.unsupportedFactCount) +
		unsupportedCandidateFactCount(candidate) +
		(run.generated.source === "pasted-text" ? 0 : 1);
	if (unsupportedCount > 0) {
		blockers.push({ code: "unsupported-facts", count: unsupportedCount });
	}

	const customCount =
		Math.max(0, run.generated.customValueCount) +
		(hasCustomValue(candidate) ? 1 : 0);
	if (customCount > 0)
		blockers.push({ code: "custom-values", count: customCount });

	const unpricedCount =
		Math.max(0, run.generated.unpricedItemCount) +
		candidateUnpricedCount(candidate);
	if (unpricedCount > 0) {
		blockers.push({ code: "unpriced-items", count: unpricedCount });
	}
	if (hasShelfItems(candidate))
		blockers.push({ code: "shelf-items-not-supported" });
	if (hasServices(candidate)) blockers.push({ code: "services-not-supported" });
	if (hasDelivery(candidate)) blockers.push({ code: "delivery-not-supported" });
	if (hasNonzeroDiscount(candidate))
		blockers.push({ code: "nonzero-discount" });
	if (authoritative.stock !== "known") blockers.push({ code: "stock-unknown" });
	if (authoritative.tax !== "known") blockers.push({ code: "tax-unknown" });

	const benchmark = authoritative.providerBenchmark;
	if (
		!benchmark?.passed ||
		!sameRequiredString(benchmark.provider, authoritative.provider) ||
		!sameRequiredString(benchmark.model, authoritative.model)
	) {
		blockers.push({ code: "provider-benchmark-missing" });
	}
	if (
		!sameRequiredString(
			run.generated.configurationScope,
			authoritative.configurationScope,
		) ||
		!sameRequiredString(
			run.generated.configurationRevision,
			authoritative.configurationRevision,
		)
	) {
		blockers.push({
			code: "configuration-stale",
			generatedScope: run.generated.configurationScope,
			currentScope: authoritative.configurationScope,
			generatedRevision: run.generated.configurationRevision,
			currentRevision: authoritative.configurationRevision,
		});
	}
	if (!sameRequiredString(run.generated.seedDigest, run.applied.seedDigest)) {
		blockers.push({
			code: "seed-binding-mismatch",
			generatedSeedDigest: run.generated.seedDigest,
			appliedSeedDigest: run.applied.seedDigest,
		});
	}
	if (
		!sameRequiredString(run.generated.provider, authoritative.provider) ||
		!sameRequiredString(run.generated.model, authoritative.model)
	) {
		blockers.push({
			code: "provider-model-stale",
			generatedProvider: run.generated.provider,
			generatedModel: run.generated.model,
			currentProvider: authoritative.provider,
			currentModel: authoritative.model,
		});
	}
	if (
		!sameIdentity(candidate.form.customerId, authoritative.customerId) ||
		!sameIdentity(
			candidate.form.customerProfileId,
			authoritative.customerProfileId,
		) ||
		!sameIdentity(run.applied.customerId, authoritative.customerId) ||
		!sameIdentity(
			run.applied.customerProfileId,
			authoritative.customerProfileId,
		) ||
		!sameRequiredString(
			run.applied.customerProfileRevision,
			authoritative.customerProfileRevision,
		)
	) {
		blockers.push({ code: "customer-profile-stale" });
	}
	if (
		!authoritative.permission.allowed ||
		!sameRequiredString(
			run.applied.permissionRevision,
			authoritative.permission.revision,
		)
	) {
		blockers.push({ code: "permission-denied-or-stale" });
	}
	if (!sameRequiredString(run.applied.commercialFingerprint, fingerprint)) {
		blockers.push({
			code: "commercial-fingerprint-mismatch",
			expected: run.applied.commercialFingerprint,
			actual: fingerprint,
		});
	}

	return {
		ok: blockers.length === 0,
		blockers,
		commercialFingerprint: fingerprint,
	};
}
