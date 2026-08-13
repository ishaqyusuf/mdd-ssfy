import { createHash, randomUUID } from "node:crypto";
import { decodePngSignatureDataUrl } from "@api/db/queries/dispatch-proof-completion";
import { refreshSpecialOrderSalesDocuments } from "@api/db/queries/special-order-documents";
import {
	beginSpecialOrderApprovalEmailAttempt,
	completeSpecialOrderApprovalEmailAttempt,
} from "@api/db/queries/special-order-email-ledger";
import type { TRPCContext } from "@api/trpc/init";
import { EmailService } from "@gnd/notifications/services/email-service";
import {
	createSpecialOrderApprovalCapability,
	ensureSpecialOrderEmailApprovalAction,
	hashSpecialOrderApprovalCapability,
	readSpecialOrderRecord,
	toSpecialOrderJson,
} from "@gnd/sales/special-order";
import {
	encryptSpecialOrderSignature,
	getSpecialOrderSignatureBlobAccess,
} from "@gnd/sales/special-order/signature-storage";
import { NotificationService } from "@notifications/services/triggers";
import { tasks } from "@trigger.dev/sdk/v3";
import { TRPCError } from "@trpc/server";
import { del, put } from "@vercel/blob";

const readObject = readSpecialOrderRecord;
const json = toSpecialOrderJson;

async function recordPublicSpecialOrderLinkUse(
	ctx: TRPCContext,
	input: {
		requestId: string;
		salesOrderId: number;
		orderRevision: string;
		result: "COMPLETED" | "EXPIRED" | "STALE";
	},
) {
	const bucket = Math.floor(Date.now() / (60 * 60 * 1000));
	await ctx.db.specialOrderOperationEvent
		.upsert({
			where: {
				eventKey: `public:${input.requestId}:${input.result}:${bucket}`,
			},
			create: {
				eventKey: `public:${input.requestId}:${input.result}:${bucket}`,
				salesOrderId: input.salesOrderId,
				orderRevision: input.orderRevision,
				operation: "PUBLIC_LINK",
				enforcementMode: "NOT_APPLICABLE",
				result: input.result,
				source: "public.special-order-review",
			},
			update: {},
		})
		.catch(() => undefined);
}

async function getActorName(ctx: TRPCContext) {
	if (!ctx.userId) return "System";
	const actor = await ctx.db.users.findFirst({
		where: { id: ctx.userId },
		select: { name: true },
	});
	return actor?.name || "System";
}

type SpecialOrderStatusNotificationInput = {
	eventId: string;
	eventType: "APPROVED" | "DECLINED" | "REMOVED";
	salesId: number;
	orderNo: string;
	customer?: { name: string | null; email: string | null } | null;
	salesRep?: { id: number; name: string | null; email: string | null } | null;
	customerHeadline: string;
	customerMessage: string;
	staffHeadline: string;
	staffMessage: string;
	sendCustomer: boolean;
};

type SpecialOrderNotificationDependencies = {
	emailService?: Pick<EmailService, "sendTransactionalWithResult">;
	sendInApp?: (input: SpecialOrderStatusNotificationInput) => Promise<void>;
};

