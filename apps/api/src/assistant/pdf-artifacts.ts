import { buildSalesDocumentTypeKey } from "@api/utils/sales-document-access";
import type { Database } from "@gnd/db";

export const assistantSalesPdfModes = [
	"invoice",
	"quote",
	"packing-slip",
	"production",
	"order-packing",
] as const;

export type AssistantSalesPdfMode = (typeof assistantSalesPdfModes)[number];

type AssistantPdfStatus =
	| "on_demand"
	| "queued"
	| "running"
	| "ready"
	| "stale"
	| "failed"
	| "cancelled";

function snapshotMeta(value: unknown) {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function iso(value: Date | null | undefined) {
	return value?.toISOString() ?? null;
}

function mapStatus(status: string | null | undefined): AssistantPdfStatus {
	switch (status) {
		case "pending":
			return "queued";
		case "generating":
			return "running";
		case "ready":
		case "stale":
		case "failed":
		case "cancelled":
			return status;
		default:
			return "on_demand";
	}
}

export function isAssistantSalesPdfModeSupported(input: {
	salesType: string;
	mode: AssistantSalesPdfMode;
}) {
	return input.salesType === "quote"
		? input.mode === "quote"
		: input.mode !== "quote";
}

export async function getAssistantSalesPdfStatus(
	db: Database,
	input: {
		salesOrderId: number;
		salesUpdatedAt: string | null;
		mode: AssistantSalesPdfMode;
	},
) {
	const documentType = buildSalesDocumentTypeKey({ mode: input.mode });
	const snapshot = await db.salesDocumentSnapshot.findFirst({
		where: {
			salesOrderId: input.salesOrderId,
			documentType,
			isCurrent: true,
			deletedAt: null,
		},
		orderBy: { version: "desc" },
		select: {
			id: true,
			storedDocumentId: true,
			generationStatus: true,
			sourceUpdatedAt: true,
			generatedAt: true,
			failedAt: true,
			updatedAt: true,
			meta: true,
		},
	});
	if (!snapshot) {
		return {
			mode: input.mode,
			documentType,
			status: "on_demand" as const,
			snapshotId: null,
			documentId: null,
			generatedAt: null,
			sourceUpdatedAt: null,
			expiresAt: null,
			revision: `pdf:${input.salesOrderId}:${documentType}:none`,
		};
	}

	const document = snapshot.storedDocumentId
		? await db.storedDocument.findFirst({
				where: {
					id: snapshot.storedDocumentId,
					status: "ready",
					isCurrent: true,
					deletedAt: null,
				},
				select: { id: true },
			})
		: null;
	const meta = snapshotMeta(snapshot.meta);
	const saleUpdatedAt = input.salesUpdatedAt
		? new Date(input.salesUpdatedAt).getTime()
		: null;
	const sourceUpdatedAt = snapshot.sourceUpdatedAt?.getTime() ?? null;
	const stale =
		mapStatus(snapshot.generationStatus) === "ready" &&
		(saleUpdatedAt == null ||
			sourceUpdatedAt == null ||
			sourceUpdatedAt < saleUpdatedAt);
	const status = stale
		? ("stale" as const)
		: !document && snapshot.generationStatus === "ready"
			? ("failed" as const)
			: mapStatus(snapshot.generationStatus);

	return {
		mode: input.mode,
		documentType,
		status,
		snapshotId: snapshot.id,
		documentId: status === "ready" ? (document?.id ?? null) : null,
		generatedAt: iso(snapshot.generatedAt),
		sourceUpdatedAt: iso(snapshot.sourceUpdatedAt),
		expiresAt: typeof meta.expiresAt === "string" ? meta.expiresAt : null,
		revision: `pdf:${snapshot.id}:${snapshot.updatedAt?.toISOString() ?? "unknown"}`,
	};
}
