import { Prisma, db } from "@gnd/db";
import {
	type CreateStoredDocumentRecordInput,
	type StoredDocumentRepository,
	type UpdateStoredDocumentRecordInput,
	buildOwnerDocumentFolder,
	createDocumentRegistry,
	createDocumentService,
	createVercelBlobProvider,
} from "@gnd/documents";
import { renderSalesPdfBuffer } from "@gnd/pdf/sales-v2";
import {
	type SalesDocumentSnapshotRecord,
	type SalesDocumentSnapshotRepository,
	resolveCurrentSalesDocument,
} from "@gnd/sales/pdf-system";
import { getPrintDocumentData } from "@gnd/sales/print";
import type { PrintMode } from "@gnd/sales/print/types";
import { type SalesDocumentAccessToken, tokenize } from "@gnd/utils/tokenizer";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { put } from "@vercel/blob";
import { addDays } from "date-fns";
import {
	type TaskName,
	type WarmSalesDocumentSnapshotPayload,
	warmSalesDocumentSnapshotSchema,
} from "../../schema";

const DEFAULT_TEMPLATE_ID = "template-2";
const DEFAULT_LINK_TTL_DAYS = 7;

const SALES_DOCUMENT_BASE_TYPES = {
	invoice: "invoice_pdf",
	quote: "quote_pdf",
	"packing-slip": "packing_slip_pdf",
	production: "production_pdf",
	"order-packing": "order_packing_pdf",
} as const satisfies Record<PrintMode, string>;

type SalesDocumentMeta = {
	accessToken?: string | null;
	expiresAt?: string | null;
	templateId?: string | null;
	mode?: PrintMode | null;
	dispatchId?: number | null;
	scopeKey?: string | null;
	title?: string | null;
};

function buildSalesDocumentTypeKey(input: {
	mode: PrintMode;
	dispatchId?: number | null;
}) {
	const baseType = SALES_DOCUMENT_BASE_TYPES[input.mode];
	if (input.mode === "packing-slip" && input.dispatchId) {
		return `${baseType}:dispatch:${input.dispatchId}`;
	}
	return baseType;
}

function buildSalesDocumentScopeKey(input: {
	mode: PrintMode;
	dispatchId?: number | null;
}) {
	if (input.mode === "packing-slip" && input.dispatchId) {
		return `dispatch:${input.dispatchId}`;
	}
	return "order";
}

function buildStoredDocumentKind(documentType: string) {
	return `sales_pdf_snapshot:${documentType}`;
}

function resolveBaseUrl() {
	return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
		/\/$/,
		"",
	);
}

function getSnapshotMeta(
	meta: SalesDocumentSnapshotRecord["meta"],
): SalesDocumentMeta {
	if (!meta || typeof meta !== "object") return {};
	return meta as SalesDocumentMeta;
}

function isFutureIso(value?: string | null) {
	if (!value) return false;
	const parsed = new Date(value);
	return !Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now();
}

async function getSalesOrderSourceUpdatedAt(salesOrderId: number) {
	const sale = await db.salesOrders.findUnique({
		where: {
			id: salesOrderId,
		},
		select: {
			updatedAt: true,
		},
	});

	return sale?.updatedAt ?? null;
}

async function isSalesSnapshotStale(
	snapshot: Pick<
		SalesDocumentSnapshotRecord,
		"salesOrderId" | "sourceUpdatedAt"
	>,
) {
	const saleUpdatedAt = await getSalesOrderSourceUpdatedAt(
		snapshot.salesOrderId,
	);

	if (!saleUpdatedAt) return false;
	if (!snapshot.sourceUpdatedAt) return true;

	return snapshot.sourceUpdatedAt.getTime() < saleUpdatedAt.getTime();
}

function sanitizeFilename(value: string) {
	return value.replace(/[^\w\-]+/g, "_");
}

function toSalesDocumentSnapshotRecord(
	record: Omit<SalesDocumentSnapshotRecord, "meta"> & {
		meta?: Prisma.JsonValue | null;
	},
): SalesDocumentSnapshotRecord {
	return {
		...record,
		meta:
			record.meta &&
			typeof record.meta === "object" &&
			!Array.isArray(record.meta)
				? (record.meta as Record<string, unknown>)
				: null,
	};
}