export async function sendSpecialOrderStatusNotifications(
	ctx: TRPCContext,
	input: SpecialOrderStatusNotificationInput,
	dependencies: SpecialOrderNotificationDependencies = {},
) {
	const eventKey = `special-order-status:${input.eventId}`;
	const payload = {
		eventType: input.eventType,
		salesId: input.salesId,
		orderNo: input.orderNo,
		customer: input.customer || null,
		salesRep: input.salesRep || null,
		customerHeadline: input.customerHeadline,
		customerMessage: input.customerMessage,
		staffHeadline: input.staffHeadline,
		staffMessage: input.staffMessage,
		sendCustomer: input.sendCustomer,
	};
	const prior = await ctx.db.specialOrderNotificationDelivery.upsert({
		where: { eventKey },
		create: {
			eventKey,
			eventType: input.eventType,
			salesOrderId: input.salesId,
			payload: json(payload),
		},
		update: { payload: json(payload) },
	});
	const emailService = dependencies.emailService ?? new EmailService(ctx.db);
	const errors: string[] = [];
	const alreadyComplete = (status: string) =>
		["SENT", "SKIPPED", "NOT_REQUIRED", "QUEUED"].includes(status);
	const customerDelivery =
		input.sendCustomer && input.customer?.email
			? alreadyComplete(prior.customerStatus)
				? { status: prior.customerStatus.toLowerCase() }
				: await emailService
						.sendTransactionalWithResult({
							to: input.customer.email,
							subject: `${input.customerHeadline} · ${input.orderNo}`,
							template: "special-order-status-notification",
							data: {
								preview: input.customerHeadline,
								recipientName: input.customer.name || "Customer",
								headline: input.customerHeadline,
								orderNo: input.orderNo,
								message: input.customerMessage,
							},
							idempotencyKey: `special-order-status:${input.eventId}:customer`,
						})
						.catch((error) => {
							const message =
								error instanceof Error
									? error.message
									: "Customer email failed";
							errors.push(message);
							return { status: "failed" as const, errorMessage: message };
						})
			: null;
	const staffDelivery = input.salesRep?.email
		? alreadyComplete(prior.staffStatus)
			? { status: prior.staffStatus.toLowerCase() }
			: await emailService
					.sendTransactionalWithResult({
						to: input.salesRep.email,
						subject: `${input.staffHeadline} · ${input.orderNo}`,
						template: "special-order-status-notification",
						data: {
							preview: input.staffHeadline,
							recipientName: input.salesRep.name || "Salesperson",
							headline: input.staffHeadline,
							orderNo: input.orderNo,
							message: input.staffMessage,
						},
						idempotencyKey: `special-order-status:${input.eventId}:staff`,
					})
					.catch((error) => {
						const message =
							error instanceof Error ? error.message : "Staff email failed";
						errors.push(message);
						return { status: "failed" as const, errorMessage: message };
					})
		: null;
	let inAppStatus = prior.inAppStatus;
	if (input.salesRep?.id && !alreadyComplete(prior.inAppStatus)) {
		try {
			if (dependencies.sendInApp) {
				await dependencies.sendInApp(input);
			} else {
				const notification = new NotificationService(tasks, ctx);
				notification.setEmployeeRecipients(input.salesRep.id);
				await notification.send("sales_info", {
					author: { id: input.salesRep.id, role: "employee" },
					payload: {
						salesId: input.salesId,
						salesNo: input.orderNo,
						headline: input.staffHeadline,
						note: input.staffMessage,
					},
				});
			}
			inAppStatus = "QUEUED";
		} catch (error) {
			inAppStatus = "FAILED";
			errors.push(
				error instanceof Error ? error.message : "In-app notification failed",
			);
		}
	} else if (!input.salesRep?.id) {
		inAppStatus = "SKIPPED";
	}
	const customerStatus = (
		customerDelivery?.status ||
		(input.sendCustomer ? "skipped" : "not_required")
	).toUpperCase();
	const staffStatus = (staffDelivery?.status || "skipped").toUpperCase();
	if (customerDelivery && "errorMessage" in customerDelivery) {
		errors.push(customerDelivery.errorMessage || "Customer email failed");
	}
	if (staffDelivery && "errorMessage" in staffDelivery) {
		errors.push(staffDelivery.errorMessage || "Staff email failed");
	}
	const retryable = [customerStatus, staffStatus, inAppStatus].includes(
		"FAILED",
	);
	const updated = await ctx.db.specialOrderNotificationDelivery.update({
		where: { id: prior.id },
		data: {
			customerStatus,
			staffStatus,
			inAppStatus,
			attempts: { increment: 1 },
			lastAttemptAt: new Date(),
			lastError: errors.filter(Boolean).join("; ") || null,
			completedAt: retryable ? null : new Date(),
		},
	});
	return {
		deliveryId: updated.id,
		customer: customerStatus.toLowerCase(),
		staff: staffStatus.toLowerCase(),
		inAppQueued: inAppStatus === "QUEUED",
		retryable,
		errors,
	};
}

