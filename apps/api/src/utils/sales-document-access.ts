import { networkInterfaces } from "node:os";
import type { Db, Prisma } from "@gnd/db";
import { buildOwnerDocumentFolder } from "@gnd/documents";
import { generateQrCodeDataUrl, renderSalesPdfBuffer } from "@gnd/pdf/sales-v2";
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
import {
	PUBLIC_LINK_KINDS,
	PUBLIC_LINK_RESOURCE_TYPES,
	createPublicLinkToken,
	findActivePublicLinkTokenByResource,
	getActivePublicLinkToken,
} from "./public-link-token";
import { createStoredDocumentRegistry } from "./stored-documents";

const DEFAULT_TEMPLATE_ID = "template-2";
const DEFAULT_LINK_TTL_DAYS = 7;
const SALES_DOCUMENT_DOWNLOAD_PATH = "/api/download/sales-v2";
const SALES_DOCUMENT_PREVIEW_PATH = "/p/sales-document-v2";

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
	publicLinkMode?: "public-token" | "access-token" | null;
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

export type ResolveSalesDocumentHtmlPreviewAccessInput = {
	db: Db;
	salesIds: number[];
	mode: PrintMode;
	dispatchId?: number | null;
	templateId?: string | null;
	baseUrl?: string | null;
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

export type ResolveSalesDocumentPreviewDataResult = {
	pages: Awaited<ReturnType<typeof getPrintDocumentData>>["pages"];
	title: string;
	templateId: string;
	companyAddress: Awaited<
		ReturnType<typeof getPrintDocumentData>
	>["companyAddress"];
	watermark: null;
	mode: PrintMode;
	orderNo: string | null;
	salesOrderId: number | null;
	customerEmail: string | null;
	customerName: string | null;
	documentType: string | null;
	previewUrl: string;
	downloadUrl: string;
	qrCodeDataUrl?: string;
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

function isLoopbackHostname(hostname: string) {
	return (
		hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
	);
}

function isPrivateIpv4(value: string) {
	if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) {
		return true;
	}

	if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(value)) {
		return true;
	}

	const private172Match = value.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
	if (!private172Match) {
		return false;
	}

	const secondOctet = Number(private172Match[1]);
	return secondOctet >= 16 && secondOctet <= 31;
}

function getLocalNetworkIp() {
	const envIp = process.env.LOCAL_NETWORK_IP?.trim();
	if (envIp && isPrivateIpv4(envIp)) {
		return envIp;
	}

	for (const addresses of Object.values(networkInterfaces())) {
		for (const address of addresses ?? []) {
			if (
				address.family === "IPv4" &&
				!address.internal &&
				isPrivateIpv4(address.address)
			) {
				return address.address;
			}
		}
	}

	return null;
}

function resolveBaseUrl(baseUrl?: string | null) {
	const resolvedUrl = (
		baseUrl ||
		process.env.NEXT_PUBLIC_APP_URL ||
		"http://localhost:3000"
	).replace(/\/$/, "");

	if (process.env.NODE_ENV === "production") {
		return resolvedUrl;
	}

	try {
		const url = new URL(resolvedUrl);
		if (!isLoopbackHostname(url.hostname)) {
			return resolvedUrl;
		}

		const networkIp = getLocalNetworkIp();
		if (!networkIp) {
			return resolvedUrl;
		}

		url.hostname = networkIp;
		return url.toString().replace(/\/$/, "");
	} catch {
		return resolvedUrl;
	}
}

function buildTemplateSearchParam(templateId?: string | null) {
	const template = templateId || DEFAULT_TEMPLATE_ID;
	return template === DEFAULT_TEMPLATE_ID
		? ""
		: `&templateId=${encodeURIComponent(template)}`;
}

function buildPublicTokenSalesDocumentUrls(input: {
	publicToken: string;
	baseUrl?: string | null;
	templateId?: string | null;
}) {
	const baseUrl = resolveBaseUrl(input.baseUrl);
	const templateParam = buildTemplateSearchParam(input.templateId);
	const previewUrl = `${baseUrl}${SALES_DOCUMENT_PREVIEW_PATH}?pt=${encodeURIComponent(input.publicToken)}${templateParam}`;
	const downloadUrl = `${baseUrl}${SALES_DOCUMENT_DOWNLOAD_PATH}?pt=${encodeURIComponent(input.publicToken)}&preview=false${templateParam}`;
	return { previewUrl, downloadUrl };
}

