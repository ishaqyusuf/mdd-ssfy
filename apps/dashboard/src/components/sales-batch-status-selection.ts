import type { SalesOrderLifecycleStatus } from "@gnd/sales/order-status";
import type { SalesInventoryMarkAsAction } from "@gnd/sales/sales-inventory-mark-as-preflight";

const PRODUCTION_COMPLETED_STATUSES = new Set<SalesOrderLifecycleStatus>([
	"ready_to_fulfill",
	"fulfillment_queued",
	"packing",
	"packed",
	"in_transit",
	"administratively_completed",
	"fulfilled",
]);

export type SalesBatchStatusCandidate = {
	salesId: number;
	status?: SalesOrderLifecycleStatus | null;
	pipelineRevision?: string | null;
	productionCompleted?: boolean;
	fulfilled?: boolean;
};

export function resolveSalesBatchStatusSelection({
	action,
	salesIds,
	candidates,
}: {
	action: SalesInventoryMarkAsAction;
	salesIds: readonly number[];
	candidates?: readonly SalesBatchStatusCandidate[];
}) {
	const candidatesBySalesId = new Map(
		(candidates || []).map((candidate) => [candidate.salesId, candidate]),
	);
	const eligibleSalesIds: number[] = [];
	const skippedSalesIds: number[] = [];
	const seenSalesIds = new Set<number>();

	for (const salesId of salesIds) {
		if (seenSalesIds.has(salesId)) continue;
		seenSalesIds.add(salesId);

		const candidate = candidatesBySalesId.get(salesId);
		const fulfilled =
			candidate?.fulfilled === true || candidate?.status === "fulfilled";
		const productionCompleted =
			candidate?.productionCompleted === true ||
			(candidate?.status
				? PRODUCTION_COMPLETED_STATUSES.has(candidate.status)
				: false);
		const lifecycleException =
			candidate?.status === "unknown" || candidate?.status === "conflict";
		const shouldSkip =
			lifecycleException ||
			(action === "fulfilled" ? fulfilled : fulfilled || productionCompleted);

		if (shouldSkip) {
			skippedSalesIds.push(salesId);
		} else {
			eligibleSalesIds.push(salesId);
		}
	}

	return { eligibleSalesIds, skippedSalesIds };
}

export function resolveSalesBatchAdministrativeOverrideSelection({
	salesIds,
	candidates,
}: {
	salesIds: readonly number[];
	candidates?: readonly SalesBatchStatusCandidate[];
}) {
	const candidatesBySalesId = new Map(
		(candidates ?? []).map((candidate) => [candidate.salesId, candidate]),
	);
	const eligible: Array<{ salesId: number; pipelineRevision: string }> = [];
	const skippedSalesIds: number[] = [];
	const seenSalesIds = new Set<number>();

	for (const salesId of salesIds) {
		if (seenSalesIds.has(salesId)) continue;
		seenSalesIds.add(salesId);
		const candidate = candidatesBySalesId.get(salesId);
		if (
			(candidate?.status === "unknown" || candidate?.status === "conflict") &&
			candidate.pipelineRevision
		) {
			eligible.push({ salesId, pipelineRevision: candidate.pipelineRevision });
		} else {
			skippedSalesIds.push(salesId);
		}
	}

	return { eligible, skippedSalesIds };
}