export async function issueSpecialOrderApprovalRequest(
	ctx: TRPCContext,
	input: {
		salesId: number;
		forceReplacement?: boolean;
		reapprovalReason?: string | null;
	},
) {
	const order = await ctx.db.salesOrders.findFirst({
		where: {
			id: input.salesId,
			type: "order",
			deletedAt: null,
		},
		select: {
			id: true,
			orderId: true,
			specialOrderDeclaration: true,
			specialOrderRevision: true,
			customer: {
				select: { id: true, name: true, businessName: true, email: true },
			},
			salesRep: { select: { id: true, name: true, email: true } },
		},
	});
	if (!order) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Sale not found." });
	}
	if (order.specialOrderDeclaration !== "YES" || !order.specialOrderRevision) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"SPECIAL_ORDER_NOT_GOVERNED: This sale is not an active Special Order.",
		});
	}
	const actorName = await getActorName(ctx);
	const action = await ensureSpecialOrderEmailApprovalAction(ctx.db, {
		salesId: order.id,
		issuedByUserId: ctx.userId ?? null,
		activityName: input.reapprovalReason
			? "Special Order reapproval requested"
			: "Special Order approval requested",
		authorName: actorName,
		revokedReason: input.reapprovalReason
			? "MANUAL_REAPPROVAL"
			: "REPLACED_BY_APPROVAL_REQUEST",
		forceReplacement: input.forceReplacement,
		reapprovalReason: input.reapprovalReason,
	});
	if (!action) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"SPECIAL_ORDER_ALREADY_APPROVED: The current order revision already has customer approval.",
		});
	}
	const reusedActive = !action.newlyIssued;
	const email = action.recipientEmail;
	const request = await ctx.db.specialOrderApprovalRequest.findUniqueOrThrow({
		where: { id: action.requestId },
	});

	const token = createSpecialOrderApprovalCapability(request.id);
	if (hashSpecialOrderApprovalCapability(token) !== request.tokenHash) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Unable to resolve the active approval capability.",
		});
	}
	const approvalUrl = action.approvalUrl;
	const emailAttempt = await beginSpecialOrderApprovalEmailAttempt(ctx.db, {
		requestId: request.id,
		salesId: order.id,
		orderNo: order.orderId,
		recipientEmail: email,
		customerName:
			order.customer?.businessName || order.customer?.name || "Customer",
		senderId: ctx.userId ?? null,
		salesRepId: order.salesRep?.id ?? null,
		subject: `Review Special Order ${order.orderId}`,
		approvalUrl,
		expiresAt: request.expiresAt,
		isReapproval: Boolean(input.reapprovalReason),
	});
	const delivery = await new EmailService(ctx.db).sendTransactionalWithResult({
		to: email,
		subject: `Review Special Order ${order.orderId}`,
		template: "special-order-approval-request",
		data: {
			customerName:
				order.customer?.businessName || order.customer?.name || "Customer",
			orderNo: order.orderId,
			approvalUrl,
			expiresAt: request.expiresAt.toISOString(),
		},
		idempotencyKey: `special-order-delivery:${request.id}:${request.updatedAt.getTime()}`,
	});
	const deliveryAt = new Date();
	await Promise.all([
		ctx.db.specialOrderApprovalRequest.update({
			where: { id: request.id },
			data: {
				sentAt: deliveryAt,
				deliveryStatus: delivery.status.toUpperCase(),
				deliveredAt: delivery.status === "sent" ? deliveryAt : null,
				lastDeliveryError: delivery.errorMessage || null,
			},
		}),
		completeSpecialOrderApprovalEmailAttempt(ctx.db, {
			attemptId: emailAttempt.id,
			delivery,
			completedAt: deliveryAt,
		}),
	]);
	await ctx.db.salesHistory.create({
		data: {
			salesId: order.id,
			name:
				delivery.status === "failed"
					? "Special Order approval delivery failed"
					: reusedActive
						? "Special Order approval request resent"
						: "Special Order approval request delivered",
			authorName: actorName,
			data: json({
				requestId: request.id,
				email,
				deliveryStatus: delivery.status,
				error: delivery.errorMessage || null,
			}),
		},
	});
	await refreshSpecialOrderSalesDocuments({
		db: ctx.db,
		salesOrderId: order.id,
		reason: input.reapprovalReason
			? "special_order_reapproval_requested"
			: "special_order_request_issued",
	}).catch(() => undefined);
	if (delivery.status === "failed") {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: `Approval request created, but delivery failed: ${delivery.errorMessage || "Unknown email error"}`,
		});
	}
	return {
		requestId: request.id,
		approvalUrl,
		expiresAt: request.expiresAt,
		deliveryStatus: delivery.status,
		email,
	};
}

