import { calculateSalesFormSummary } from "../sales-form/domain/costing";
import {
	SALES_DOCUMENT_READINESS_VALIDATOR_VERSION,
	type SalesDocumentFinancialComparison,
	type SalesDocumentFinancialSnapshot,
	type SalesDocumentReadinessEvaluation,
	type SalesDocumentReadinessFinding,
	type SalesDocumentRepairOperation,
} from "./types";

type FormStepInput = {
	id?: number | null;
	stepId?: number | null;
	componentId?: number | null;
	prodUid?: string | null;
	value?: string | null;
	step?: { title?: string | null } | null;
};

type DoorInput = {
	id: number;
	totalQty?: number | null;
	lhQty?: number | null;
	rhQty?: number | null;
	unitPrice?: number | null;
	lineTotal?: number | null;
};

type SalesItemInput = {
	id: number;
	qty?: number | null;
	total?: number | null;
	meta?: unknown;
	formSteps?: FormStepInput[] | null;
	housePackageTool?: {
		id: number;
		totalDoors?: number | null;
		totalPrice?: number | null;
		doors?: DoorInput[] | null;
	} | null;
};

export type SalesDocumentReadinessInput = {
	id: number;
	orderId: string;
	type?: string | null;
	updatedAt?: Date | string | null;
	meta?: unknown;
	subTotal?: number | null;
	tax?: number | null;
	grandTotal?: number | null;
	amountDue?: number | null;
	taxPercentage?: number | null;
	paymentMethod?: string | null;
	extraCosts?: Array<{
		type?: string | null;
		amount?: number | null;
		taxxable?: boolean | null;
	}>;
	taxes?: Array<{ taxxable?: number | null }>;
	items: SalesItemInput[];
};

function finiteNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

function cents(value: unknown): number | null {
	const number = finiteNumber(value);
	return number === null ? null : Math.round(number * 100);
}