function createSalesDocumentSnapshotRepository(): SalesDocumentSnapshotRepository {
	return {
		async create(input) {
			const record = await db.salesDocumentSnapshot.create({
				data: {
					...input,
					meta:
						input.meta === undefined
							? undefined
							: input.meta
								? (input.meta as Prisma.InputJsonValue)
								: Prisma.JsonNull,
				},
			});
			return toSalesDocumentSnapshotRecord(record);
		},
		async update(input) {
			const { id, ...data } = input;
			const record = await db.salesDocumentSnapshot.update({
				where: { id },
				data: {
					...data,
					meta:
						data.meta === undefined
							? undefined
							: data.meta
								? (data.meta as Prisma.InputJsonValue)
								: Prisma.JsonNull,
				},
			});
			return toSalesDocumentSnapshotRecord(record);
		},
		async findCurrentByType(input) {
			const record = await db.salesDocumentSnapshot.findFirst({
				where: {
					salesOrderId: input.salesOrderId,
					documentType: input.documentType,
					isCurrent: true,
					deletedAt: null,
				},
				orderBy: {
					version: "desc",
				},
			});
			return record ? toSalesDocumentSnapshotRecord(record) : null;
		},
		async findLatestVersion(input) {
			const record = await db.salesDocumentSnapshot.findFirst({
				where: {
					salesOrderId: input.salesOrderId,
					documentType: input.documentType,
					deletedAt: null,
				},
				orderBy: {
					version: "desc",
				},
			});
			return record ? toSalesDocumentSnapshotRecord(record) : null;
		},
		async clearCurrentByType(input) {
			await db.salesDocumentSnapshot.updateMany({
				where: {
					salesOrderId: input.salesOrderId,
					documentType: input.documentType,
					isCurrent: true,
					deletedAt: null,
					...(input.excludeId ? { id: { not: input.excludeId } } : {}),
				},
				data: {
					isCurrent: false,
				},
			});
		},
	};
}

function createStoredDocumentRepository(): StoredDocumentRepository {
	return {
		create(input: CreateStoredDocumentRecordInput) {
			return db.storedDocument.create({
				data: input,
			});
		},
		update(input: UpdateStoredDocumentRecordInput) {
			const { id, ...data } = input;
			return db.storedDocument.update({
				where: { id },
				data,
			});
		},
		findCurrentByOwner(input: {
			ownerType: string;
			ownerId: string;
			kind: string;
		}) {
			return db.storedDocument.findFirst({
				where: {
					ownerType: input.ownerType,
					ownerId: input.ownerId,
					kind: input.kind,
					isCurrent: true,
					deletedAt: null,
				},
			});
		},
		async clearCurrentByOwner(input: {
			ownerType: string;
			ownerId: string;
			kind: string;
			excludeId?: string;
		}) {
			await db.storedDocument.updateMany({
				where: {
					ownerType: input.ownerType,
					ownerId: input.ownerId,
					kind: input.kind,
					isCurrent: true,
					deletedAt: null,
					...(input.excludeId ? { id: { not: input.excludeId } } : {}),
				},
				data: {
					isCurrent: false,
				},
			});
		},
	};
}