export async function getPublicSpecialOrderApproval(
	ctx: TRPCContext,
	token: string,
) {
	const request = await ctx.db.specialOrderApprovalRequest.findUnique({
		where: { tokenHash: hashSpecialOrderApprovalCapability(token) },
		include: {
			policyVersion: true,
			evidence: { select: { outcome: true, acknowledgedAt: true } },
			order: {
				select: {
					orderId: true,
					specialOrderDeclaration: true,
					specialOrderRevision: true,
					meta: true,
					customer: {
						select: { name: true, businessName: true, email: true },
					},
					salesRep: { select: { name: true } },
				},
			},
		},
	});
	if (!request) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "This approval link is invalid.",
		});
	}
	if (request.status === "CONSUMED") {
		await recordPublicSpecialOrderLinkUse(ctx, {
			requestId: request.id,
			salesOrderId: request.salesOrderId,
			orderRevision: request.orderRevision,
			result: "COMPLETED",
		});
		return {
			state: "COMPLETED" as const,
			orderNo: request.order.orderId,
			outcome: request.evidence?.outcome || null,
			completedAt: request.evidence?.acknowledgedAt || request.consumedAt,
		};
	}
	if (request.status !== "ACTIVE" || request.expiresAt <= new Date()) {
		await recordPublicSpecialOrderLinkUse(ctx, {
			requestId: request.id,
			salesOrderId: request.salesOrderId,
			orderRevision: request.orderRevision,
			result: "EXPIRED",
		});
		return {
			state: "EXPIRED" as const,
			message:
				"This approval link has expired. Request a current link from your salesperson.",
		};
	}
	if (
		request.order.specialOrderDeclaration !== "YES" ||
		request.order.specialOrderRevision !== request.orderRevision
	) {
		await recordPublicSpecialOrderLinkUse(ctx, {
			requestId: request.id,
			salesOrderId: request.salesOrderId,
			orderRevision: request.orderRevision,
			result: "STALE",
		});
		return {
			state: "STALE" as const,
			message:
				"The order has changed. Request the current approval link from your salesperson.",
		};
	}
	const meta = readObject(request.order.meta);
	const form = readObject(meta.newSalesForm);
	const storedOrder = readObject(request.orderSnapshot);
	const storedCustomer = readObject(request.customerSnapshot);
	const storedSalesperson = readObject(request.salespersonSnapshot);
	return {
		state: "ACTIVE" as const,
		orderNo: request.order.orderId,
		customerName:
			(typeof storedCustomer.businessName === "string"
				? storedCustomer.businessName
				: null) ||
			(typeof storedCustomer.name === "string" ? storedCustomer.name : null) ||
			request.order.customer?.businessName ||
			request.order.customer?.name ||
			"Customer",
		salespersonName:
			(typeof storedSalesperson.name === "string"
				? storedSalesperson.name
				: null) ||
			request.order.salesRep?.name ||
			null,
		expiresAt: request.expiresAt,
		policy: {
			version: request.policyVersion.version,
			title: request.policyVersion.title,
			acknowledgmentText: request.policyVersion.acknowledgmentText,
			policyText: request.policyVersion.policyText,
		},
		order: {
			customer: storedCustomer,
			billingAddress: readObject(storedOrder.billingAddress),
			shippingAddress: readObject(storedOrder.shippingAddress),
			form: Object.keys(readObject(storedOrder.form)).length
				? readObject(storedOrder.form)
				: readObject(form.form),
			lineItems: Array.isArray(storedOrder.lineItems)
				? storedOrder.lineItems
				: Array.isArray(form.lineItems)
					? form.lineItems
					: [],
			extraCosts: Array.isArray(storedOrder.extraCosts)
				? storedOrder.extraCosts
				: Array.isArray(form.extraCosts)
					? form.extraCosts
					: [],
			summary: Object.keys(readObject(storedOrder.summary)).length
				? readObject(storedOrder.summary)
				: readObject(form.summary),
		},
	};
}

