import { type Db, Prisma } from "@gnd/db";
import {
	getPrintDocumentData,
	resolveSalesCompanyAddress,
} from "../../print/get-print-document-data";
import type { CompanyAddress, PrintMode, PrintPage } from "../../print/types";
import { isSalesSourceStale } from "./source-freshness";

const DEFAULT_TEMPLATE_ID = "template-2";

export const SALES_PRINT_DOCUMENT_BASE_TYPES = {
	invoice: "invoice_pdf",
	quote: "quote_pdf",
	"packing-slip": "packing_slip_pdf",
	production: "production_pdf",
	"order-packing": "order_packing_pdf",
} as const satisfies Record<PrintMode, string>;

export type SalesPrintDataStatus = "ready" | "stale" | "failed" | string;

export type SalesPrintDataRecord = {
	id: string;
	salesOrderId: number;
	documentType: string;
	templateId: string;
	mode: PrintMode;
	dispatchId?: number | null;
	scopeKey?: string | null;
	title: string;
	firstOrderId?: string | null;
	companyAddress: CompanyAddress;
	pages: PrintPage[];
	sourceUpdatedAt?: Date | null;
	generatedAt?: Date | null;
	invalidatedAt?: Date | null;
	failedAt?: Date | null;
	status: SalesPrintDataStatus;
	reason?: string | null;
	errorMessage?: string | null;
	meta?: Record<string, unknown> | null;
	createdAt?: Date | null;
	updatedAt?: Date | null;
	deletedAt?: Date | null;
};

type SalesPrintDataRow = Omit<
	SalesPrintDataRecord,
	"companyAddress" | "meta" | "mode" | "pages"
> & {
	companyAddress?: Prisma.JsonValue | null;
	meta?: Prisma.JsonValue | null;
	mode: string;
	pages?: Prisma.JsonValue | null;
};

export type ResolveCurrentSalesPrintDataInput = {
	salesOrderId: number;
	mode: PrintMode;
	dispatchId?: number | null;
	templateId?: string | null;
	documentType?: string | null;
	allowStale?: boolean;
};

export type CreateOrRefreshSalesPrintDataInput =
	ResolveCurrentSalesPrintDataInput & {
		forceRefresh?: boolean;
		reason?: string | null;
		meta?: Record<string, unknown> | null;
		loadPrintDocumentData?: typeof getPrintDocumentData;
	};

export type ExpireCurrentSalesPrintDataInput = {
	salesOrderId: number;
	reason: string;
	documentPrefixes?: string[];
};

export function buildSalesPrintDocumentTypeKey(input: {
	mode: PrintMode;
	dispatchId?: number | null;
}) {
	const baseType = SALES_PRINT_DOCUMENT_BASE_TYPES[input.mode];
	if (input.mode === "packing-slip" && input.dispatchId) {
		return `${baseType}:dispatch:${input.dispatchId}`;
	}
	return baseType;
}

export function buildSalesPrintDocumentScopeKey(input: {
	mode: PrintMode;
	dispatchId?: number | null;
}) {
	if (input.mode === "packing-slip" && input.dispatchId) {
		return `dispatch:${input.dispatchId}`;
	}
	return "order";
}

export function buildSalesPrintStoredDocumentKind(documentType: string) {
	return `sales_pdf_snapshot:${documentType}`;
}

export function salesPrintDataToPrintDocumentData(
	record: SalesPrintDataRecord,
) {
	return {
		pages: record.pages,
		title: record.title,
		firstOrderId: record.firstOrderId ?? null,
		companyAddress: record.companyAddress,
	};
}

export async function createOrRefreshBatchSalesPrintData(
	db: Db,
	input: Omit<CreateOrRefreshSalesPrintDataInput, "salesOrderId"> & {
		salesOrderIds: number[];
	},
) {
	const results = await Promise.all(
		input.salesOrderIds.map(async (salesOrderId) => {
			return createOrRefreshSalesPrintData(db, {
				...input,
				salesOrderId,
				reason: input.reason ?? "batch_print",
				meta: {
					...(input.meta ?? {}),
					batchSalesOrderIds: input.salesOrderIds,
				},
			});
		}),
	);
	const records = results.map((result) => result.record);
	const pages = records.flatMap((record) => record.pages);
	const firstRecord = records[0] ?? null;
	const generatedCount = results.filter((result) => result.generated).length;

	logSalesPrintCache("batchResolved", {
		mode: input.mode,
		dispatchId: input.dispatchId ?? null,
		templateId: input.templateId || DEFAULT_TEMPLATE_ID,
		salesOrderIds: input.salesOrderIds,
		records: records.length,
		pages: pages.length,
		generatedCount,
	});

	return {
		records,
		pages,
		title:
			records.length === 1 && firstRecord
				? firstRecord.title
				: sanitizePrintTitle(`Sales Print (${pages.length})`),
		firstOrderId: firstRecord?.firstOrderId ?? null,
		companyAddress:
			firstRecord?.companyAddress ?? resolveSalesCompanyAddress(null),
	};
}