async function warmSnapshot(payload: WarmSalesDocumentSnapshotPayload) {
	const repository = createSalesDocumentSnapshotRepository();
	const documentType = buildSalesDocumentTypeKey({
		mode: payload.mode,
		dispatchId: payload.dispatchId ?? null,
	});

	if (!payload.forceRegenerate) {
		const current = await resolveCurrentSalesDocument(repository, {
			salesOrderId: payload.salesOrderId,
			documentType,
		});
		const meta = current ? getSnapshotMeta(current.meta) : {};
		const storedDocument =
			current?.storedDocumentId != null
				? await db.storedDocument.findFirst({
						where: {
							id: current.storedDocumentId,
							deletedAt: null,
							status: "ready",
						},
						select: {
							id: true,
						},
					})
				: null;

		if (
			current &&
			storedDocument &&
			meta.accessToken &&
			isFutureIso(meta.expiresAt) &&
			!(await isSalesSnapshotStale(current))
		) {
			return {
				ok: true,
				reused: true,
				snapshotId: current.id,
				documentType,
			};
		}
	}

	const latest = await repository.findLatestVersion({
		salesOrderId: payload.salesOrderId,
		documentType,
	});

	await repository.clearCurrentByType?.({
		salesOrderId: payload.salesOrderId,
		documentType,
	});

	const sourceUpdatedAt = await getSalesOrderSourceUpdatedAt(
		payload.salesOrderId,
	);

	const pending = await repository.create({
		salesOrderId: payload.salesOrderId,
		documentType,
		version: (latest?.version || 0) + 1,
		generationStatus: "pending",
		isCurrent: true,
		sourceUpdatedAt,
		meta: {
			mode: payload.mode,
			dispatchId: payload.dispatchId ?? null,
			scopeKey: buildSalesDocumentScopeKey(payload),
			templateId: payload.templateId || DEFAULT_TEMPLATE_ID,
		},
	});

	try {
		const documentData = await getPrintDocumentData(db, {
			ids: [payload.salesOrderId],
			mode: payload.mode,
			dispatchId: payload.dispatchId ?? null,
		});

		if (!documentData.pages.length) {
			throw new Error("No printable pages found for this sales document.");
		}

		const title = documentData.title || `sales-${payload.salesOrderId}`;
		const buffer = await renderSalesPdfBuffer({
			pages: documentData.pages,
			title,
			templateId: payload.templateId || DEFAULT_TEMPLATE_ID,
			companyAddress: documentData.companyAddress,
			baseUrl: resolveBaseUrl(),
		});

		const registry = createDocumentRegistry(createStoredDocumentRepository());
		const documentService = createDocumentService(
			createVercelBlobProvider({
				put,
				token: process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN,
				access: "public",
				addRandomSuffix: true,
			}),
		);
		const filename = `${sanitizeFilename(title)}.pdf`;
		const folder = buildOwnerDocumentFolder({
			ownerType: "sales_order",
			ownerId: String(payload.salesOrderId),
			kind: buildStoredDocumentKind(documentType),
		});
		const uploaded = await documentService.upload({
			filename,
			folder,
			body: buffer,
			contentType: "application/pdf",
		});

		const storedDocument = await registry.registerUploaded({
			ownerType: "sales_order",
			ownerId: String(payload.salesOrderId),
			ownerKey: documentType,
			kind: buildStoredDocumentKind(documentType),
			upload: uploaded,
			visibility: "public",
			generated: true,
			sourceType: "sales_document_snapshot",
			sourceId: pending.id,
			title,
			description: `Snapshot PDF for ${documentType}.`,
			meta: {
				documentType,
				mode: payload.mode,
				dispatchId: payload.dispatchId ?? null,
			},
		});

		const expiresAt = addDays(new Date(), DEFAULT_LINK_TTL_DAYS).toISOString();
		const accessToken = tokenize({
			snapshotId: pending.id,
			salesOrderId: payload.salesOrderId,
			documentType,
			expiry: expiresAt,
		} satisfies SalesDocumentAccessToken);

		const snapshot = await repository.update({
			id: pending.id,
			storedDocumentId: storedDocument.id,
			generationStatus: "ready",
			sourceUpdatedAt,
			generatedAt: new Date(),
			errorMessage: null,
			meta: {
				mode: payload.mode,
				dispatchId: payload.dispatchId ?? null,
				scopeKey: buildSalesDocumentScopeKey(payload),
				templateId: payload.templateId || DEFAULT_TEMPLATE_ID,
				accessToken,
				expiresAt,
				title,
			},
		});

		return {
			ok: true,
			reused: false,
			snapshotId: snapshot.id,
			documentType,
		};
	} catch (error) {
		await repository.update({
			id: pending.id,
			generationStatus: "failed",
			isCurrent: false,
			failedAt: new Date(),
			errorMessage:
				error instanceof Error ? error.message : "Unable to generate PDF.",
		});
		throw error;
	}
}

export const warmSalesDocumentSnapshot = schemaTask({
	id: "warm-sales-document-snapshot" as TaskName,
	schema: warmSalesDocumentSnapshotSchema,
	machine: "micro",
	maxDuration: 300,
	run: async (payload) => {
		logger.info("Warming sales document snapshot", payload);
		return warmSnapshot(payload);
	},
});