export async function respondToSpecialOrderApproval(
	ctx: TRPCContext,
	input: {
		token: string;
		decision: "APPROVE" | "DECLINE";
		acknowledged?: boolean;
		printedName?: string | null;
		signatureDataUrl?: string | null;
		declineReason?: string | null;
	},
) {
	const tokenHash = hashSpecialOrderApprovalCapability(input.token);
	const evidenceId = randomUUID();
	let signatureUpload: Awaited<ReturnType<typeof put>> | null = null;
	let signatureBuffer: Buffer | null = null;
	const preflight = await getPublicSpecialOrderApproval(ctx, input.token);
	if (preflight.state === "COMPLETED") {
		return {
			state: preflight.state,
			outcome: preflight.outcome,
			completedAt: preflight.completedAt,
		};
	}
	if (preflight.state !== "ACTIVE") {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				preflight.state === "STALE"
					? "SPECIAL_ORDER_LINK_STALE: The order changed after this link was issued."
					: "SPECIAL_ORDER_LINK_EXPIRED: Request a current approval link.",
		});
	}
	if (input.decision === "APPROVE") {
		signatureBuffer = decodePngSignatureDataUrl(input.signatureDataUrl || "");
		const encryptedSignature = encryptSpecialOrderSignature(signatureBuffer);
		signatureUpload = await put(
			`special-order/evidence/${evidenceId}/signature.enc`,
			Buffer.from(encryptedSignature),
			{
				access: getSpecialOrderSignatureBlobAccess(),
				contentType: "application/octet-stream",
				addRandomSuffix: false,
			},
		);
	}

	let result: Awaited<ReturnType<typeof commitSpecialOrderResponse>>;
	try {
		result = await commitSpecialOrderResponse(ctx, {
			...input,
			tokenHash,
			evidenceId,
			signatureUpload,
			signatureBuffer,
		});
	} catch (error) {
		if (signatureUpload) {
			await del(signatureUpload.pathname).catch(() => undefined);
		}
		throw error;
	}
	if (signatureUpload && !result.notificationContext) {
		await del(signatureUpload.pathname).catch(() => undefined);
	}
	if (!result.notificationContext) return result;
	const approved = result.outcome === "APPROVED";
	const notifications = await sendSpecialOrderStatusNotifications(ctx, {
		...result.notificationContext,
		eventType: approved ? "APPROVED" : "DECLINED",
		customerHeadline: approved
			? "Special Order approval complete"
			: "Special Order response received",
		customerMessage: approved
			? "Your signed approval has been recorded for this exact order revision. Keep this message with your order records."
			: `Your decision to decline this Special Order revision has been recorded${result.notificationContext.declineReason ? ` with the reason: ${result.notificationContext.declineReason}` : "."}`,
		staffHeadline: approved
			? "Customer approved Special Order"
			: "Customer declined Special Order",
		staffMessage: approved
			? "The current order revision now has Current Approval."
			: `Review the customer’s decline${result.notificationContext.declineReason ? `: ${result.notificationContext.declineReason}` : "."}`,
		sendCustomer: true,
	});
	await Promise.allSettled([
		ctx.db.salesHistory.create({
			data: {
				salesId: result.notificationContext.salesId,
				name: "Special Order response notifications processed",
				authorName: "System",
				data: json({
					eventId: result.notificationContext.eventId,
					...notifications,
				}),
			},
		}),
		refreshSpecialOrderSalesDocuments({
			db: ctx.db,
			salesOrderId: result.notificationContext.salesId,
			reason: approved ? "special_order_approved" : "special_order_declined",
		}),
	]);
	return { ...result, notificationContext: undefined, notifications };
}