export async function resolveCurrentSalesPrintData(
	db: Db,
	input: ResolveCurrentSalesPrintDataInput,
): Promise<SalesPrintDataRecord | null> {
	const templateId = input.templateId || DEFAULT_TEMPLATE_ID;
	const documentType =
		input.documentType ||
		buildSalesPrintDocumentTypeKey({
			mode: input.mode,
			dispatchId: input.dispatchId ?? null,
		});
	const current = await findSalesPrintData(db, {
		salesOrderId: input.salesOrderId,
		documentType,
		templateId,
	});

	if (!current) return null;
	if (current.status !== "ready" && !input.allowStale) return null;
	if (
		!input.allowStale &&
		(await isSalesPrintDataStale(db, {
			salesOrderId: current.salesOrderId,
			sourceUpdatedAt: current.sourceUpdatedAt ?? null,
		}))
	) {
		return null;
	}

	return toSalesPrintDataRecord(current);
}

export async function createOrRefreshSalesPrintData(
	db: Db,
	input: CreateOrRefreshSalesPrintDataInput,
): Promise<{
	record: SalesPrintDataRecord;
	generated: boolean;
	cacheStatus: "hit" | "miss" | "stale" | "failed" | "forced";
}> {
	const templateId = input.templateId || DEFAULT_TEMPLATE_ID;
	const documentType =
		input.documentType ||
		buildSalesPrintDocumentTypeKey({
			mode: input.mode,
			dispatchId: input.dispatchId ?? null,
		});
	const current = await findSalesPrintData(db, {
		salesOrderId: input.salesOrderId,
		documentType,
		templateId,
	});
	const isStale = current
		? await isSalesPrintDataStale(db, {
				salesOrderId: current.salesOrderId,
				sourceUpdatedAt: current.sourceUpdatedAt ?? null,
			})
		: false;

	if (!input.forceRefresh && current?.status === "ready" && !isStale) {
		logSalesPrintCache("hit", {
			salesOrderId: input.salesOrderId,
			documentType,
			templateId,
			salesPrintDataId: current.id,
		});
		return {
			record: toSalesPrintDataRecord(current),
			generated: false,
			cacheStatus: "hit",
		};
	}

	const cacheStatus = input.forceRefresh
		? "forced"
		: !current
			? "miss"
			: current.status === "failed"
				? "failed"
				: "stale";

	logSalesPrintCache(cacheStatus, {
		salesOrderId: input.salesOrderId,
		documentType,
		templateId,
		status: current?.status ?? null,
	});

	const sourceUpdatedAt = await getSalesOrderSourceUpdatedAt(db, {
		salesOrderId: input.salesOrderId,
	});

	try {
		const loadPrintDocumentData =
			input.loadPrintDocumentData ?? getPrintDocumentData;
		const printDataStart = Date.now();
		const documentData = await loadPrintDocumentData(db, {
			ids: [input.salesOrderId],
			mode: input.mode,
			dispatchId: input.dispatchId ?? null,
		});
		logSalesPrintCache("getPrintDocumentData", {
			salesOrderId: input.salesOrderId,
			documentType,
			templateId,
			durationMs: Date.now() - printDataStart,
			pages: documentData.pages.length,
		});

		if (!documentData.pages.length) {
			throw new Error("No printable pages found for this sales document.");
		}

		const data = {
			salesOrderId: input.salesOrderId,
			documentType,
			templateId,
			mode: input.mode,
			dispatchId: input.dispatchId ?? null,
			scopeKey: buildSalesPrintDocumentScopeKey({
				mode: input.mode,
				dispatchId: input.dispatchId ?? null,
			}),
			title: documentData.title || `sales-${input.salesOrderId}`,
			firstOrderId: documentData.firstOrderId ?? null,
			companyAddress:
				documentData.companyAddress as unknown as Prisma.InputJsonValue,
			pages: documentData.pages as unknown as Prisma.InputJsonValue,
			sourceUpdatedAt,
			generatedAt: new Date(),
			invalidatedAt: null,
			failedAt: null,
			status: "ready",
			reason: input.reason ?? null,
			errorMessage: null,
			meta: input.meta
				? (input.meta as Prisma.InputJsonValue)
				: Prisma.JsonNull,
			deletedAt: null,
		};

		const record = current
			? await db.salesPrintData.update({
					where: { id: current.id },
					data,
				})
			: await db.salesPrintData.create({
					data,
				});

		logSalesPrintCache("refreshed", {
			salesOrderId: input.salesOrderId,
			documentType,
			templateId,
			salesPrintDataId: record.id,
			cacheStatus,
		});

		return {
			record: toSalesPrintDataRecord(record),
			generated: true,
			cacheStatus,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error
				? error.message
				: "Unable to generate sales print data.";
		await markSalesPrintDataFailed(db, {
			currentId: current?.id ?? null,
			salesOrderId: input.salesOrderId,
			documentType,
			templateId,
			mode: input.mode,
			dispatchId: input.dispatchId ?? null,
			sourceUpdatedAt,
			reason: input.reason ?? cacheStatus,
			errorMessage,
			meta: input.meta ?? null,
		});
		logSalesPrintCache("failed", {
			salesOrderId: input.salesOrderId,
			documentType,
			templateId,
			error: errorMessage,
		});
		throw error;
	}
}

export async function expireCurrentSalesPrintData(
	db: Db,
	input: ExpireCurrentSalesPrintDataInput,
) {
	const prefixes = input.documentPrefixes?.length
		? input.documentPrefixes
		: Object.values(SALES_PRINT_DOCUMENT_BASE_TYPES);
	const currentPrintData = await db.salesPrintData.findMany({
		where: {
			salesOrderId: input.salesOrderId,
			deletedAt: null,
			status: "ready",
		},
		select: {
			id: true,
			documentType: true,
			meta: true,
		},
	});

	let expiredCount = 0;
	for (const printData of currentPrintData) {
		if (!prefixes.some((prefix) => printData.documentType.startsWith(prefix))) {
			continue;
		}
		await db.salesPrintData.update({
			where: {
				id: printData.id,
			},
			data: {
				status: "stale",
				invalidatedAt: new Date(),
				reason: input.reason,
				meta: mergeJsonObject(printData.meta, {
					invalidatedReason: input.reason,
				}) as Prisma.InputJsonValue,
			},
		});
		expiredCount += 1;
	}

	logSalesPrintCache("expired", {
		salesOrderId: input.salesOrderId,
		reason: input.reason,
		expiredCount,
		prefixes,
	});

	return {
		ok: true,
		expiredCount,
	};
}

async function findSalesPrintData(
	db: Db,
	input: {
		salesOrderId: number;
		documentType: string;
		templateId: string;
	},
): Promise<SalesPrintDataRow | null> {
	return db.salesPrintData.findFirst({
		where: {
			salesOrderId: input.salesOrderId,
			documentType: input.documentType,
			templateId: input.templateId,
			deletedAt: null,
		},
	});
}

async function getSalesOrderSourceUpdatedAt(
	db: Db,
	input: { salesOrderId: number },
) {
	const sale = await db.salesOrders.findUnique({
		where: {
			id: input.salesOrderId,
		},
		select: {
			updatedAt: true,
		},
	});

	return sale?.updatedAt ?? null;
}

async function isSalesPrintDataStale(
	db: Db,
	input: { salesOrderId: number; sourceUpdatedAt?: Date | null },
) {
	const saleUpdatedAt = await getSalesOrderSourceUpdatedAt(db, {
		salesOrderId: input.salesOrderId,
	});

	if (!saleUpdatedAt) return false;
	if (!input.sourceUpdatedAt) return true;

	return isSalesSourceStale({
		sourceUpdatedAt: input.sourceUpdatedAt,
		saleUpdatedAt,
	});
}

async function markSalesPrintDataFailed(
	db: Db,
	input: {
		currentId?: string | null;
		salesOrderId: number;
		documentType: string;
		templateId: string;
		mode: PrintMode;
		dispatchId?: number | null;
		sourceUpdatedAt?: Date | null;
		reason?: string | null;
		errorMessage: string;
		meta?: Record<string, unknown> | null;
	},
) {
	const data = {
		salesOrderId: input.salesOrderId,
		documentType: input.documentType,
		templateId: input.templateId,
		mode: input.mode,
		dispatchId: input.dispatchId ?? null,
		scopeKey: buildSalesPrintDocumentScopeKey({
			mode: input.mode,
			dispatchId: input.dispatchId ?? null,
		}),
		title: `sales-${input.salesOrderId}`,
		firstOrderId: null,
		companyAddress: {} as Prisma.InputJsonValue,
		pages: [] as unknown as Prisma.InputJsonValue,
		sourceUpdatedAt: input.sourceUpdatedAt ?? null,
		failedAt: new Date(),
		status: "failed",
		reason: input.reason ?? null,
		errorMessage: input.errorMessage,
		meta: input.meta ? (input.meta as Prisma.InputJsonValue) : Prisma.JsonNull,
	};

	if (input.currentId) {
		await db.salesPrintData.update({
			where: { id: input.currentId },
			data,
		});
		return;
	}

	await db.salesPrintData.create({
		data,
	});
}

function toSalesPrintDataRecord(row: SalesPrintDataRow): SalesPrintDataRecord {
	return {
		...row,
		mode: row.mode as PrintMode,
		companyAddress: (row.companyAddress || {}) as unknown as CompanyAddress,
		pages: (row.pages || []) as unknown as PrintPage[],
		meta: mergeJsonObject(row.meta),
	};
}

function mergeJsonObject(
	value?: Prisma.JsonValue | null,
	extra?: Record<string, unknown>,
) {
	const base =
		value && typeof value === "object" && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: {};
	return extra ? { ...base, ...extra } : base;
}

function logSalesPrintCache(
	event: string,
	payload: Record<string, unknown> = {},
) {
	console.info("[sales-print-data-cache]", event, payload);
}

function sanitizePrintTitle(value: string) {
	return value.replace(/[^\w\-]+/g, "_");
}
