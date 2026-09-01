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
	return {
		subTotalCents: cents(sale.subTotal),
		taxCents: cents(sale.tax),
		grandTotalCents: cents(sale.grandTotal),
		amountDueCents: cents(sale.amountDue),
	};
}

function buildFinancialComparison(
	saved: SalesDocumentFinancialSnapshot,
	candidateSubTotalCents: number | null,
): SalesDocumentFinancialComparison {
	const subTotalDeltaCents =
		saved.subTotalCents === null || candidateSubTotalCents === null
			? null
			: candidateSubTotalCents - saved.subTotalCents;
	return {
		saved,
		candidate: {
			...saved,
			subTotalCents: candidateSubTotalCents,
		},
		subTotalDeltaCents,
		totalChanged: subTotalDeltaCents !== 0,
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
	let candidateSubTotalCents = 0;
	let hasCompleteCandidateSubTotal = sale.items.length > 0;
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
					const canRepairMissingAggregates =
						(itemMatches ||
							(isMissingAggregate(persistedItemQty) &&
								isMissingAggregate(persistedItemTotalCents))) &&
						(hptMatches ||
							(isMissingAggregate(hptTotalDoors) &&
								isMissingAggregate(hptTotalPriceCents)));

					if (canRepairMissingAggregates) {
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
							kind: "missing_door_group_totals",
							salesOrderItemId: item.id,
							message: `Item ${item.id} is missing its saved door quantity or total summary.`,
						});
					} else {
						requiresManualReview = true;
						findings.push({
							kind: "conflicting_door_group_totals",
							salesOrderItemId: item.id,
							message: `Item ${item.id} has non-zero door summaries that conflict with its active rows.`,
						});
					}
				}
			}
		}

		if (candidateItemTotalCents === null) {
			hasCompleteCandidateSubTotal = false;
			if (!hpt || !doors.length) {
				requiresManualReview = true;
				findings.push({
					kind: "incomplete_line_total",
					salesOrderItemId: item.id,
					message: `Item ${item.id} does not have a deterministic saved total.`,
				});
			}
		} else {
			candidateSubTotalCents += candidateItemTotalCents;
		}
	}

	const financial = buildFinancialComparison(
		financialSnapshot(sale),
		hasCompleteCandidateSubTotal ? candidateSubTotalCents : null,
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