export async function commitSpecialOrderResponse(
	ctx: TRPCContext,
	input: {
		token: string;
		tokenHash: string;
		decision: "APPROVE" | "DECLINE";
		acknowledged?: boolean;
		printedName?: string | null;
		signatureDataUrl?: string | null;
		declineReason?: string | null;
		evidenceId: string;
		signatureUpload: Awaited<ReturnType<typeof put>> | null;
		signatureBuffer: Buffer | null;
	},
) {
	return ctx.db.$transaction(async (tx) => {
		const request = await tx.specialOrderApprovalRequest.findUnique({
			where: { tokenHash: input.tokenHash },
			include: {
				policyVersion: true,
				evidence: { select: { id: true, outcome: true, acknowledgedAt: true } },
				order: {
					select: {
						id: true,
						orderId: true,
						meta: true,
						specialOrderDeclaration: true,
						specialOrderRevision: true,
						customer: {
							select: { id: true, name: true, businessName: true, email: true },
						},
						salesRep: { select: { id: true, name: true, email: true } },
					},
				},
			},
		});
		if (!request) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "This approval link is invalid.",
			});
		}
		if (request.status === "CONSUMED" && request.evidence) {
			return {
				state: "COMPLETED" as const,
				outcome: request.evidence.outcome,
				completedAt: request.evidence.acknowledgedAt,
				notificationContext: null,
			};
		}
		if (request.status !== "ACTIVE" || request.expiresAt <= new Date()) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: "SPECIAL_ORDER_LINK_EXPIRED: Request a current approval link.",
			});
		}
		if (
			request.order.specialOrderDeclaration !== "YES" ||
			request.order.specialOrderRevision !== request.orderRevision
		) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message:
					"SPECIAL_ORDER_LINK_STALE: The order changed after this link was issued.",
			});
		}
		const claimed = await tx.specialOrderApprovalRequest.updateMany({
			where: { id: request.id, status: "ACTIVE" },
			data: { status: "CONSUMED", consumedAt: new Date() },
		});
		if (!claimed.count) {
			const completed = await tx.specialOrderApprovalRequest.findUnique({
				where: { id: request.id },
				include: {
					evidence: {
						select: { outcome: true, acknowledgedAt: true },
					},
				},
			});
			if (completed?.status === "CONSUMED" && completed.evidence) {
				return {
					state: "COMPLETED" as const,
					outcome: completed.evidence.outcome,
					completedAt: completed.evidence.acknowledgedAt,
					notificationContext: null,
				};
			}
			throw new TRPCError({
				code: "CONFLICT",
				message: "This approval link has already been completed.",
			});
		}
		const signatureDocumentId = input.signatureUpload ? randomUUID() : null;
		if (input.signatureUpload && signatureDocumentId && input.signatureBuffer) {
			await tx.storedDocument.create({
				data: {
					id: signatureDocumentId,
					kind: "special-order-signature",
					ownerType: "special-order-approval-evidence",
					ownerId: input.evidenceId,
					provider: "vercel-blob-encrypted",
					pathname: input.signatureUpload.pathname,
					url: null,
					filename: "signature.png",
					mimeType: "image/png",
					extension: "png",
					size: input.signatureBuffer.length,
					checksum: createHash("sha256")
						.update(Uint8Array.from(input.signatureBuffer))
						.digest("hex"),
					visibility: "private",
					status: "ready",
					isCurrent: true,
					meta: {
						encryption: "aes-256-gcm-v1",
						blobAccess: getSpecialOrderSignatureBlobAccess(),
					},
				},
			});
		}
		const orderMeta = readObject(request.order.meta);
		const form = readObject(orderMeta.newSalesForm);
		const evidence = await tx.specialOrderApprovalEvidence.create({
			data: {
				id: input.evidenceId,
				salesOrderId: request.order.id,
				requestId: request.id,
				policyVersionId: request.policyVersionId,
				orderRevision: request.orderRevision,
				outcome: input.decision === "APPROVE" ? "APPROVED" : "DECLINED",
				customerName:
					input.printedName?.trim() ||
					request.order.customer?.businessName ||
					request.order.customer?.name ||
					"Customer",
				customerEmail: request.sentToEmail,
				declineReason:
					input.decision === "DECLINE" ? input.declineReason?.trim() : null,
				signatureDocumentId,
				policyTitle: request.policyVersion.title,
				acknowledgmentText: request.policyVersion.acknowledgmentText,
				policyText: request.policyVersion.policyText,
				orderSnapshot: request.orderSnapshot
					? json(request.orderSnapshot)
					: json({
							orderNo: request.order.orderId,
							form: readObject(form.form),
							lineItems: Array.isArray(form.lineItems) ? form.lineItems : [],
							extraCosts: Array.isArray(form.extraCosts) ? form.extraCosts : [],
							summary: readObject(form.summary),
						}),
				customerSnapshot: request.customerSnapshot
					? json(request.customerSnapshot)
					: json(request.order.customer || {}),
				salespersonSnapshot: request.salespersonSnapshot
					? json(request.salespersonSnapshot)
					: json(request.order.salesRep || {}),
				ipAddress: ctx.ipAddress?.slice(0, 64) || null,
				userAgent: ctx.userAgent?.slice(0, 2_000) || null,
			},
		});
		await tx.salesOrders.update({
			where: { id: request.order.id },
			data: {
				currentSpecialOrderApprovalId:
					input.decision === "APPROVE" ? evidence.id : null,
				currentSpecialOrderRequestId: request.id,
				specialOrderStatus:
					input.decision === "APPROVE"
						? "CUSTOMER_APPROVED"
						: "CUSTOMER_DECLINED",
			},
		});
		await tx.salesHistory.create({
			data: {
				salesId: request.order.id,
				name:
					input.decision === "APPROVE"
						? "Special Order approved by customer"
						: "Special Order declined by customer",
				authorName: input.printedName?.trim() || "Customer link holder",
				data: json({
					evidenceId: evidence.id,
					requestId: request.id,
					declineReason: evidence.declineReason,
				}),
			},
		});
		return {
			state: "COMPLETED" as const,
			outcome: evidence.outcome,
			completedAt: evidence.acknowledgedAt,
			notificationContext: {
				eventId: evidence.id,
				salesId: request.order.id,
				orderNo: request.order.orderId,
				customer: request.order.customer
					? {
							name:
								request.order.customer.businessName ||
								request.order.customer.name,
							email: request.order.customer.email,
						}
					: null,
				salesRep: request.order.salesRep,
				declineReason: evidence.declineReason,
			},
		};
	});
}

