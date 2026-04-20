import type { Db, Prisma } from "@gnd/db";
import { buildOwnerDocumentFolder } from "@gnd/documents";
import { renderSalesPdfBuffer } from "@gnd/pdf/sales-v2";
import {
	type SalesDocumentSnapshotRecord,
	type SalesDocumentSnapshotRepository,
	resolveCurrentSalesDocument,
} from "@gnd/sales/pdf-system";
import { getPrintDocumentData } from "@gnd/sales/print";
import type { PrintMode } from "@gnd/sales/print/types";
import {
	type SalesDocumentAccessToken,
	type SalesPdfToken,
	tokenSchemas,
	tokenize,
	validateToken,
} from "@gnd/utils/tokenizer";
import { put } from "@vercel/blob";
import { addDays } from "date-fns";
import { createApiVercelBlobDocumentService } from "./documents";
import { createStoredDocumentRegistry } from "./stored-documents";

const DEFAULT_TEMPLATE_ID = "template-2";
const DEFAULT_LINK_TTL_DAYS = 7;
const SALES_DOCUMENT_DOWNLOAD_PATH = "/api/download/sales-v2";

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

export type ResolveSalesDocumentAccessInput = {
	db: Db;
	salesIds: number[];
	mode: PrintMode;
	dispatchId?: number | null;
	templateId?: string | null;
	baseUrl?: string | null;
	forceRegenerate?: boolean;
};

export type ResolveSalesDocumentAccessResult = {
	kind: "snapshot" | "legacy";
	generated: boolean;
	mode: PrintMode;
	documentType: string;
	salesOrderId: number | null;
	snapshotId?: string | null;
	accessToken: string;
	expiresAt: string | null;
	previewUrl: string;
	downloadUrl: string;
};

type SnapshotDocumentLookup = {
	snapshot: SalesDocumentSnapshotRecord;
	storedDocument: {
		id: string;
		url: string | null;
		pathname: string;
		filename: string | null;
		mimeType: string | null;
		status: string;
	};
	tokenPayload: SalesDocumentAccessToken;
};

