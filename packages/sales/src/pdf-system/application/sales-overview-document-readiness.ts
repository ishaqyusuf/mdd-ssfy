import type { SalesDocumentSnapshotRecord } from "../contracts";
import { isSalesSourceStale } from "./source-freshness";

export type SalesOverviewDocumentReadinessStatus =
	| "ready"
	| "on_demand"
	| "stale"
	| "generating"
	| "failed";

type SalesOverviewSnapshot = Pick<
	SalesDocumentSnapshotRecord,
	| "id"
	| "generationStatus"
	| "storedDocumentId"
	| "sourceUpdatedAt"
	| "generatedAt"
	| "errorMessage"
>;

function toIso(value?: Date | null) {
	return value?.toISOString() ?? null;
}

export function resolveSalesOverviewDocumentReadiness(input: {
	saleUpdatedAt?: Date | null;
	snapshot?: SalesOverviewSnapshot | null;
}) {
	const snapshot = input.snapshot;
	if (!snapshot) {
		return {
			status: "on_demand" as const,
			snapshotId: null,
			generatedAt: null,
			errorMessage: null,
		};
	}

	const base = {
		snapshotId: snapshot.id,
		generatedAt: toIso(snapshot.generatedAt),
		errorMessage: snapshot.errorMessage ?? null,
	};
	if (snapshot.generationStatus === "failed") {
		return {
			status: "failed" as const,
			...base,
		};
	}
	if (
		snapshot.generationStatus === "pending" ||
		snapshot.generationStatus === "generating"
	) {
		return {
			status: "generating" as const,
			...base,
		};
	}
	if (snapshot.generationStatus === "stale") {
		return {
			status: "stale" as const,
			...base,
		};
	}
	if (!snapshot.storedDocumentId) {
		return {
			status: "on_demand" as const,
			...base,
		};
	}

	if (
		isSalesSourceStale({
			sourceUpdatedAt: snapshot.sourceUpdatedAt,
			saleUpdatedAt: input.saleUpdatedAt,
		})
	) {
		return {
			status: "stale" as const,
			...base,
		};
	}

	return {
		status: "ready" as const,
		...base,
	};
}