export async function removeSpecialOrderClassification(
	ctx: TRPCContext,
	input: { salesId: number; reason: string },
	deps: {
		sendNotifications?: typeof sendSpecialOrderStatusNotifications;
		refreshDocuments?: typeof refreshSpecialOrderSalesDocuments;
	} = {},
) {
	const sendNotifications =
		deps.sendNotifications ?? sendSpecialOrderStatusNotifications;
	const refreshDocuments =
		deps.refreshDocuments ?? refreshSpecialOrderSalesDocuments;
	const actorName = await getActorName(ctx);
	const result = await ctx.db.$transaction(async (tx) => {
		const order = await tx.salesOrders.findFirst({
			where: { id: input.salesId, type: "order", deletedAt: null },
			select: {
				id: true,
				orderId: true,
				specialOrderDeclaration: true,
				specialOrderStatus: true,
				specialOrderRevision: true,
				currentSpecialOrderApprovalId: true,
				customer: {
					select: { name: true, businessName: true, email: true },
				},
				salesRep: { select: { id: true, name: true, email: true } },
			},
		});
		if (!order)
			throw new TRPCError({ code: "NOT_FOUND", message: "Sale not found." });
		if (order.specialOrderDeclaration !== "YES") {
			return {
				removed: false as const,
				customerNotification: "not_required" as const,
			};
		}
		const communicated = await tx.specialOrderApprovalRequest.count({
			where: {
				salesOrderId: order.id,
				OR: [{ deliveredAt: { not: null } }, { evidence: { isNot: null } }],
			},
		});
		await tx.specialOrderApprovalRequest.updateMany({
			where: { salesOrderId: order.id, status: "ACTIVE" },
			data: {
				status: "REVOKED",
				revokedAt: new Date(),
				revokedReason: "SPECIAL_ORDER_REMOVED",
			},
		});
		await tx.specialOrderApprovalEvidence.updateMany({
			where: { salesOrderId: order.id, supersededAt: null },
			data: {
				supersededAt: new Date(),
				supersededReason: input.reason,
				supersededByUserId: ctx.userId ?? null,
			},
		});
		await tx.salesOrders.update({
			where: { id: order.id },
			data: {
				specialOrderDeclaration: "NO",
				specialOrderStatus: "NOT_REQUIRED",
				specialOrderRevision: null,
				currentSpecialOrderRequestId: null,
				currentSpecialOrderApprovalId: null,
			},
		});
		const history = await tx.salesHistory.create({
			data: {
				salesId: order.id,
				name: "Special Order classification removed",
				authorName: actorName,
				data: json({
					reason: input.reason,
					priorState: order.specialOrderStatus,
					affectedRevision: order.specialOrderRevision,
					outcome: "NOT_REQUIRED",
					customerWasNotified: false,
				}),
			},
		});
		return {
			removed: true as const,
			customerNotificationRequired: communicated > 0,
			historyId: history.id,
			order,
		};
	});
	if (!result.removed) return result;
	const notifications = await sendNotifications(ctx, {
		eventId: `removal:${result.historyId}`,
		eventType: "REMOVED",
		salesId: result.order.id,
		orderNo: result.order.orderId,
		customer: result.order.customer
			? {
					name:
						result.order.customer.businessName || result.order.customer.name,
					email: result.order.customer.email,
				}
			: null,
		salesRep: result.order.salesRep,
		customerHeadline: "Special Order requirement removed",
		customerMessage:
			"This order is no longer classified as a Special Order. Any prior approval record remains preserved in the order history.",
		staffHeadline: "Special Order classification removed",
		staffMessage: `The classification was removed for this order. Reason: ${input.reason}`,
		sendCustomer: result.customerNotificationRequired,
	});
	await ctx.db.salesHistory.update({
		where: { id: result.historyId },
		data: {
			data: json({
				reason: input.reason,
				priorState: result.order.specialOrderStatus,
				affectedRevision: result.order.specialOrderRevision,
				outcome: "NOT_REQUIRED",
				customerWasNotified: notifications.customer === "sent",
				notifications,
			}),
		},
	});
	await refreshDocuments({
		db: ctx.db,
		salesOrderId: result.order.id,
		reason: "special_order_removed",
	}).catch(() => undefined);
	return {
		removed: true,
		customerNotification: notifications.customer,
		notifications,
	};
}