function buildSalesDocumentAccessUrls(input: {
	accessToken: string;
	baseUrl?: string | null;
	templateId?: string | null;
}) {
	const baseUrl = resolveBaseUrl(input.baseUrl);
	const templateParam = buildTemplateSearchParam(input.templateId);
	const previewUrl = `${baseUrl}${SALES_DOCUMENT_PREVIEW_PATH}?accessToken=${encodeURIComponent(input.accessToken)}${templateParam}`;
	const downloadUrl = `${baseUrl}${SALES_DOCUMENT_DOWNLOAD_PATH}?accessToken=${encodeURIComponent(input.accessToken)}&preview=false${templateParam}`;
	return { previewUrl, downloadUrl };
}

function buildLegacySalesDocumentPreviewUrls(input: {
	token: string;
	baseUrl?: string | null;
	templateId?: string | null;
}) {
	const baseUrl = resolveBaseUrl(input.baseUrl);
	const templateParam = buildTemplateSearchParam(input.templateId);
	const previewUrl = `${baseUrl}${SALES_DOCUMENT_PREVIEW_PATH}?token=${encodeURIComponent(input.token)}${templateParam}`;
	const downloadUrl = `${baseUrl}${SALES_DOCUMENT_DOWNLOAD_PATH}?token=${encodeURIComponent(input.token)}&preview=false${templateParam}`;
	return { previewUrl, downloadUrl };
}

async function ensureSalesDocumentPublicToken(input: {
	db: Db;
	snapshotId: string;
	expiresAt: string;
	templateId?: string | null;
}) {
	const existing = await findActivePublicLinkTokenByResource({
		db: input.db,
		kind: PUBLIC_LINK_KINDS.salesDocumentPreview,
		resourceType: PUBLIC_LINK_RESOURCE_TYPES.salesDocumentSnapshot,
		resourceId: input.snapshotId,
	});
	if (existing) return existing;

	return createPublicLinkToken({
		db: input.db,
		kind: PUBLIC_LINK_KINDS.salesDocumentPreview,
		resourceType: PUBLIC_LINK_RESOURCE_TYPES.salesDocumentSnapshot,
		resourceId: input.snapshotId,
		expiresAt: new Date(input.expiresAt),
		meta: {
			templateId: input.templateId || DEFAULT_TEMPLATE_ID,
		},
	});
}