function record(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function doorQuantity(door: DoorInput) {
	const totalQty = finiteNumber(door.totalQty);
	if (totalQty !== null && totalQty > 0) return totalQty;
	return (finiteNumber(door.lhQty) ?? 0) + (finiteNumber(door.rhQty) ?? 0);
}

function doorTotalCents(door: DoorInput) {
	const persisted = cents(door.lineTotal);
	if (persisted !== null) return persisted;
	const unitPrice = finiteNumber(door.unitPrice);
	return unitPrice === null
		? null
		: Math.round(unitPrice * doorQuantity(door) * 100);
}

function financialSnapshot(
	sale: SalesDocumentReadinessInput,
): SalesDocumentFinancialSnapshot {
	const taxableValues = (sale.taxes ?? [])
		.map((tax) => finiteNumber(tax.taxxable))
		.filter((value): value is number => value !== null);
	return {
		subTotalCents: cents(sale.subTotal),
		taxableSubTotalCents: taxableValues.length
			? cents(taxableValues.reduce((total, value) => total + value, 0))
			: null,
		taxCents: cents(sale.tax),
		grandTotalCents: cents(sale.grandTotal),
		amountDueCents: cents(sale.amountDue),
	};
}

function buildFinancialComparison(
	saved: SalesDocumentFinancialSnapshot,
	candidate: SalesDocumentFinancialSnapshot,
): SalesDocumentFinancialComparison {
	const delta = (before: number | null, after: number | null) =>
		before === null || after === null ? null : after - before;
	const subTotalDeltaCents = delta(
		saved.subTotalCents,
		candidate.subTotalCents,
	);
	const taxableSubTotalDeltaCents = delta(
		saved.taxableSubTotalCents,
		candidate.taxableSubTotalCents,
	);
	const taxDeltaCents = delta(saved.taxCents, candidate.taxCents);
	const grandTotalDeltaCents = delta(
		saved.grandTotalCents,
		candidate.grandTotalCents,
	);
	const amountDueDeltaCents = delta(
		saved.amountDueCents,
		candidate.amountDueCents,
	);
	const requiredDeltas: Array<number | null> = [
		subTotalDeltaCents,
		taxDeltaCents,
		grandTotalDeltaCents,
		amountDueDeltaCents,
	];
	if (taxableSubTotalDeltaCents !== null) {
		requiredDeltas.push(taxableSubTotalDeltaCents);
	}
	return {
		saved,
		candidate,
		subTotalDeltaCents,
		taxableSubTotalDeltaCents,
		taxDeltaCents,
		grandTotalDeltaCents,
		amountDueDeltaCents,
		totalChanged: requiredDeltas.some((value) => value === null || value !== 0),
	};
}

function candidateFinancialSnapshot(
	sale: SalesDocumentReadinessInput,
	candidateItemTotalsCents: Array<number | null>,
): SalesDocumentFinancialSnapshot {
	const saved = financialSnapshot(sale);
	if (candidateItemTotalsCents.some((value) => value === null)) {
		return {
			subTotalCents: null,
			taxableSubTotalCents: null,
			taxCents: null,
			grandTotalCents: null,
			amountDueCents: null,
		};
	}
	const candidateSubTotalCents = candidateItemTotalsCents.reduce<number>(
		(total, value) => total + (value ?? 0),
		0,
	);
	const subTotalDeltaCents =
		saved.subTotalCents === null
			? null
			: candidateSubTotalCents - saved.subTotalCents;
	const currentItemTotalsCents = sale.items.map((item) => cents(item.total));
	const currentTotalsAreComplete = currentItemTotalsCents.every(
		(value): value is number => value !== null,
	);
	const currentSubTotalCents = currentTotalsAreComplete
		? currentItemTotalsCents.reduce((total, value) => total + value, 0)
		: null;
	const currentLineTotalsMatchSaved =
		currentSubTotalCents !== null &&
		currentSubTotalCents === saved.subTotalCents;
	const effectiveTaxRate = (() => {
		const persistedRate = finiteNumber(sale.taxPercentage);
		if (persistedRate !== null && persistedRate > 0) return persistedRate;
		if (
			saved.taxCents !== null &&
			saved.taxableSubTotalCents !== null &&
			saved.taxableSubTotalCents > 0
		) {
			return (saved.taxCents / saved.taxableSubTotalCents) * 100;
		}
		return saved.taxCents === 0 ? 0 : null;
	})();
	const calculateSummary = (itemTotalsCents: number[]) =>
		calculateSalesFormSummary({
			strategy: "legacy",
			taxRate: effectiveTaxRate,
			paymentMethod: sale.paymentMethod,
			lineItems: sale.items.map((item, index) => ({
				lineTotal: (itemTotalsCents[index] ?? 0) / 100,
				meta: record(item.meta),
				formSteps: item.formSteps,
			})),
			extraCosts: (sale.extraCosts ?? []).map((cost) => ({
				type: String(cost.type ?? ""),
				amount: cost.amount,
				taxxable: cost.taxxable,
			})),
		});
	let taxableDeltaCents: number | null = null;
	if (currentLineTotalsMatchSaved) {
		const currentSummary = calculateSummary(currentItemTotalsCents as number[]);
		const candidateSummary = calculateSummary(
			candidateItemTotalsCents as number[],
		);
		taxableDeltaCents =
			(cents(candidateSummary.taxableSubTotal) ?? 0) -
			(cents(currentSummary.taxableSubTotal) ?? 0);
	} else if (saved.taxableSubTotalCents !== null) {
		const candidateSummary = calculateSummary(
			candidateItemTotalsCents as number[],
		);
		taxableDeltaCents =
			(cents(candidateSummary.taxableSubTotal) ?? 0) -
			saved.taxableSubTotalCents;
	} else if (subTotalDeltaCents === 0) {
		// Historical records may have missing/stale line aggregates even though the
		// saved invoice subtotal is correct. A zero invoice-level delta means the
		// aggregate repair itself does not alter taxability.
		taxableDeltaCents = 0;
	}
	const taxDeltaCents =
		taxableDeltaCents === 0
			? 0
			: taxableDeltaCents === null || effectiveTaxRate === null
				? null
				: Math.round((taxableDeltaCents * effectiveTaxRate) / 100);
	const grandTotalDeltaCents =
		subTotalDeltaCents === null || taxDeltaCents === null
			? null
			: subTotalDeltaCents + taxDeltaCents;
	return {
		subTotalCents: candidateSubTotalCents,
		taxableSubTotalCents:
			saved.taxableSubTotalCents === null || taxableDeltaCents === null
				? null
				: saved.taxableSubTotalCents + taxableDeltaCents,
		taxCents:
			saved.taxCents === null || taxDeltaCents === null
				? null
				: saved.taxCents + taxDeltaCents,
		grandTotalCents:
			saved.grandTotalCents === null || grandTotalDeltaCents === null
				? null
				: saved.grandTotalCents + grandTotalDeltaCents,
		amountDueCents:
			saved.amountDueCents === null || grandTotalDeltaCents === null
				? null
				: saved.amountDueCents + grandTotalDeltaCents,
	};
}

function hasConflictingFormStepRevisions(steps: FormStepInput[]) {
	const signaturesByStep = new Map<string, Set<string>>();
	for (const step of steps) {
		const key = String(step.stepId ?? `row:${step.id ?? "unknown"}`);
		const signature = JSON.stringify({
			componentId: finiteNumber(step.componentId),
			prodUid: String(step.prodUid || "").trim(),
			value: String(step.value || "").trim(),
		});
		const signatures = signaturesByStep.get(key) ?? new Set<string>();
		signatures.add(signature);
		signaturesByStep.set(key, signatures);
	}
	return [...signaturesByStep.values()].some(
		(signatures) => signatures.size > 1,
	);
}

function isMissingAggregate(value: number | null) {
	return value === null || value === 0;
}

export function evaluateSalesDocumentReadiness(
	sale: SalesDocumentReadinessInput,
): SalesDocumentReadinessEvaluation {
	const operations: SalesDocumentRepairOperation[] = [];
	const findings: SalesDocumentReadinessFinding[] = [];
	const candidateItemTotalsCents: Array<number | null> = [];
	let requiresManualReview = false;

	for (const item of sale.items) {
		if (hasConflictingFormStepRevisions(item.formSteps ?? [])) {
			requiresManualReview = true;
			findings.push({
				kind: "conflicting_form_step_revisions",
				salesOrderItemId: item.id,
				message: `Item ${item.id} has conflicting active form-step revisions.`,
			});
		}

		const hpt = item.housePackageTool;
		const doors = hpt?.doors ?? [];
		const persistedItemQty = finiteNumber(item.qty);
		const persistedItemTotalCents = cents(item.total);
		let candidateItemTotalCents = persistedItemTotalCents;

		if (hpt && doors.length) {
			const candidateQty = doors.reduce(
				(total, door) => total + doorQuantity(door),
				0,
			);
			const doorTotals = doors.map(doorTotalCents);
			const candidateDoorTotalCents = doorTotals.every(
				(value): value is number => value !== null,
			)
				? doorTotals.reduce((total, value) => total + value, 0)
				: null;
			const hptTotalDoors = finiteNumber(hpt.totalDoors);
			const hptTotalPriceCents = cents(hpt.totalPrice);

			if (candidateDoorTotalCents === null) {
				requiresManualReview = true;
				findings.push({
					kind: "incomplete_line_total",
					salesOrderItemId: item.id,
					message: `Item ${item.id} has a door row without a usable total.`,
				});
			} else {
				candidateItemTotalCents = candidateDoorTotalCents;
				const itemMatches =
					persistedItemQty === candidateQty &&
					persistedItemTotalCents === candidateDoorTotalCents;
				const hptMatches =
					hptTotalDoors === candidateQty &&
					hptTotalPriceCents === candidateDoorTotalCents;

				if (!itemMatches || !hptMatches) {
					const hasOnlyMissingAggregates =
						(itemMatches ||
							(isMissingAggregate(persistedItemQty) &&
								isMissingAggregate(persistedItemTotalCents))) &&
						(hptMatches ||
							(isMissingAggregate(hptTotalDoors) &&
								isMissingAggregate(hptTotalPriceCents)));
					operations.push({
						kind: "sync_door_group_totals",
						salesOrderItemId: item.id,
						housePackageToolId: hpt.id,
						before: {
							itemQty: persistedItemQty,
							itemTotalCents: persistedItemTotalCents,
							hptTotalDoors,
							hptTotalPriceCents,
						},
						after: {
							itemQty: candidateQty,
							itemTotalCents: candidateDoorTotalCents,
							hptTotalDoors: candidateQty,
							hptTotalPriceCents: candidateDoorTotalCents,
						},
						doorIds: doors.map((door) => door.id),
					});
					findings.push({
						kind: hasOnlyMissingAggregates
							? "missing_door_group_totals"
							: "conflicting_door_group_totals",
						salesOrderItemId: item.id,
						message: hasOnlyMissingAggregates
							? `Item ${item.id} is missing its saved door quantity or total summary.`
							: `Item ${item.id} has stale door summaries that conflict with its active rows.`,
					});
				}
			}
		}

		if (candidateItemTotalCents === null) {
			if (!hpt || !doors.length) {
				requiresManualReview = true;
				findings.push({
					kind: "incomplete_line_total",
					salesOrderItemId: item.id,
					message: `Item ${item.id} does not have a deterministic saved total.`,
				});
			}
		}
		candidateItemTotalsCents.push(candidateItemTotalCents);
	}

	const savedFinancial = financialSnapshot(sale);
	const financial = buildFinancialComparison(
		savedFinancial,
		candidateFinancialSnapshot(sale, candidateItemTotalsCents),
	);
	const base = {
		salesOrderId: sale.id,
		orderNo: sale.orderId,
		salesType: sale.type === "quote" ? ("quote" as const) : ("order" as const),
		validatorVersion: SALES_DOCUMENT_READINESS_VALIDATOR_VERSION,
		financial,
		findings,
		operations,
	};

	if (requiresManualReview) {
		return { ...base, status: "manual_review" };
	}
	if (financial.totalChanged) {
		return { ...base, status: "financial_review" };
	}
	if (operations.length) {
		return { ...base, status: "repair_required" };
	}
	return { ...base, status: "ready", operations: [] };
}
