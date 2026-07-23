import {
	bulkAssignDispatchDriver,
	bulkCancelDispatches,
	exportDispatches,
	findDuplicateDispatchGroups,
	getDeletedDispatches,
	getDispatchOverview,
	getDispatchOverviewV2,
	getDispatchSummary,
	getDispatches,
	getPackingList,
	getPackingQueue,
	getSalesDeliveryInfo,
	resolveDuplicateDispatchGroup,
	restoreDispatch,
	sendSaleForPickup,
	signPackingSlip,
	updateDispatchDriver,
	updateDispatchDueDate,
	updateDispatchStatus,
	updateSalesDeliveryOption,
} from "@api/db/queries/dispatch";
import {
	type DispatchCompletionProof,
	buildDispatchSignatureSvg,
	canResignPackingSlip,
	completeDispatchWithProofSchema,
	createDispatchCompletionProof,
	decodePngSignatureDataUrl,
	getDispatchCompletionPayloadFingerprint,
	getDispatchCompletionProof,
	getDispatchProofFilename,
	isDispatchCompletionProofStale,
	mergeDispatchCompletionProof,
} from "@api/db/queries/dispatch-proof-completion";
import { auth } from "@api/db/queries/user";
import {
	bulkAssignDriverSchema,
	bulkCancelDispatchSchema,
	dispatchQueryParamsSchema,
	exportDispatchesSchema,
	packingListQuerySchema,
	resolveDuplicateDispatchGroupSchema,
	salesDispatchOverviewSchema,
	sendSaleForPickupSchema,
	signPackingSlipSchema,
	updateDispatchDriverSchema,
	updateDispatchDueDateSchema,
	updateDispatchStatusSchema,
	updateSalesDeliveryOptionSchema,
} from "@api/schemas/sales";
import { createApiVercelBlobDocumentService } from "@api/utils/documents";
import { requireAnyOperationalPermission } from "@api/utils/operational-route-access";
import { registerStoredDocumentUpload } from "@api/utils/stored-documents";
import { finalizeUploadedDocument } from "@api/utils/upload-finalization";
import { decodeValidatedDocumentBase64 } from "@api/utils/upload-validation";
import type { Db, TransactionClient } from "@gnd/db";
import type { DevLogEntry } from "@gnd/dev-logger";
import { appendDevLogEntryToFile } from "@gnd/dev-logger/file-sink";
import { buildOwnerDocumentFolder } from "@gnd/documents";
import type { DeliveryOption } from "@gnd/utils/sales";
import { NotificationService } from "@notifications/services/triggers";
import {
	cancelDispatchTask,
	createDispatchSchema,
	deletePackingItem,
	deletePackingSchema,
	getSalesDispatchOverview,
	packDispatchItemTask,
	startDispatchTask,
	submitDispatchTask,
	submitNonProductionsTask,
	updateSalesControlSchema,
} from "@sales/exports";
import type { UpdateSalesControl } from "@sales/exports";
import type { SalesDispatchStatus } from "@sales/types";
import { tasks } from "@trigger.dev/sdk/v3";
import { TRPCError } from "@trpc/server";
import { del, put } from "@vercel/blob";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";
import type { TRPCContext } from "../init";

function getDispatchNotificationService(ctx: TRPCContext) {
	return new NotificationService(tasks, {
		db: ctx.db,
		userId: ctx.userId,
	});
}

function normalizeDispatchDeliveryMode(value: string | null | undefined) {
	return value === "pickup" || value === "delivery" ? value : undefined;
}

function asJsonRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

const PACKING_SIGNOFF_LEASE_MS = 60 * 60 * 1000;

async function requireDispatchManager(ctx: TRPCContext) {
	return requireAnyOperationalPermission(
		ctx,
		["editPickup", "editOrders", "viewPacking"],
		"You do not have permission to manage dispatches.",
	);
}

async function requirePackingOperator(ctx: TRPCContext) {
	return requireAnyOperationalPermission(
		ctx,
		["viewPacking", "editPickup", "editOrders"],
		"You do not have permission to manage packing.",
	);
}

async function requireDispatchWorker(ctx: TRPCContext) {
	return requireAnyOperationalPermission(
		ctx,
		["viewDelivery", "editDelivery", "viewPickup", "editPickup", "viewPacking"],
		"You do not have permission to update dispatch proof.",
	);
}

async function requireAssignedDispatchOrManager(
	ctx: TRPCContext & { userId: number },
	dispatchId: number | null | undefined,
) {
	const session = await auth(ctx);
	if (
		session.can.editPickup ||
		session.can.editOrders ||
		session.can.viewPacking
	) {
		return session;
	}
	if (
		!session.can.viewDelivery &&
		!session.can.viewPickup &&
		!session.can.viewPacking
	) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You do not have permission to update this dispatch.",
		});
	}
	const dispatch = dispatchId
		? await ctx.db.orderDelivery.findFirst({
				where: {
					id: dispatchId,
					deletedAt: null,
				},
				select: {
					driverId: true,
				},
			})
		: null;
	if (dispatch?.driverId === ctx.userId) return session;
	throw new TRPCError({
		code: "FORBIDDEN",
		message:
			"Only the assigned driver or a dispatch manager can update this trip.",
	});
}