function getSnapshotMeta(
	meta: SalesDocumentSnapshotRecord["meta"],
): SalesDocumentMeta {
	if (!meta || typeof meta !== "object") return {};
	return meta as SalesDocumentMeta;
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

function isFutureIso(value?: string | null) {
	if (!value) return false;
	const parsed = new Date(value);
	return !Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now();
}

async function loadSalesPreviewRecipient(input: {
	db: Db;
	salesOrderId: number | null | undefined;
}) {
	if (!input.salesOrderId) {
		return {
			customerEmail: null,
			customerName: null,
		};
	}

	const sale = await input.db.salesOrders.findUnique({
		where: {
			id: input.salesOrderId,
		},
		select: {
			customer: {
				select: {
					email: true,
					name: true,
					businessName: true,
				},
			},
			billingAddress: {
				select: {
					email: true,
					name: true,
				},
			},
		},
	});

	return {
		customerEmail:
			sale?.customer?.email?.trim() ||
			sale?.billingAddress?.email?.trim() ||
			null,
		customerName:
			sale?.customer?.name?.trim() ||
			sale?.customer?.businessName?.trim() ||
			sale?.billingAddress?.name?.trim() ||
			null,
	};
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

export function resolveSalesDocumentHtmlPreviewAccess(
	input: ResolveSalesDocumentHtmlPreviewAccessInput,
): ResolveSalesDocumentAccessResult {
	if (!input.salesIds.length) {
		throw new Error("At least one sales order is required.");
	}

	const expiresAt = addDays(new Date(), DEFAULT_LINK_TTL_DAYS).toISOString();
	const accessToken = buildLegacySalesPrintToken({
		salesIds: input.salesIds,
		mode: input.mode,
		dispatchId: input.dispatchId ?? null,
	});
	const { previewUrl, downloadUrl } = buildLegacySalesDocumentPreviewUrls({
		token: accessToken,
		baseUrl: input.baseUrl,
		templateId: input.templateId || DEFAULT_TEMPLATE_ID,
	});

	return {
		kind: "legacy",
		generated: false,
		mode: input.mode,
		documentType: buildSalesDocumentTypeKey(input),
		salesOrderId:
			input.salesIds.length === 1 ? (input.salesIds[0] ?? null) : null,
		accessToken,
		expiresAt,
		previewUrl,
		downloadUrl,
	};
}

export function createSalesDocumentSnapshotRepository(
	db: Db,
): SalesDocumentSnapshotRepository & {
	findById(input: { id: string }): Promise<SalesDocumentSnapshotRecord | null>;
} {
	return {
		async create(input) {
			const record = await db.salesDocumentSnapshot.create({
				data: {
					...input,
					meta: input.meta as Prisma.InputJsonValue | undefined,
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
							: ((data.meta || null) as Prisma.InputJsonValue | null),
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
		async findById(input) {
			const record = await db.salesDocumentSnapshot.findFirst({
				where: {
					id: input.id,
					deletedAt: null,
				},
			});
			return record ? toSalesDocumentSnapshotRecord(record) : null;
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
		const expiresAt = addDays(new Date(), DEFAULT_LINK_TTL_DAYS).toISOString();
		const accessToken = tokenize({
			snapshotId: pending.id,
			salesOrderId: input.salesOrderId,
			documentType: input.documentType,
			expiry: expiresAt,
		} satisfies SalesDocumentAccessToken);
		const publicToken = await ensureSalesDocumentPublicToken({
			db: input.db,
			snapshotId: pending.id,
			expiresAt,
			templateId: input.templateId || DEFAULT_TEMPLATE_ID,
		});
		const accessUrls = buildPublicTokenSalesDocumentUrls({
			publicToken: publicToken.token,
			baseUrl: input.baseUrl,
			templateId: input.templateId || DEFAULT_TEMPLATE_ID,
		});
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
			previewUrl: accessUrls.previewUrl,
		});

		const documentService = createApiVercelBlobDocumentService({
			put: put as unknown as Parameters<
				typeof createApiVercelBlobDocumentService
			>[0]["put"],
		});
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
				publicLinkMode: "public-token",
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
		const { previewUrl, downloadUrl } = buildLegacySalesDocumentPreviewUrls({
			token: accessToken,
			baseUrl: input.baseUrl,
			templateId: input.templateId || DEFAULT_TEMPLATE_ID,
		});
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
			const publicToken = await ensureSalesDocumentPublicToken({
				db: input.db,
				snapshotId: current.id,
				expiresAt:
					meta.expiresAt ||
					addDays(new Date(), DEFAULT_LINK_TTL_DAYS).toISOString(),
				templateId: meta.templateId || input.templateId || DEFAULT_TEMPLATE_ID,
			});
			const urls = buildPublicTokenSalesDocumentUrls({
				publicToken: publicToken.token,
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

	const publicToken = await ensureSalesDocumentPublicToken({
		db: input.db,
		snapshotId: created.snapshot.id,
		expiresAt: created.expiresAt,
		templateId: input.templateId || DEFAULT_TEMPLATE_ID,
	});
	const publicTokenUrls = buildPublicTokenSalesDocumentUrls({
		publicToken: publicToken.token,
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
		previewUrl: publicTokenUrls.previewUrl,
		downloadUrl: publicTokenUrls.downloadUrl,
	};
}

async function getSalesSnapshotDocumentById(input: {
	db: Db;
	snapshotId: string;
}) {
	const repository = createSalesDocumentSnapshotRepository(input.db);
	const snapshot = await repository.findById({
		id: input.snapshotId,
	});
	if (!snapshot) return null;
	if (!snapshot.isCurrent || snapshot.generationStatus !== "ready") return null;
	const meta = getSnapshotMeta(snapshot.meta);
	if (!isFutureIso(meta.expiresAt)) return null;

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
		tokenPayload: null,
	} satisfies Omit<SnapshotDocumentLookup, "tokenPayload"> & {
		tokenPayload: null;
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

export async function getSalesSnapshotDocumentByPublicToken(input: {
	db: Db;
	publicToken: string;
}) {
	const tokenRecord = await getActivePublicLinkToken({
		db: input.db,
		token: input.publicToken,
	});
	if (!tokenRecord) return null;
	if (tokenRecord.kind !== PUBLIC_LINK_KINDS.salesDocumentPreview) return null;
	if (
		tokenRecord.resourceType !==
		PUBLIC_LINK_RESOURCE_TYPES.salesDocumentSnapshot
	) {
		return null;
	}

	return getSalesSnapshotDocumentById({
		db: input.db,
		snapshotId: tokenRecord.resourceId,
	});
}

export async function resolveSalesDocumentPreviewData(input: {
	db: Db;
	publicToken?: string | null;
	token?: string | null;
	accessToken?: string | null;
	snapshotId?: string | null;
	templateId?: string | null;
	baseUrl?: string | null;
}) {
	const templateId = input.templateId || DEFAULT_TEMPLATE_ID;

	if (input.publicToken) {
		const snapshotLookup = await getSalesSnapshotDocumentByPublicToken({
			db: input.db,
			publicToken: input.publicToken,
		});
		if (!snapshotLookup) return null;

		const meta = getSnapshotMeta(snapshotLookup.snapshot.meta);
		const mode = meta.mode;
		if (!mode) return null;

		const documentData = await getPrintDocumentData(input.db, {
			ids: [snapshotLookup.snapshot.salesOrderId],
			mode,
			dispatchId: meta.dispatchId ?? null,
		});
		const recipient = await loadSalesPreviewRecipient({
			db: input.db,
			salesOrderId: snapshotLookup.snapshot.salesOrderId,
		});
		const urls = buildPublicTokenSalesDocumentUrls({
			publicToken: input.publicToken,
			baseUrl: input.baseUrl,
			templateId,
		});
		const qrCodeDataUrl = await generateQrCodeDataUrl(urls.previewUrl);

		return {
			pages: documentData.pages,
			title: documentData.title,
			templateId,
			companyAddress: documentData.companyAddress,
			watermark: null,
			mode,
			orderNo: documentData.firstOrderId ?? null,
			salesOrderId: snapshotLookup.snapshot.salesOrderId,
			customerEmail: recipient.customerEmail,
			customerName: recipient.customerName,
			documentType: snapshotLookup.snapshot.documentType,
			previewUrl: urls.previewUrl,
			downloadUrl: urls.downloadUrl,
			qrCodeDataUrl,
		} satisfies ResolveSalesDocumentPreviewDataResult;
	}

	if (input.snapshotId) {
		const snapshotLookup = await getSalesSnapshotDocumentById({
			db: input.db,
			snapshotId: input.snapshotId,
		});
		if (!snapshotLookup) return null;

		const meta = getSnapshotMeta(snapshotLookup.snapshot.meta);
		const mode = meta.mode;
		if (!mode) return null;

		const documentData = await getPrintDocumentData(input.db, {
			ids: [snapshotLookup.snapshot.salesOrderId],
			mode,
			dispatchId: meta.dispatchId ?? null,
		});
		const recipient = await loadSalesPreviewRecipient({
			db: input.db,
			salesOrderId: snapshotLookup.snapshot.salesOrderId,
		});
		const publicToken = await ensureSalesDocumentPublicToken({
			db: input.db,
			snapshotId: input.snapshotId,
			expiresAt:
				meta.expiresAt ||
				addDays(new Date(), DEFAULT_LINK_TTL_DAYS).toISOString(),
			templateId,
		});
		const urls = buildPublicTokenSalesDocumentUrls({
			publicToken: publicToken.token,
			baseUrl: input.baseUrl,
			templateId,
		});
		const qrCodeDataUrl = await generateQrCodeDataUrl(urls.previewUrl);

		return {
			pages: documentData.pages,
			title: documentData.title,
			templateId,
			companyAddress: documentData.companyAddress,
			watermark: null,
			mode,
			orderNo: documentData.firstOrderId ?? null,
			salesOrderId: snapshotLookup.snapshot.salesOrderId,
			customerEmail: recipient.customerEmail,
			customerName: recipient.customerName,
			documentType: snapshotLookup.snapshot.documentType,
			previewUrl: urls.previewUrl,
			downloadUrl: urls.downloadUrl,
			qrCodeDataUrl,
		} satisfies ResolveSalesDocumentPreviewDataResult;
	}

	if (input.accessToken) {
		const snapshotLookup = await getSalesSnapshotDocumentByAccessToken({
			db: input.db,
			accessToken: input.accessToken,
		});
		if (!snapshotLookup) return null;

		const meta = getSnapshotMeta(snapshotLookup.snapshot.meta);
		const mode = meta.mode;
		if (!mode) return null;

		const documentData = await getPrintDocumentData(input.db, {
			ids: [snapshotLookup.snapshot.salesOrderId],
			mode,
			dispatchId: meta.dispatchId ?? null,
		});
		const recipient = await loadSalesPreviewRecipient({
			db: input.db,
			salesOrderId: snapshotLookup.snapshot.salesOrderId,
		});
		const publicToken = await ensureSalesDocumentPublicToken({
			db: input.db,
			snapshotId: snapshotLookup.snapshot.id,
			expiresAt:
				meta.expiresAt ||
				addDays(new Date(), DEFAULT_LINK_TTL_DAYS).toISOString(),
			templateId,
		});
		const urls = buildPublicTokenSalesDocumentUrls({
			publicToken: publicToken.token,
			baseUrl: input.baseUrl,
			templateId,
		});
		const qrCodeDataUrl = await generateQrCodeDataUrl(urls.previewUrl);

		return {
			pages: documentData.pages,
			title: documentData.title,
			templateId,
			companyAddress: documentData.companyAddress,
			watermark: null,
			mode,
			orderNo: documentData.firstOrderId ?? null,
			salesOrderId: snapshotLookup.snapshot.salesOrderId,
			customerEmail: recipient.customerEmail,
			customerName: recipient.customerName,
			documentType: snapshotLookup.snapshot.documentType,
			previewUrl: urls.previewUrl,
			downloadUrl: urls.downloadUrl,
			qrCodeDataUrl,
		} satisfies ResolveSalesDocumentPreviewDataResult;
	}

	if (!input.token) return null;

	const payload = validateToken(input.token, tokenSchemas.salesPdfToken);
	if (!payload) return null;

	const mode: PrintMode =
		payload.mode === "order"
			? "invoice"
			: payload.mode === "packing list"
				? "packing-slip"
				: payload.mode === "invoice"
					? "invoice"
					: payload.mode === "packing-slip"
						? "packing-slip"
						: payload.mode === "order-packing"
							? "order-packing"
							: payload.mode === "production"
								? "production"
								: "quote";

	const documentData = await getPrintDocumentData(input.db, {
		ids: payload.salesIds,
		mode,
		dispatchId: payload.dispatchId ?? null,
	});
	const recipient = await loadSalesPreviewRecipient({
		db: input.db,
		salesOrderId:
			payload.salesIds.length === 1 ? (payload.salesIds[0] ?? null) : null,
	});
	const urls = buildLegacySalesDocumentPreviewUrls({
		token: input.token,
		baseUrl: input.baseUrl,
		templateId,
	});
	const qrCodeDataUrl = await generateQrCodeDataUrl(urls.previewUrl);

	return {
		pages: documentData.pages,
		title: documentData.title,
		templateId,
		companyAddress: documentData.companyAddress,
		watermark: null,
		mode,
		orderNo:
			payload.salesIds.length === 1
				? (documentData.firstOrderId ?? null)
				: null,
		salesOrderId:
			payload.salesIds.length === 1 ? (payload.salesIds[0] ?? null) : null,
		customerEmail: recipient.customerEmail,
		customerName: recipient.customerName,
		documentType:
			payload.salesIds.length === 1
				? buildSalesDocumentTypeKey({
						mode,
						dispatchId: payload.dispatchId ?? null,
					})
				: null,
		previewUrl: urls.previewUrl,
		downloadUrl: urls.downloadUrl,
		qrCodeDataUrl,
	} satisfies ResolveSalesDocumentPreviewDataResult;
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
