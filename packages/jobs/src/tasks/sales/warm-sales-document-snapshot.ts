import {
	getUserSpecificPermissions,
	mergePermissionRecords,
} from "@gnd/auth/utils";
import { Prisma, db } from "@gnd/db";
import {
	evaluateAssistantAccessState,
	isAssistantPilotRoleAllowed,
} from "@gnd/db/queries";
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
	getAuthorizedCanonicalSalesSource,
	salesDocumentModeRequiresPaymentAccess,
} from "@gnd/sales/assistant-source";
import {
	type SalesDocumentSnapshotRecord,
	type SalesDocumentSnapshotRepository,
	createOrRefreshSalesPrintData,
	isSalesSourceStale,
	resolveCurrentSalesDocument,
	salesPrintDataToPrintDocumentData,
} from "@gnd/sales/pdf-system";
import type { PrintMode } from "@gnd/sales/print/types";
import { generatePermissions } from "@gnd/utils/constants";
import { type SalesDocumentAccessToken, tokenize } from "@gnd/utils/tokenizer";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { del, put } from "@vercel/blob";
import { addDays } from "date-fns";
import {
	type TaskName,
	type WarmSalesDocumentSnapshotPayload,
	warmSalesDocumentSnapshotSchema,
} from "../../schema";
import {
	ASSISTANT_PDF_MAX_ATTEMPTS,
	assistantPdfFailureState,
	cleanupAssistantPdfUpload,
} from "./assistant-pdf-lifecycle";
import { isAssistantPdfGenerationEnabled } from "./assistant-pdf-controls";

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
	assistantJobKey?: string | null;
	sourceRevision?: string | null;
	requestedByUserId?: number | null;
	scopeType?: "organization" | "user" | null;
	scopeId?: string | null;
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
	return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3010").replace(
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

	return isSalesSourceStale({
		sourceUpdatedAt: snapshot.sourceUpdatedAt,
		saleUpdatedAt,
	});
}