export const dispatchRouters = createTRPCRouter({
	index: publicProcedure
		.input(dispatchQueryParamsSchema)
		.query(async (props) => {
			return getDispatches(props.ctx, props.input);
		}),
	assignedDispatch: publicProcedure
		.input(dispatchQueryParamsSchema)
		.query(async (props) => {
			if (!props.ctx.userId) {
				return getDispatches(props.ctx, props.input);
			}
			props.input.driversId = [props.ctx.userId];
			return getDispatches(props.ctx, props.input);
		}),
	deletePackingItem: protectedProcedure
		.input(deletePackingSchema)
		.mutation(async (props) => {
			await requirePackingOperator(props.ctx);
			return deletePackingItem(props.ctx.db, props.input);
		}),
	cancelDispatch: protectedProcedure
		.input(updateSalesControlSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			const response = await cancelDispatchTask(props.ctx.db, props.input);
			const dispatchId = props.input.cancelDispatch?.dispatchId;
			if (dispatchId) {
				const dispatch = await props.ctx.db.orderDelivery.findFirst({
					where: {
						id: dispatchId,
						deletedAt: null,
					},
					select: {
						id: true,
						status: true,
						dueDate: true,
						deliveryMode: true,
						driverId: true,
						order: {
							select: {
								orderId: true,
							},
						},
					},
				});
				if (dispatch?.status === "cancelled") {
					await getDispatchNotificationService(props.ctx).send(
						"sales_dispatch_trip_canceled",
						{
							payload: {
								orderNo: dispatch.order?.orderId || undefined,
								dispatchId: dispatch.id,
								deliveryMode: normalizeDispatchDeliveryMode(
									dispatch.deliveryMode,
								),
								dueDate: dispatch.dueDate || undefined,
								driverId: dispatch.driverId || undefined,
							},
						},
					);
				}
			}
			return response;
		}),
	startDispatch: protectedProcedure
		.input(updateSalesControlSchema)
		.mutation(async (props) => {
			await requireAssignedDispatchOrManager(
				props.ctx,
				props.input.startDispatch?.dispatchId,
			);
			const response = await startDispatchTask(props.ctx.db, props.input);
			const dispatchId = props.input.startDispatch?.dispatchId;
			if (dispatchId) {
				const dispatch = await props.ctx.db.orderDelivery.findFirst({
					where: {
						id: dispatchId,
						deletedAt: null,
					},
					select: {
						id: true,
						status: true,
						dueDate: true,
						deliveryMode: true,
						driverId: true,
						order: {
							select: {
								orderId: true,
							},
						},
					},
				});
				if (dispatch?.status === "in progress") {
					await getDispatchNotificationService(props.ctx).send(
						"sales_dispatch_in_progress",
						{
							payload: {
								orderNo: dispatch.order?.orderId || undefined,
								dispatchId: dispatch.id,
								deliveryMode: normalizeDispatchDeliveryMode(
									dispatch.deliveryMode,
								),
								dueDate: dispatch.dueDate || undefined,
								driverId: dispatch.driverId || undefined,
							},
						},
					);
				}
			}
			return response;
		}),
	submitDispatch: protectedProcedure
		.input(updateSalesControlSchema)
		.mutation(async (props) => {
			await requireAssignedDispatchOrManager(
				props.ctx,
				props.input.submitDispatch?.dispatchId,
			);
			return submitDispatchTask(props.ctx.db, props.input);
		}),
	completeDispatchWithProof: protectedProcedure
		.input(completeDispatchWithProofSchema)
		.mutation(async (props) => {
			const session = await requireAssignedDispatchOrManager(
				props.ctx,
				props.input.dispatchId,
			);
			const dispatch = await props.ctx.db.orderDelivery.findFirst({
				where: {
					id: props.input.dispatchId,
					deletedAt: null,
				},
				select: {
					id: true,
					salesOrderId: true,
					status: true,
					deliveryMode: true,
					dueDate: true,
					driverId: true,
					meta: true,
					order: {
						select: {
							orderId: true,
						},
					},
				},
			});
			if (!dispatch) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Dispatch not found.",
				});
			}

			const payloadFingerprint = getDispatchCompletionPayloadFingerprint(
				props.input,
			);
			const assertProofFingerprint = (
				candidate: DispatchCompletionProof | null,
			) => {
				if (
					candidate?.requestId === props.input.requestId &&
					candidate.payloadFingerprint &&
					candidate.payloadFingerprint !== payloadFingerprint
				) {
					throw new TRPCError({
						code: "CONFLICT",
						message:
							"Completion request id was already used for different proof content.",
					});
				}
			};
			const existingCompletion = getDispatchCompletionProof(dispatch.meta);
			assertProofFingerprint(existingCompletion);
			if (dispatch.status === "completed") {
				if (existingCompletion?.requestId !== props.input.requestId) {
					throw new TRPCError({
						code: "CONFLICT",
						message: "This dispatch was already completed.",
					});
				}
				return {
					status: "completed" as const,
					idempotent: true,
					signature: existingCompletion.signaturePathname,
					signatureDocumentId: existingCompletion.signatureDocumentId,
					attachments: existingCompletion.attachments.map((attachment) => ({
						pathname: attachment.pathname,
						documentId: attachment.documentId,
					})),
				};
			}

			let completion = createDispatchCompletionProof(
				dispatch.meta,
				props.input.requestId,
				new Date(),
				payloadFingerprint,
			);
			let ownsStagedRequest =
				existingCompletion?.requestId === props.input.requestId;
			const persistCompletion = async () => {
				await props.ctx.db.$transaction(
					async (tx) => {
						const current = await tx.orderDelivery.findFirst({
							where: {
								id: dispatch.id,
								deletedAt: null,
							},
							select: {
								status: true,
								meta: true,
							},
						});
						if (!current) {
							throw new TRPCError({
								code: "NOT_FOUND",
								message: "Dispatch not found.",
							});
						}

						const currentCompletion = getDispatchCompletionProof(current.meta);
						assertProofFingerprint(currentCompletion);
						if (current.status === "completed") {
							if (currentCompletion?.requestId !== props.input.requestId) {
								throw new TRPCError({
									code: "CONFLICT",
									message: "This dispatch was already completed.",
								});
							}
							completion = currentCompletion;
							ownsStagedRequest = true;
							return;
						}

						if (
							ownsStagedRequest &&
							currentCompletion?.requestId !== props.input.requestId
						) {
							throw new TRPCError({
								code: "CONFLICT",
								message:
									"Another completion request replaced this proof upload.",
							});
						}
						if (
							!ownsStagedRequest &&
							currentCompletion?.requestId === props.input.requestId
						) {
							completion = currentCompletion;
							ownsStagedRequest = true;
							return;
						}
						if (
							!ownsStagedRequest &&
							currentCompletion?.status === "uploading" &&
							currentCompletion.requestId !== props.input.requestId &&
							!isDispatchCompletionProofStale(currentCompletion)
						) {
							throw new TRPCError({
								code: "CONFLICT",
								message:
									"Another dispatch completion upload is already in progress.",
							});
						}
						if (
							!ownsStagedRequest &&
							currentCompletion?.status === "uploading" &&
							currentCompletion.requestId !== props.input.requestId &&
							isDispatchCompletionProofStale(currentCompletion)
						) {
							const abandonedDocumentIds = [
								currentCompletion.signatureDocumentId,
								...currentCompletion.attachments.map(
									(attachment) => attachment.documentId,
								),
							].filter((id): id is string => Boolean(id));
							if (abandonedDocumentIds.length) {
								await tx.storedDocument.updateMany({
									where: {
										id: { in: abandonedDocumentIds },
										ownerType: "dispatch",
										ownerId: String(dispatch.id),
										deletedAt: null,
									},
									data: {
										status: "failed",
										isCurrent: false,
									},
								});
							}
						}

						await tx.orderDelivery.update({
							where: {
								id: dispatch.id,
							},
							data: {
								meta: mergeDispatchCompletionProof(current.meta, completion),
							},
						});
						ownsStagedRequest = true;
					},
					{ isolationLevel: "Serializable" },
				);
			};
			const checkpointRegisteredProof = async (
				tx: TransactionClient,
				nextCompletion: DispatchCompletionProof,
				registeredDocumentId: string,
			) => {
				const current = await tx.orderDelivery.findFirst({
					where: { id: dispatch.id, deletedAt: null },
					select: { status: true, meta: true },
				});
				const currentCompletion = getDispatchCompletionProof(current?.meta);
				if (currentCompletion?.requestId !== props.input.requestId) {
					throw new Error("Dispatch proof ownership changed.");
				}
				assertProofFingerprint(currentCompletion);
				const alreadyCheckpointed =
					currentCompletion.signatureDocumentId === registeredDocumentId ||
					currentCompletion.attachments.some(
						(attachment) => attachment.documentId === registeredDocumentId,
					);
				if (alreadyCheckpointed) return;
				if (current?.status === "completed") {
					throw new Error(
						"Dispatch completed before this proof document was checkpointed.",
					);
				}
				await tx.orderDelivery.update({
					where: { id: dispatch.id },
					data: {
						meta: mergeDispatchCompletionProof(current?.meta, nextCompletion),
					},
				});
			};
			await persistCompletion();

			const documents = createApiVercelBlobDocumentService({
				put,
				addRandomSuffix: false,
				allowOverwrite: true,
			});
			const proofFolder = `dispatch/${dispatch.id}/completion`;
			if (!completion.signaturePathname) {
				const signature = await documents.upload({
					filename: getDispatchProofFilename(
						props.input.requestId,
						"signature",
					),
					folder: proofFolder,
					contentType: "image/svg+xml",
					body: buildDispatchSignatureSvg(props.input.signaturePath),
				});
				let storedSignature: Awaited<
					ReturnType<typeof registerStoredDocumentUpload>
				>;
				try {
					storedSignature = await finalizeUploadedDocument({
						pathname: signature.pathname,
						deleteUpload: del,
						register: () =>
							registerStoredDocumentUpload(
								props.ctx.db,
								{
									ownerType: "dispatch",
									ownerId: String(dispatch.id),
									ownerKey: `completion:${props.input.requestId}:signature`,
									kind: "signature",
									upload: signature,
									isCurrent: false,
									uploadedBy: props.ctx.userId,
									sourceType: "dispatch_completion_request",
									sourceId: props.input.requestId,
									meta: {
										workflow: "dispatch_completion",
									},
								},
								{
									onRegistered: (tx, document) =>
										checkpointRegisteredProof(
											tx,
											{
												...completion,
												signaturePathname: signature.url || signature.pathname,
												signatureDocumentId: document.id,
											},
											document.id,
										),
								},
							),
						finalize: async (document) => document,
						markFailed: (document) =>
							props.ctx.db.storedDocument.update({
								where: { id: document.id },
								data: {
									status: "failed",
									isCurrent: false,
									deletedAt: new Date(),
								},
							}),
					});
				} catch (error) {
					await props.ctx.db.storedDocument.updateMany({
						where: {
							provider: signature.provider,
							pathname: signature.pathname,
							ownerType: "dispatch",
							ownerId: String(dispatch.id),
							sourceType: "dispatch_completion_request",
							sourceId: props.input.requestId,
							isCurrent: false,
							deletedAt: null,
						},
						data: {
							status: "failed",
							deletedAt: new Date(),
						},
					});
					throw error;
				}
				completion = {
					...completion,
					signaturePathname: signature.url || signature.pathname,
					signatureDocumentId: storedSignature.id,
				};
			}

			for (const attachment of props.input.attachments) {
				if (
					completion.attachments.some(
						(uploaded) => uploaded.clientId === attachment.clientId,
					)
				) {
					continue;
				}
				const uploaded = await documents.upload({
					filename: getDispatchProofFilename(
						props.input.requestId,
						"attachment",
						attachment.clientId,
					),
					folder: proofFolder,
					contentType: attachment.contentType,
					body: decodeValidatedDocumentBase64({
						content: attachment.base64,
						contentType: attachment.contentType,
						maxBytes: 5_500_000,
					}),
				});
				let storedAttachment: Awaited<
					ReturnType<typeof registerStoredDocumentUpload>
				>;
				try {
					storedAttachment = await finalizeUploadedDocument({
						pathname: uploaded.pathname,
						deleteUpload: del,
						register: () =>
							registerStoredDocumentUpload(
								props.ctx.db,
								{
									ownerType: "dispatch",
									ownerId: String(dispatch.id),
									ownerKey: `completion:${props.input.requestId}:${attachment.clientId}`,
									kind: "dispatch_image",
									upload: uploaded,
									isCurrent: false,
									uploadedBy: props.ctx.userId,
									sourceType: "dispatch_completion_request",
									sourceId: props.input.requestId,
									title: attachment.fileName,
									meta: {
										workflow: "dispatch_completion",
										clientId: attachment.clientId,
									},
								},
								{
									onRegistered: (tx, document) =>
										checkpointRegisteredProof(
											tx,
											{
												...completion,
												attachments: [
													...completion.attachments,
													{
														clientId: attachment.clientId,
														pathname: uploaded.url || uploaded.pathname,
														documentId: document.id,
													},
												],
											},
											document.id,
										),
								},
							),
						finalize: async (document) => document,
						markFailed: (document) =>
							props.ctx.db.storedDocument.update({
								where: { id: document.id },
								data: {
									status: "failed",
									isCurrent: false,
									deletedAt: new Date(),
								},
							}),
					});
				} catch (error) {
					await props.ctx.db.storedDocument.updateMany({
						where: {
							provider: uploaded.provider,
							pathname: uploaded.pathname,
							ownerType: "dispatch",
							ownerId: String(dispatch.id),
							sourceType: "dispatch_completion_request",
							sourceId: props.input.requestId,
							isCurrent: false,
							deletedAt: null,
						},
						data: {
							status: "failed",
							deletedAt: new Date(),
						},
					});
					throw error;
				}
				completion = {
					...completion,
					attachments: [
						...completion.attachments,
						{
							clientId: attachment.clientId,
							pathname: uploaded.url || uploaded.pathname,
							documentId: storedAttachment.id,
						},
					],
				};
			}

			const meta = {
				salesId: dispatch.salesOrderId,
				authorId: props.ctx.userId,
				authorName: session.name || "Dispatch worker",
			};
			if (dispatch.deliveryMode === "pickup") {
				await packDispatchItemTask(props.ctx.db, {
					meta,
					packItems: {
						dispatchId: dispatch.id,
						dispatchStatus: (dispatch.status as SalesDispatchStatus) || "queue",
						packMode: "all",
						replaceExisting: true,
					},
				} as UpdateSalesControl);
			}

			const response = await submitDispatchTask(props.ctx.db, {
				meta,
				submitDispatch: {
					dispatchId: dispatch.id,
					receivedBy: props.input.receivedBy,
					receivedDate: props.input.receivedDate || new Date(),
					note: props.input.note,
					noteType:
						props.input.noteType ||
						(dispatch.deliveryMode === "pickup" ? "pickup" : "dispatch"),
					signature: completion.signaturePathname,
					attachments: completion.attachments.map((attachment) => ({
						pathname: attachment.pathname,
					})),
					completionRequestId: props.input.requestId,
				},
			} as UpdateSalesControl);

			let notificationQueued = response.idempotent;
			if (!response.idempotent) {
				try {
					await getDispatchNotificationService(props.ctx).send(
						"sales_dispatch_completed",
						{
							payload: {
								salesId: dispatch.salesOrderId,
								orderNo: dispatch.order?.orderId || undefined,
								dispatchId: dispatch.id,
								deliveryMode:
									normalizeDispatchDeliveryMode(dispatch.deliveryMode) ||
									undefined,
								dueDate: dispatch.dueDate || undefined,
								driverId: dispatch.driverId || undefined,
								packedBy: session.name || undefined,
								receivedBy: props.input.receivedBy || undefined,
								signature: completion.signaturePathname,
								attachments: completion.attachments.map(
									(attachment) => attachment.pathname,
								),
							},
						},
					);
					notificationQueued = true;
				} catch {
					notificationQueued = false;
				}
			}

			return {
				status: "completed" as const,
				idempotent: response.idempotent,
				notificationQueued,
				signature: completion.signaturePathname,
				signatureDocumentId: completion.signatureDocumentId,
				attachments: completion.attachments.map((attachment) => ({
					pathname: attachment.pathname,
					documentId: attachment.documentId,
				})),
			};
		}),
	updateSalesDeliveryOption: protectedProcedure
		.input(updateSalesDeliveryOptionSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			return updateSalesDeliveryOption(props.ctx, props.input);
		}),
	updateDispatchDriver: protectedProcedure
		.input(updateDispatchDriverSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			return updateDispatchDriver(props.ctx, props.input);
		}),
	updateDispatchDueDate: protectedProcedure
		.input(updateDispatchDueDateSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			return updateDispatchDueDate(props.ctx, props.input);
		}),
	updateDispatchStatus: protectedProcedure
		.input(updateDispatchStatusSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			return updateDispatchStatus(props.ctx, props.input);
		}),
	salesDeliveryInfo: publicProcedure
		.input(
			z.object({
				salesId: z.number().nullable().optional(),
			}),
		)
		.query(async (props) => {
			return getSalesDeliveryInfo(props.ctx, props.input.salesId);
		}),
	orderDispatchOverview: publicProcedure
		.input(salesDispatchOverviewSchema)
		.query(async (props) => {
			return getSalesDispatchOverview(props.ctx.db, {
				salesId: props.input.salesId,
				salesNo: props.input.salesNo,
			});
		}),
	dispatchOverview: publicProcedure
		.input(salesDispatchOverviewSchema)
		.query(async (props) => {
			return getDispatchOverview(props.ctx, props.input);
		}),
	dispatchOverviewV2: publicProcedure
		.input(salesDispatchOverviewSchema)
		.query(async (props) => {
			return getDispatchOverviewV2(props.ctx, props.input);
		}),
	packingQueue: publicProcedure.query(async (props) => {
		return getPackingQueue(props.ctx);
	}),
	packingList: publicProcedure
		.input(packingListQuerySchema)
		.query(async (props) => {
			return getPackingList(props.ctx, props.input);
		}),
	sendSaleForPickup: protectedProcedure
		.input(sendSaleForPickupSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			return sendSaleForPickup(props.ctx, props.input);
		}),
	signPackingSlip: protectedProcedure
		.input(signPackingSlipSchema)
		.mutation(async (props) => {
			await requireAssignedDispatchOrManager(props.ctx, props.input.dispatchId);
			const packingRequestId = crypto.randomUUID();
			const owner = {
				ownerType: "dispatch" as const,
				ownerId: String(props.input.dispatchId),
				ownerKey: "packing-slip",
				kind: "signature" as const,
			};
			const dispatch = await props.ctx.db.$transaction(
				async (tx) => {
					const current = await tx.orderDelivery.findFirst({
						where: {
							id: props.input.dispatchId,
							deletedAt: null,
						},
						select: {
							id: true,
							status: true,
							meta: true,
							deliveredAt: true,
							salesOrderId: true,
						},
					});
					if (!current) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: "Packing delivery not found.",
						});
					}
					const meta = asJsonRecord(current.meta);
					const signoff = asJsonRecord(meta.packingSignoff);
					const startedAt =
						typeof signoff.startedAt === "string"
							? new Date(signoff.startedAt).getTime()
							: Number.NaN;
					const activeLease =
						(signoff.status === "processing" ||
							signoff.status === "uploaded") &&
						Number.isFinite(startedAt) &&
						Date.now() - startedAt < PACKING_SIGNOFF_LEASE_MS;
					if (activeLease) {
						throw new TRPCError({
							code: "CONFLICT",
							message: "Another packing sign-off is already in progress.",
						});
					}
					const existingDocumentId =
						typeof signoff.documentId === "string" ? signoff.documentId : null;
					if (
						signoff.status === "uploaded" &&
						existingDocumentId &&
						!activeLease
					) {
						await tx.storedDocument.updateMany({
							where: {
								id: existingDocumentId,
								ownerType: owner.ownerType,
								ownerId: owner.ownerId,
								kind: owner.kind,
								isCurrent: false,
								deletedAt: null,
							},
							data: {
								status: "failed",
								isCurrent: false,
								deletedAt: new Date(),
							},
						});
					}
					if (
						current.status === "completed" &&
						signoff.status === "domain_completed" &&
						existingDocumentId
					) {
						const promoted = await tx.storedDocument.updateMany({
							where: {
								id: existingDocumentId,
								ownerType: owner.ownerType,
								ownerId: owner.ownerId,
								status: "ready",
								deletedAt: null,
							},
							data: { isCurrent: true },
						});
						if (!promoted.count) {
							throw new TRPCError({
								code: "CONFLICT",
								message:
									"The completed packing signature could not be reconciled.",
							});
						}
						await tx.storedDocument.updateMany({
							where: {
								ownerType: owner.ownerType,
								ownerId: owner.ownerId,
								kind: owner.kind,
								isCurrent: true,
								deletedAt: null,
								id: { not: existingDocumentId },
							},
							data: { isCurrent: false },
						});
						meta.packingSignoff = {
							...signoff,
							status: "completed",
							completedAt: new Date().toISOString(),
						};
						await tx.orderDelivery.update({
							where: { id: current.id },
							data: {
								meta: JSON.parse(JSON.stringify(meta)),
							},
						});
						return {
							id: current.id,
							salesOrderId: current.salesOrderId,
							resignExpired: false,
							reconciled: true,
						};
					}
					const canResign = canResignPackingSlip(current);
					if (current.status === "completed" && !canResign) {
						return {
							id: current.id,
							salesOrderId: current.salesOrderId,
							resignExpired: true,
							reconciled: false,
						};
					}
					await tx.orderDelivery.update({
						where: { id: current.id },
						data: {
							meta: JSON.parse(
								JSON.stringify({
									...meta,
									packingSignoff: {
										requestId: packingRequestId,
										status: "processing",
										startedAt: new Date().toISOString(),
									},
								}),
							),
						},
					});
					return {
						id: current.id,
						salesOrderId: current.salesOrderId,
						resignExpired: false,
						reconciled: false,
					};
				},
				{ isolationLevel: "Serializable" },
			);
			if (dispatch.resignExpired) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "The five-minute packing re-sign window has expired.",
				});
			}
			if (dispatch.reconciled) {
				return {
					ok: true,
					dispatchId: dispatch.id,
					salesId: dispatch.salesOrderId,
					reconciled: true,
				};
			}
			const failPackingLease = async () => {
				await props.ctx.db.$transaction(async (tx) => {
					const current = await tx.orderDelivery.findFirst({
						where: { id: dispatch.id, deletedAt: null },
						select: { meta: true },
					});
					const meta = asJsonRecord(current?.meta);
					const signoff = asJsonRecord(meta.packingSignoff);
					if (signoff.requestId !== packingRequestId) return;
					await tx.orderDelivery.update({
						where: { id: dispatch.id },
						data: {
							meta: JSON.parse(
								JSON.stringify({
									...meta,
									packingSignoff: {
										...signoff,
										status: "failed",
										failedAt: new Date().toISOString(),
									},
								}),
							),
						},
					});
				});
			};
			const documents = createApiVercelBlobDocumentService({ put });
			let storedDocument: Awaited<
				ReturnType<typeof registerStoredDocumentUpload>
			>;
			try {
				const uploaded = await documents.upload({
					filename: `packing-slip-${Date.now()}.png`,
					folder: buildOwnerDocumentFolder(owner),
					contentType: "image/png",
					body: decodePngSignatureDataUrl(props.input.signature),
				});
				storedDocument = await finalizeUploadedDocument({
					pathname: uploaded.pathname,
					deleteUpload: del,
					register: () =>
						registerStoredDocumentUpload(
							props.ctx.db,
							{
								...owner,
								upload: uploaded,
								isCurrent: false,
								uploadedBy: props.ctx.userId,
								sourceType: "packing_slip_signoff",
								sourceId: String(props.input.dispatchId),
								meta: {
									workflow: "packing_slip",
									receivedBy: props.input.receivedBy?.trim() || null,
								},
							},
							{
								onRegistered: async (tx, document) => {
									const current = await tx.orderDelivery.findFirst({
										where: { id: dispatch.id, deletedAt: null },
										select: { meta: true },
									});
									const meta = asJsonRecord(current?.meta);
									const signoff = asJsonRecord(meta.packingSignoff);
									if (signoff.requestId !== packingRequestId) {
										throw new Error("Packing sign-off ownership changed.");
									}
									await tx.orderDelivery.update({
										where: { id: dispatch.id },
										data: {
											meta: JSON.parse(
												JSON.stringify({
													...meta,
													packingSignoff: {
														...signoff,
														status: "uploaded",
														documentId: document.id,
														uploadedAt: new Date().toISOString(),
													},
												}),
											),
										},
									});
								},
							},
						),
					finalize: async (document) => document,
					markFailed: (document) =>
						props.ctx.db.storedDocument.update({
							where: { id: document.id },
							data: {
								status: "failed",
								isCurrent: false,
								deletedAt: new Date(),
							},
						}),
				});
			} catch (error) {
				await Promise.allSettled([failPackingLease()]);
				throw error;
			}
			const signature = storedDocument.url || storedDocument.pathname;

			let result: Awaited<ReturnType<typeof signPackingSlip>>;
			try {
				result = await signPackingSlip(props.ctx, {
					...props.input,
					signature,
					packingRequestId,
					signatureDocumentId: storedDocument.id,
				});
			} catch (error) {
				await Promise.allSettled([
					props.ctx.db.storedDocument.updateMany({
						where: {
							id: storedDocument.id,
							ownerType: owner.ownerType,
							ownerId: owner.ownerId,
						},
						data: {
							isCurrent: false,
							status: "failed",
						},
					}),
					failPackingLease(),
				]);
				throw error;
			}

			try {
				await props.ctx.db.$transaction(async (tx) => {
					const current = await tx.orderDelivery.findFirst({
						where: { id: dispatch.id, deletedAt: null },
						select: { meta: true },
					});
					const meta = asJsonRecord(current?.meta);
					const signoff = asJsonRecord(meta.packingSignoff);
					if (signoff.requestId !== packingRequestId) {
						throw new Error("Packing sign-off ownership changed.");
					}
					await tx.storedDocument.updateMany({
						where: {
							ownerType: owner.ownerType,
							ownerId: owner.ownerId,
							kind: owner.kind,
							isCurrent: true,
							deletedAt: null,
							id: { not: storedDocument.id },
						},
						data: { isCurrent: false },
					});
					await tx.storedDocument.update({
						where: { id: storedDocument.id },
						data: { isCurrent: true, status: "ready" },
					});
					await tx.orderDelivery.update({
						where: { id: dispatch.id },
						data: {
							meta: JSON.parse(
								JSON.stringify({
									...meta,
									packingSignoff: {
										...signoff,
										status: "completed",
										completedAt: new Date().toISOString(),
										documentId: storedDocument.id,
									},
								}),
							),
						},
					});
				});
			} catch (error) {
				console.error(
					"Packing completed, but signature current-document promotion failed.",
					error,
				);
			}
			return result;
		}),
	findDuplicateGroups: publicProcedure.query(async (props) => {
		return findDuplicateDispatchGroups(props.ctx);
	}),
	resolveDuplicateGroup: protectedProcedure
		.input(resolveDuplicateDispatchGroupSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			return resolveDuplicateDispatchGroup(props.ctx, props.input);
		}),
	prepareNonProduceablePacking: protectedProcedure
		.input(
			z.object({
				salesId: z.number(),
			}),
		)
		.mutation(async (props) => {
			await requirePackingOperator(props.ctx);
			const authorId = Number(props.ctx.userId || 0);
			const submitPayload: UpdateSalesControl = {
				meta: {
					salesId: props.input.salesId,
					authorId: Number.isFinite(authorId) && authorId > 0 ? authorId : 1,
					authorName: "System",
				},
			};
			await submitNonProductionsTask(props.ctx.db as Db, submitPayload);
			return { ok: true };
		}),
	createDispatch: protectedProcedure
		.input(createDispatchSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			let {
				salesId,
				deliveryMode: _deliverMode,
				dueDate,
				driverId,
				status,
			} = props.input;
			const deliveryMode = (_deliverMode || "delivery") as DeliveryOption;
			if (driverId) driverId = Number(driverId);
			const dispatch = await props.ctx.db.orderDelivery.create({
				data: {
					deliveryMode,
					createdBy: {
						connect: {
							id: props.ctx.userId,
						},
					},
					driver: driverId
						? {
								connect: {
									id: driverId,
								},
							}
						: undefined,
					status: status || ("queue" as SalesDispatchStatus),
					dueDate,
					meta: {},
					order: {
						connect: { id: salesId },
					},
				},
				include: {
					order: {
						select: {
							orderId: true,
						},
					},
				},
			});
			// try {
			//   const authorId = Number(props.ctx.userId || 0);
			//   await submitNonProductionsTask(
			//     props.ctx.db as any,
			//     {
			//       meta: {
			//         salesId,
			//         authorId:
			//           Number.isFinite(authorId) && authorId > 0 ? authorId : 1,
			//         authorName: "System",
			//       },
			//     } as any,
			//   );
			// } catch {
			//   // Do not block dispatch creation if pre-pack preparation fails.
			// }
			await getDispatchNotificationService(props.ctx).send(
				"sales_dispatch_created",
				{
					payload: {
						orderNo: dispatch.order?.orderId,
						dispatchId: dispatch.id,
						deliveryMode,
						dueDate: dispatch.dueDate || undefined,
						driverId: dispatch.driverId || undefined,
					},
				},
			);
			if (dispatch.driverId) {
				await getDispatchNotificationService(props.ctx)
					.setEmployeeRecipients(dispatch.driverId)
					.send("sales_dispatch_assigned", {
						payload: {
							orderNo: dispatch.order?.orderId,
							dispatchId: dispatch.id,
							deliveryMode,
							dueDate: dispatch.dueDate || undefined,
							driverId: dispatch.driverId,
						},
					});
			}
			// await tasks.
			return dispatch;
		}),
	deleteDispatch: protectedProcedure
		.input(
			z.object({
				dispatchId: z.number(),
			}),
		)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			const dispatch = await props.ctx.db.orderDelivery.findFirst({
				where: {
					id: props.input.dispatchId,
					deletedAt: null,
				},
				select: {
					status: true,
				},
			});
			if (!dispatch) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "DISPATCH_NOT_FOUND",
				});
			}
			if (dispatch.status === "completed") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Completed dispatch cannot be deleted.",
				});
			}
			await props.ctx.db.orderDelivery.update({
				where: {
					id: props.input.dispatchId,
				},
				data: {
					deletedAt: new Date(),
				},
			});
			// return deletePackingItem(props.ctx.db, props.input);
		}),
	debugLog: protectedProcedure
		.input(
			z.object({
				entry: z.any(),
			}),
		)
		.mutation(async (props) => {
			await requireDispatchWorker(props.ctx);
			const isDev = process.env.NODE_ENV === "development";
			const enabled =
				String(process.env.EXPO_PUBLIC_DEBUG_LOGGER ?? "1").toLowerCase() !==
				"false";
			if (!isDev || !enabled) {
				return { ok: true, skipped: true };
			}
			await appendDevLogEntryToFile(props.input.entry as DevLogEntry);
			return { ok: true, skipped: false };
		}),
	dispatchSummary: publicProcedure.query(async (props) => {
		return getDispatchSummary(props.ctx);
	}),
	bulkAssignDriver: protectedProcedure
		.input(bulkAssignDriverSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			return bulkAssignDispatchDriver(props.ctx, props.input);
		}),
	bulkCancel: protectedProcedure
		.input(bulkCancelDispatchSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			return bulkCancelDispatches(props.ctx, props.input);
		}),
	exportDispatches: publicProcedure
		.input(exportDispatchesSchema)
		.query(async (props) => {
			return exportDispatches(props.ctx, props.input);
		}),
	getDeleted: publicProcedure.query(async (props) => {
		return getDeletedDispatches(props.ctx);
	}),
	restore: protectedProcedure
		.input(z.object({ dispatchId: z.number() }))
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			return restoreDispatch(props.ctx, props.input.dispatchId);
		}),
});