export async function getSpecialOrderApprovalHistory(
	ctx: TRPCContext,
	salesId: number,
) {
	const [requests, evidence, notificationDeliveries] = await Promise.all([
		ctx.db.specialOrderApprovalRequest.findMany({
			where: { salesOrderId: salesId },
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				status: true,
				sentToEmail: true,
				sentAt: true,
				deliveredAt: true,
				expiresAt: true,
				lastDeliveryError: true,
				orderRevision: true,
				policyVersion: { select: { version: true, title: true } },
			},
		}),
		ctx.db.specialOrderApprovalEvidence.findMany({
			where: { salesOrderId: salesId },
			orderBy: { acknowledgedAt: "desc" },
			select: {
				id: true,
				outcome: true,
				customerName: true,
				customerEmail: true,
				signatureDocumentId: true,
				declineReason: true,
				acknowledgedAt: true,
				supersededAt: true,
				supersededReason: true,
				orderRevision: true,
				policyVersion: { select: { version: true, title: true } },
			},
		}),
		ctx.db.specialOrderNotificationDelivery.findMany({
			where: { salesOrderId: salesId },
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				eventType: true,
				customerStatus: true,
				staffStatus: true,
				inAppStatus: true,
				attempts: true,
				lastError: true,
				lastAttemptAt: true,
				completedAt: true,
				createdAt: true,
			},
		}),
	]);
	return {
		requests,
		evidence: evidence.map(({ signatureDocumentId, ...entry }) => ({
			...entry,
			hasSignature: Boolean(signatureDocumentId),
		})),
		notificationDeliveries,
	};
}

export async function retrySpecialOrderStatusNotifications(
	ctx: TRPCContext,
	input: { salesId: number; deliveryId: string },
) {
	const delivery = await ctx.db.specialOrderNotificationDelivery.findFirst({
		where: { id: input.deliveryId, salesOrderId: input.salesId },
	});
	if (!delivery) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Special Order notification delivery was not found.",
		});
	}
	const payload = readObject(delivery.payload);
	const customer = readObject(payload.customer);
	const salesRep = readObject(payload.salesRep);
	const eventType = payload.eventType;
	if (
		eventType !== "APPROVED" &&
		eventType !== "DECLINED" &&
		eventType !== "REMOVED"
	) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Stored Special Order notification context is invalid.",
		});
	}
	const result = await sendSpecialOrderStatusNotifications(ctx, {
		eventId: delivery.eventKey.replace(/^special-order-status:/, ""),
		eventType,
		salesId: delivery.salesOrderId,
		orderNo: String(payload.orderNo || "Order"),
		customer:
			Object.keys(customer).length > 0
				? {
						name: typeof customer.name === "string" ? customer.name : null,
						email: typeof customer.email === "string" ? customer.email : null,
					}
				: null,
		salesRep:
			Object.keys(salesRep).length > 0
				? {
						id: Number(salesRep.id),
						name: typeof salesRep.name === "string" ? salesRep.name : null,
						email: typeof salesRep.email === "string" ? salesRep.email : null,
					}
				: null,
		customerHeadline: String(payload.customerHeadline || "Special Order"),
		customerMessage: String(payload.customerMessage || ""),
		staffHeadline: String(payload.staffHeadline || "Special Order"),
		staffMessage: String(payload.staffMessage || ""),
		sendCustomer: payload.sendCustomer === true,
	});
	await ctx.db.salesHistory.create({
		data: {
			salesId: delivery.salesOrderId,
			name: "Special Order notification delivery retried",
			authorName: await getActorName(ctx),
			data: json({ deliveryId: delivery.id, result }),
		},
	});
	return result;
}