async function resolveAssistantPdfAuthorization(
	request: NonNullable<WarmSalesDocumentSnapshotPayload["assistantRequest"]>,
	salesOrderId: number,
	mode: PrintMode,
) {
	if (!isAssistantPdfGenerationEnabled()) return null;

	const [user, specificPermissions, entitlement] = await Promise.all([
		db.users.findFirst({
			where: {
				id: request.userId,
				deletedAt: null,
				accessRevokedAt: null,
			},
			select: {
				roles: {
					where: {
						deletedAt: null,
						organization: { deletedAt: null },
						role: { deletedAt: null },
					},
					orderBy: [
						{ organization: { primary: "desc" as const } },
						{ organizationId: "asc" as const },
					],
					select: {
						organizationId: true,
						role: {
							select: {
								name: true,
								RoleHasPermissions: {
									where: {
										deletedAt: null,
										permission: { deletedAt: null },
									},
									select: {
										permission: { select: { id: true, name: true } },
									},
								},
							},
						},
					},
				},
			},
		}),
		getUserSpecificPermissions(db, request.userId),
		db.assistantUserEntitlement.findUnique({
			where: { userId: request.userId },
			select: { enabled: true, expiresAt: true, version: true },
		}),
	]);
	const access = evaluateAssistantAccessState(
		entitlement,
		new Date(),
		true,
	);
	if (
		!user ||
		!access.enabled ||
		!isAssistantPilotRoleAllowed(
			user.roles.map((entry) => entry.role?.name),
		)
	)
		return null;
	const organizationId = user.roles[0]?.organizationId;
	const role = user.roles[0]?.role;
	const currentScope = organizationId
		? { scopeType: "organization" as const, scopeId: String(organizationId) }
		: { scopeType: "user" as const, scopeId: String(request.userId) };
	if (
		currentScope.scopeType !== request.scopeType ||
		currentScope.scopeId !== request.scopeId
	)
		return null;
	const grants = generatePermissions(
		role?.name,
		mergePermissionRecords(
			role?.RoleHasPermissions.map(({ permission }) => permission) ?? [],
			specificPermissions,
		),
	);
	if (
		!grants.viewOrders ||
		(salesDocumentModeRequiresPaymentAccess(mode) && !grants.viewOrderPayment)
	)
		return null;
	return getAuthorizedCanonicalSalesSource(
		db,
		{
			userId: request.userId,
			...currentScope,
			grants,
		},
		salesOrderId,
	);
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
		},
		update(input: UpdateStoredDocumentRecordInput) {
			const { id, ...data } = input;
			return db.storedDocument.update({
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

async function warmSnapshot(
	payload: WarmSalesDocumentSnapshotPayload,
	attemptNumber = ASSISTANT_PDF_MAX_ATTEMPTS,
	providerRunId?: string,
) {
	const repository = createSalesDocumentSnapshotRepository();
	const documentType = buildSalesDocumentTypeKey({
		mode: payload.mode,
		dispatchId: payload.dispatchId ?? null,
	});

	if (!payload.snapshotId && !payload.forceRegenerate) {
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

	const sourceUpdatedAt = await getSalesOrderSourceUpdatedAt(
		payload.salesOrderId,
	);
	const pending = payload.snapshotId
		? await db.salesDocumentSnapshot.findFirst({
				where: {
					id: payload.snapshotId,
					salesOrderId: payload.salesOrderId,
					documentType,
					generationStatus: "pending",
					isCurrent: true,
					deletedAt: null,
				},
			})
		: await (async () => {
				const latest = await repository.findLatestVersion({
					salesOrderId: payload.salesOrderId,
					documentType,
				});
				await repository.clearCurrentByType?.({
					salesOrderId: payload.salesOrderId,
					documentType,
				});
				return repository.create({
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
			})();
	if (!pending) {
		return {
			ok: false,
			cancelled: true,
			snapshotId: payload.snapshotId ?? null,
			documentType,
		};
	}
	const pendingMeta = getSnapshotMeta(
		pending.meta as SalesDocumentSnapshotRecord["meta"],
	);
	const assistantRequest = payload.assistantRequest;
	if (
		payload.snapshotId &&
		pendingMeta.assistantJobKey &&
		(!assistantRequest ||
			pendingMeta.requestedByUserId !== assistantRequest.userId ||
			pendingMeta.scopeType !== assistantRequest.scopeType ||
			pendingMeta.scopeId !== assistantRequest.scopeId ||
			pendingMeta.sourceRevision !== assistantRequest.sourceRevision)
	) {
		await db.salesDocumentSnapshot.updateMany({
			where: {
				id: pending.id,
				generationStatus: "pending",
				isCurrent: true,
			},
			data: {
				generationStatus: "cancelled",
				isCurrent: false,
				invalidatedAt: new Date(),
				errorMessage: "Assistant PDF authorization context is invalid.",
			},
		});
		return {
			ok: false,
			cancelled: true,
			snapshotId: pending.id,
			documentType,
		};
	}
	if (assistantRequest) {
		const authorized = await resolveAssistantPdfAuthorization(
			assistantRequest,
			payload.salesOrderId,
			payload.mode,
		);
		if (!authorized) {
			await db.salesDocumentSnapshot.updateMany({
				where: {
					id: pending.id,
					generationStatus: "pending",
					isCurrent: true,
				},
				data: {
					generationStatus: "cancelled",
					isCurrent: false,
					invalidatedAt: new Date(),
					errorMessage: "Assistant PDF access is no longer authorized.",
				},
			});
			return {
				ok: false,
				cancelled: true,
				snapshotId: pending.id,
				documentType,
			};
		}
		if (authorized.revision !== assistantRequest.sourceRevision) {
			await db.salesDocumentSnapshot.updateMany({
				where: {
					id: pending.id,
					generationStatus: "pending",
					isCurrent: true,
				},
				data: {
					generationStatus: "stale",
					isCurrent: false,
					invalidatedAt: new Date(),
					errorMessage: null,
				},
			});
			return {
				ok: false,
				stale: true,
				snapshotId: pending.id,
				documentType,
			};
		}
	}
	if (
		payload.snapshotId &&
		!assistantRequest &&
		(!sourceUpdatedAt ||
			!pending.sourceUpdatedAt ||
			sourceUpdatedAt.getTime() !== pending.sourceUpdatedAt.getTime())
	) {
		await db.salesDocumentSnapshot.updateMany({
			where: {
				id: pending.id,
				generationStatus: "pending",
				isCurrent: true,
			},
			data: {
				generationStatus: "stale",
				isCurrent: false,
				invalidatedAt: new Date(),
				errorMessage: null,
			},
		});
		return {
			ok: false,
			stale: true,
			snapshotId: pending.id,
			documentType,
		};
	}
	const claimed = await db.salesDocumentSnapshot.updateMany({
		where: {
			id: pending.id,
			generationStatus: "pending",
			isCurrent: true,
			deletedAt: null,
		},
		data: {
			generationStatus: "generating",
			...(assistantRequest && providerRunId
				? { providerJobId: providerRunId }
				: {}),
		},
	});
	if (claimed.count !== 1) {
		return {
			ok: false,
			cancelled: true,
			snapshotId: pending.id,
			documentType,
		};
	}

	let cleanupGeneratedDocument: (() => Promise<void>) | null = null;
	try {
		const printDataResult = await createOrRefreshSalesPrintData(db, {
			salesOrderId: payload.salesOrderId,
			mode: payload.mode,
			documentType,
			dispatchId: payload.dispatchId ?? null,
			templateId: payload.templateId || DEFAULT_TEMPLATE_ID,
			forceRefresh: payload.forceRegenerate ?? false,
			reason: payload.forceRegenerate ? "manual_regeneration" : "warmup",
		});
		const documentData = salesPrintDataToPrintDocumentData(
			printDataResult.record,
		);

		const title = documentData.title || `sales-${payload.salesOrderId}`;
		const renderStart = Date.now();
		const buffer = await renderSalesPdfBuffer({
			pages: documentData.pages,
			title,
			templateId: payload.templateId || DEFAULT_TEMPLATE_ID,
			companyAddress: documentData.companyAddress,
			logoUrl: documentData.logoUrl ?? undefined,
			baseUrl: resolveBaseUrl(),
		});
		logger.info("Rendered sales PDF snapshot", {
			salesOrderId: payload.salesOrderId,
			documentType,
			templateId: payload.templateId || DEFAULT_TEMPLATE_ID,
			durationMs: Date.now() - renderStart,
			salesPrintDataId: printDataResult.record.id,
		});

		const registry = createDocumentRegistry(createStoredDocumentRepository());
		const documentService = createDocumentService(
			createVercelBlobProvider({
				put: (pathname, body, options) =>
					put(pathname, body as Buffer, {
						...options,
						access: options?.access ?? "public",
					}),
				del,
				token: process.env.BLOB_READ_WRITE_TOKEN,
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
		const uploadStart = Date.now();
		const uploaded = await documentService.upload({
			filename,
			folder,
			body: buffer,
			contentType: "application/pdf",
		});
		logger.info("Uploaded sales PDF snapshot", {
			salesOrderId: payload.salesOrderId,
			documentType,
			templateId: payload.templateId || DEFAULT_TEMPLATE_ID,
			durationMs: Date.now() - uploadStart,
			size: uploaded.size ?? null,
		});
		const cleanupUpload = async (storedDocumentId?: string) => {
			const cleanup = await cleanupAssistantPdfUpload({
				pathname: uploaded.pathname,
				storedDocumentId,
				deleteBlob: (pathname) => documentService.delete({ pathname }),
				markDeleted: (documentId) =>
					db.storedDocument.updateMany({
						where: { id: documentId, deletedAt: null },
						data: {
							isCurrent: false,
							status: "deleted",
							deletedAt: new Date(),
						},
					}),
				markCleanupRequired: (documentId) =>
					db.storedDocument.updateMany({
						where: { id: documentId, deletedAt: null },
						data: { isCurrent: false, status: "cleanup_required" },
					}),
				recordCleanupRequired: () =>
					db.storedDocument.create({
						data: {
							ownerType: "sales_order",
							ownerId: String(payload.salesOrderId),
							ownerKey: documentType,
							kind: buildStoredDocumentKind(documentType),
							provider: uploaded.provider,
							pathname: uploaded.pathname,
							url: uploaded.url,
							filename: uploaded.filename,
							mimeType: uploaded.contentType,
							size: uploaded.size,
							visibility: "public",
							status: "cleanup_required",
							isCurrent: false,
							generated: true,
							sourceType: "sales_document_snapshot",
							sourceId: pending.id,
							description: "Cleanup required after PDF registration failure.",
						},
					}),
			});
			if (cleanup.status === "cleanup_required") {
				logger.error("Sales PDF cleanup requires recovery", {
					salesOrderId: payload.salesOrderId,
					snapshotId: pending.id,
					documentId: storedDocumentId ?? null,
					pathname: uploaded.pathname,
					cleanupError: cleanup.error,
				});
			}
		};
		cleanupGeneratedDocument = () => cleanupUpload();

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
		cleanupGeneratedDocument = () => cleanupUpload(storedDocument.id);

		const expiresAt = addDays(new Date(), DEFAULT_LINK_TTL_DAYS).toISOString();
		const accessToken = tokenize({
			snapshotId: pending.id,
			salesOrderId: payload.salesOrderId,
			documentType,
			expiry: expiresAt,
		} satisfies SalesDocumentAccessToken);
		if (assistantRequest) {
			const authorized = await resolveAssistantPdfAuthorization(
				assistantRequest,
				payload.salesOrderId,
				payload.mode,
			);
			const completionState = !authorized
				? ("cancelled" as const)
				: authorized.revision !== assistantRequest.sourceRevision
					? ("stale" as const)
					: null;
			if (completionState) {
				await cleanupGeneratedDocument();
				await db.salesDocumentSnapshot.updateMany({
					where: {
						id: pending.id,
						generationStatus: "generating",
						isCurrent: true,
					},
					data: {
						generationStatus: completionState,
						isCurrent: false,
						invalidatedAt: new Date(),
						errorMessage:
							completionState === "cancelled"
								? "Assistant PDF access is no longer authorized."
								: null,
					},
				});
				return {
					ok: false,
					...(completionState === "cancelled"
						? { cancelled: true }
						: { stale: true }),
					snapshotId: pending.id,
					documentType,
				};
			}
		}

		const currentBeforeCompletion = await db.salesDocumentSnapshot.findFirst({
			where: {
				id: pending.id,
				generationStatus: "generating",
				isCurrent: true,
				deletedAt: null,
			},
			select: { meta: true },
		});
		if (!currentBeforeCompletion) {
			await cleanupGeneratedDocument();
			return {
				ok: false,
				cancelled: true,
				snapshotId: pending.id,
				documentType,
			};
		}
		const currentMeta = getSnapshotMeta(
			currentBeforeCompletion.meta as SalesDocumentSnapshotRecord["meta"],
		);
		const completed = await db.salesDocumentSnapshot.updateMany({
			where: {
				id: pending.id,
				generationStatus: "generating",
				isCurrent: true,
				deletedAt: null,
			},
			data: {
				storedDocumentId: storedDocument.id,
				generationStatus: "ready",
				sourceUpdatedAt,
				generatedAt: new Date(),
				errorMessage: null,
				meta: {
					...currentMeta,
					mode: payload.mode,
					dispatchId: payload.dispatchId ?? null,
					scopeKey: buildSalesDocumentScopeKey(payload),
					templateId: payload.templateId || DEFAULT_TEMPLATE_ID,
					accessToken,
					expiresAt,
					title,
					...(assistantRequest
						? { sourceRevision: assistantRequest.sourceRevision }
						: {}),
					salesPrintDataId: printDataResult.record.id,
				},
			},
		});
		if (completed.count !== 1) {
			await cleanupGeneratedDocument();
			return {
				ok: false,
				cancelled: true,
				snapshotId: pending.id,
				documentType,
			};
		}
		cleanupGeneratedDocument = null;

		return {
			ok: true,
			reused: false,
			snapshotId: pending.id,
			documentType,
		};
	} catch (error) {
		await cleanupGeneratedDocument?.().catch((cleanupError) => {
			logger.error("Sales PDF failure cleanup could not be recorded", {
				salesOrderId: payload.salesOrderId,
				snapshotId: pending.id,
				cleanupError,
			});
		});
		const failure = assistantPdfFailureState({
			hasAssistantSnapshot: Boolean(payload.snapshotId && assistantRequest),
			attemptNumber,
		});
		await db.salesDocumentSnapshot.updateMany({
			where: {
				id: pending.id,
				generationStatus: { in: ["pending", "generating"] },
			},
			data: {
				...failure,
				failedAt: failure.generationStatus === "failed" ? new Date() : null,
				errorMessage:
					error instanceof Error ? error.message : "Unable to generate PDF.",
			},
		});
		throw error;
	}
}

export const warmSalesDocumentSnapshot = schemaTask({
	id: "warm-sales-document-snapshot" as TaskName,
	schema: warmSalesDocumentSnapshotSchema,
	machine: "micro",
	maxDuration: 300,
	retry: { maxAttempts: ASSISTANT_PDF_MAX_ATTEMPTS },
	run: async (payload, { ctx }) => {
		logger.info("Warming sales document snapshot", payload);
		return warmSnapshot(payload, ctx.attempt.number, ctx.run.id);
	},
});