export function buildSalesDocumentTypeKey(input: {
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

function resolveBaseUrl(baseUrl?: string | null) {
	return (
		baseUrl ||
		process.env.NEXT_PUBLIC_APP_URL ||
		"http://localhost:3000"
	).replace(/\/$/, "");
}

function buildSalesDocumentAccessUrls(input: {
	accessToken: string;
	baseUrl?: string | null;
	templateId?: string | null;
}) {
	const baseUrl = resolveBaseUrl(input.baseUrl);
	const template = input.templateId || DEFAULT_TEMPLATE_ID;
	const previewUrl = `${baseUrl}${SALES_DOCUMENT_DOWNLOAD_PATH}?accessToken=${encodeURIComponent(input.accessToken)}&preview=true&templateId=${encodeURIComponent(template)}`;
	const downloadUrl = `${baseUrl}${SALES_DOCUMENT_DOWNLOAD_PATH}?accessToken=${encodeURIComponent(input.accessToken)}&preview=false&templateId=${encodeURIComponent(template)}`;
	return { previewUrl, downloadUrl };
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

function sanitizeFilename(value: string) {
	return value.replace(/[^\w\-]+/g, "_");
}

function buildLegacySalesPrintToken(input: {
	salesIds: number[];
	mode: PrintMode;
	dispatchId?: number | null;
}) {
	const legacyMode: SalesPdfToken["mode"] =
		input.mode === "invoice"
			? "order"
			: input.mode === "packing-slip"
				? "packing list"
				: input.mode;
	return tokenize({
		salesIds: input.salesIds,
		expiry: addDays(new Date(), DEFAULT_LINK_TTL_DAYS).toISOString(),
		mode: legacyMode,
		dispatchId: input.dispatchId ?? null,
	} satisfies SalesPdfToken);
}

export function createSalesDocumentSnapshotRepository(
	db: Db,
): SalesDocumentSnapshotRepository & {
	findById(input: { id: string }): Promise<SalesDocumentSnapshotRecord | null>;
} {
	return {
		create(input) {
			return db.salesDocumentSnapshot.create({
				data: {
					...input,
					meta: input.meta as Prisma.InputJsonValue | undefined,
				},
			});
		},
		update(input) {
			const { id, ...data } = input;
			return db.salesDocumentSnapshot.update({
				where: { id },
				data: {
					...data,
					meta:
						data.meta === undefined
							? undefined
							: ((data.meta || null) as Prisma.InputJsonValue | null),
				},
			});
		},
		findCurrentByType(input) {
			return db.salesDocumentSnapshot.findFirst({
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
		},
		findLatestVersion(input) {
			return db.salesDocumentSnapshot.findFirst({
				where: {
					salesOrderId: input.salesOrderId,
					documentType: input.documentType,
					deletedAt: null,
				},
				orderBy: {
					version: "desc",
				},
			});
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
		findById(input) {
			return db.salesDocumentSnapshot.findFirst({
				where: {
					id: input.id,
					deletedAt: null,
				},
			});
		},
	};
}

async function createSalesPdfSnapshot(input: {
	db: Db;
	salesOrderId: number;
	mode: PrintMode;
	documentType: string;
	dispatchId?: number | null;
	templateId?: string | null;
	baseUrl?: string | null;
}) {
	const repository = createSalesDocumentSnapshotRepository(input.db);
	const latest = await repository.findLatestVersion({
		salesOrderId: input.salesOrderId,
		documentType: input.documentType,
	});

	await repository.clearCurrentByType?.({
		salesOrderId: input.salesOrderId,
		documentType: input.documentType,
	});

	const pending = await repository.create({
		salesOrderId: input.salesOrderId,
		documentType: input.documentType,
		version: (latest?.version || 0) + 1,
		generationStatus: "pending",
		isCurrent: true,
		meta: {
			mode: input.mode,
			dispatchId: input.dispatchId ?? null,
			scopeKey: buildSalesDocumentScopeKey(input),
			templateId: input.templateId || DEFAULT_TEMPLATE_ID,
		},
	});

	try {
		const documentData = await getPrintDocumentData(input.db, {
			ids: [input.salesOrderId],
			mode: input.mode,
			dispatchId: input.dispatchId ?? null,
		});

		if (!documentData.pages.length) {
			throw new Error("No printable pages found for this sales document.");
		}

		const title = documentData.title || `sales-${input.salesOrderId}`;
		const buffer = await renderSalesPdfBuffer({
			pages: documentData.pages,
			title,
			templateId: input.templateId || DEFAULT_TEMPLATE_ID,
			companyAddress: documentData.companyAddress,
			baseUrl: resolveBaseUrl(input.baseUrl),
		});

		const documentService = createApiVercelBlobDocumentService({ put });
		const folder = buildOwnerDocumentFolder({
			ownerType: "sales_order",
			ownerId: String(input.salesOrderId),
			kind: buildStoredDocumentKind(input.documentType),
		});
		const filename = `${sanitizeFilename(title)}.pdf`;
		const uploaded = await documentService.upload({
			filename,
			folder,
			body: buffer,
			contentType: "application/pdf",
		});

		const storedDocument = await createStoredDocumentRegistry(
			input.db,
		).registerUploaded({
			ownerType: "sales_order",
			ownerId: String(input.salesOrderId),
			ownerKey: input.documentType,
			kind: buildStoredDocumentKind(input.documentType),
			upload: uploaded,
			visibility: "public",
			generated: true,
			sourceType: "sales_document_snapshot",
			sourceId: pending.id,
			title,
			description: `Snapshot PDF for ${input.documentType}.`,
			meta: {
				documentType: input.documentType,
				mode: input.mode,
				dispatchId: input.dispatchId ?? null,
			},
		});

		const expiresAt = addDays(new Date(), DEFAULT_LINK_TTL_DAYS).toISOString();
		const accessToken = tokenize({
			snapshotId: pending.id,
			salesOrderId: input.salesOrderId,
			documentType: input.documentType,
			expiry: expiresAt,
		} satisfies SalesDocumentAccessToken);

		const updated = await repository.update({
			id: pending.id,
			storedDocumentId: storedDocument.id,
			generationStatus: "ready",
			generatedAt: new Date(),
			errorMessage: null,
			meta: {
				mode: input.mode,
				dispatchId: input.dispatchId ?? null,
				scopeKey: buildSalesDocumentScopeKey(input),
				templateId: input.templateId || DEFAULT_TEMPLATE_ID,
				accessToken,
				expiresAt,
				title,
			},
		});

		return {
			snapshot: updated,
			accessToken,
			expiresAt,
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

export async function resolveSalesDocumentAccess(
	input: ResolveSalesDocumentAccessInput,
): Promise<ResolveSalesDocumentAccessResult> {
	if (!input.salesIds.length) {
		throw new Error("At least one sales order is required.");
	}

	if (input.salesIds.length !== 1) {
		const accessToken = buildLegacySalesPrintToken({
			salesIds: input.salesIds,
			mode: input.mode,
			dispatchId: input.dispatchId ?? null,
		});
		const baseUrl = resolveBaseUrl(input.baseUrl);
		const previewUrl = `${baseUrl}/p/sales-invoice-v2?token=${encodeURIComponent(accessToken)}&preview=true`;
		const downloadUrl = `${baseUrl}${SALES_DOCUMENT_DOWNLOAD_PATH}?token=${encodeURIComponent(accessToken)}&preview=false&templateId=${encodeURIComponent(input.templateId || DEFAULT_TEMPLATE_ID)}`;
		return {
			kind: "legacy",
			generated: false,
			mode: input.mode,
			documentType: buildSalesDocumentTypeKey(input),
			salesOrderId: null,
			accessToken,
			expiresAt: addDays(new Date(), DEFAULT_LINK_TTL_DAYS).toISOString(),
			previewUrl,
			downloadUrl,
		};
	}

	const salesOrderId = input.salesIds[0];
	const documentType = buildSalesDocumentTypeKey(input);
	const repository = createSalesDocumentSnapshotRepository(input.db);

	if (!input.forceRegenerate) {
		const current = await resolveCurrentSalesDocument(repository, {
			salesOrderId,
			documentType,
		});
		const meta = current ? getSnapshotMeta(current.meta) : {};
		const storedDocument =
			current?.storedDocumentId != null
				? await input.db.storedDocument.findFirst({
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
			isFutureIso(meta.expiresAt)
		) {
			const urls = buildSalesDocumentAccessUrls({
				accessToken: meta.accessToken,
				baseUrl: input.baseUrl,
				templateId: meta.templateId || input.templateId || DEFAULT_TEMPLATE_ID,
			});
			return {
				kind: "snapshot",
				generated: false,
				mode: input.mode,
				documentType,
				salesOrderId,
				snapshotId: current.id,
				accessToken: meta.accessToken,
				expiresAt: meta.expiresAt || null,
				previewUrl: urls.previewUrl,
				downloadUrl: urls.downloadUrl,
			};
		}
	}

	const created = await createSalesPdfSnapshot({
		db: input.db,
		salesOrderId,
		mode: input.mode,
		documentType,
		dispatchId: input.dispatchId ?? null,
		templateId: input.templateId || DEFAULT_TEMPLATE_ID,
		baseUrl: input.baseUrl,
	});

	const urls = buildSalesDocumentAccessUrls({
		accessToken: created.accessToken,
		baseUrl: input.baseUrl,
		templateId: input.templateId || DEFAULT_TEMPLATE_ID,
	});

	return {
		kind: "snapshot",
		generated: true,
		mode: input.mode,
		documentType,
		salesOrderId,
		snapshotId: created.snapshot.id,
		accessToken: created.accessToken,
		expiresAt: created.expiresAt,
		previewUrl: urls.previewUrl,
		downloadUrl: urls.downloadUrl,
	};
}

export async function getSalesSnapshotDocumentByAccessToken(input: {
	db: Db;
	accessToken: string;
}) {
	const payload = validateToken(
		input.accessToken,
		tokenSchemas.salesDocumentAccessToken,
	);
	if (!payload) return null;

	const repository = createSalesDocumentSnapshotRepository(input.db);
	const snapshot = await repository.findById({
		id: payload.snapshotId,
	});
	if (!snapshot) return null;
	if (snapshot.salesOrderId !== payload.salesOrderId) return null;
	if (snapshot.documentType !== payload.documentType) return null;
	if (!snapshot.isCurrent || snapshot.generationStatus !== "ready") return null;
	if (new Date(payload.expiry).getTime() <= Date.now()) return null;

	const storedDocument = snapshot.storedDocumentId
		? await input.db.storedDocument.findFirst({
				where: {
					id: snapshot.storedDocumentId,
					deletedAt: null,
					status: "ready",
				},
				select: {
					id: true,
					url: true,
					pathname: true,
					filename: true,
					mimeType: true,
					status: true,
				},
			})
		: null;
	if (!storedDocument) return null;

	return {
		snapshot,
		storedDocument,
		tokenPayload: payload,
	} satisfies SnapshotDocumentLookup;
}

export async function expireCurrentSalesDocumentSnapshots(input: {
	db: Db;
	salesOrderId: number;
	reason: string;
	documentPrefixes?: string[];
}) {
	const prefixes = input.documentPrefixes?.length
		? input.documentPrefixes
		: [
				SALES_DOCUMENT_BASE_TYPES.invoice,
				SALES_DOCUMENT_BASE_TYPES.production,
				SALES_DOCUMENT_BASE_TYPES["packing-slip"],
				SALES_DOCUMENT_BASE_TYPES["order-packing"],
				SALES_DOCUMENT_BASE_TYPES.quote,
			];

	const currentSnapshots = await input.db.salesDocumentSnapshot.findMany({
		where: {
			salesOrderId: input.salesOrderId,
			isCurrent: true,
			deletedAt: null,
		},
		select: {
			id: true,
			documentType: true,
			meta: true,
		},
	});

	let expiredCount = 0;
	for (const snapshot of currentSnapshots) {
		if (!prefixes.some((prefix) => snapshot.documentType.startsWith(prefix))) {
			continue;
		}
		const meta = getSnapshotMeta(
			snapshot.meta as SalesDocumentSnapshotRecord["meta"],
		);
		await input.db.salesDocumentSnapshot.update({
			where: {
				id: snapshot.id,
			},
			data: {
				generationStatus: "stale",
				isCurrent: false,
				invalidatedAt: new Date(),
				reason: input.reason,
				meta: {
					...meta,
					expiresAt: new Date().toISOString(),
				},
			},
		});
		expiredCount += 1;
	}

	return {
		ok: true,
		expiredCount,
	};
}
