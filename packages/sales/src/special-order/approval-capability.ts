import { createHash, createHmac, randomUUID } from "node:crypto";
import type { Db, Prisma } from "@gnd/db";
import { getAppUrl } from "@gnd/utils/envs";
import {
	INITIAL_SPECIAL_ORDER_POLICY,
	hasSpecialOrderCustomerEmail,
} from "./domain";

const DEFAULT_LINK_LIFETIME_DAYS = 7;

function tokenSecret() {
	const secret =
		process.env.SPECIAL_ORDER_TOKEN_SECRET ||
		process.env.AUTH_SECRET ||
		process.env.BETTER_AUTH_SECRET ||
		process.env.JWT_SECRET ||
		(process.env.NODE_ENV !== "production" ? "gnd-local-special-order" : "");
	if (!secret) {
		throw new Error("Special Order approval links are not configured.");
	}
	return secret;
}

export function createSpecialOrderApprovalCapability(requestId: string) {
	const proof = createHmac("sha256", tokenSecret())
		.update(requestId)
		.digest("base64url");
	return `${requestId}.${proof}`;
}

export function hashSpecialOrderApprovalCapability(token: string) {
	return createHash("sha256").update(token).digest("hex");
}

export function readSpecialOrderRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export function toSpecialOrderJson(value: unknown): Prisma.InputJsonValue {
	return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeLinkLifetimeDays(meta: unknown) {
	const specialOrder = readSpecialOrderRecord(
		readSpecialOrderRecord(meta).specialOrder,
	);
	const value = Number(specialOrder.approvalLinkLifetimeDays);
	return Number.isInteger(value) && value >= 1 && value <= 30
		? value
		: DEFAULT_LINK_LIFETIME_DAYS;
}

async function resolvePolicyContext(db: Db, issuedByUserId: number | null) {
	let settings = await db.settings.findFirst({
		where: { type: "sales-settings" },
	});
	if (!settings) {
		settings = await db.settings.create({
			data: { type: "sales-settings", meta: {} },
		});
	}
	const meta = readSpecialOrderRecord(settings.meta);
	const specialOrder = readSpecialOrderRecord(meta.specialOrder);
	const activePolicyVersionId =
		typeof specialOrder.activePolicyVersionId === "string"
			? specialOrder.activePolicyVersionId
			: null;
	let policy = activePolicyVersionId
		? await db.specialOrderPolicyVersion.findFirst({
				where: { id: activePolicyVersionId, status: "PUBLISHED" },
			})
		: null;
	if (!policy) {
		policy = await db.specialOrderPolicyVersion.findFirst({
			where: { status: "PUBLISHED" },
			orderBy: { version: "desc" },
		});
	}
	if (!policy) {
		policy = await db.specialOrderPolicyVersion.upsert({
			where: { version: 1 },
			create: {
				version: 1,
				status: "PUBLISHED",
				...INITIAL_SPECIAL_ORDER_POLICY,
				createdByUserId: issuedByUserId,
				publishedByUserId: issuedByUserId,
				publishedAt: new Date(),
			},
			update: {},
		});
	}
	if (activePolicyVersionId !== policy.id) {
		await db.settings.update({
			where: { id: settings.id },
			data: {
				meta: toSpecialOrderJson({
					...meta,
					specialOrder: {
						...specialOrder,
						approvalLinkLifetimeDays: normalizeLinkLifetimeDays(meta),
						activePolicyVersionId: policy.id,
					},
				}),
			},
		});
	}
	return {
		policy,
		linkLifetimeDays: normalizeLinkLifetimeDays(meta),
	};
}

export type SpecialOrderEmailApprovalAction = {
	requestId: string;
	orderId: string;
	recipientEmail: string;
	approvalUrl: string;
	expiresAt: Date;
	newlyIssued: boolean;
};

export type SpecialOrderApprovalDeliveryResult = {
	status: "sent" | "failed" | "skipped";
	providerMessageId?: string | null;
	providerStatus?: string | null;
	errorMessage?: string | null;
};

export async function resolveCurrentSpecialOrderApprovalLink(
	db: Db,
	salesId: number,
) {
	const order = await db.salesOrders.findFirst({
		where: { id: salesId, type: "order", deletedAt: null },
		select: {
			orderId: true,
			specialOrderDeclaration: true,
			specialOrderRevision: true,
			currentSpecialOrderRequestId: true,
		},
	});
	if (
		!order ||
		order.specialOrderDeclaration !== "YES" ||
		!order.specialOrderRevision ||
		!order.currentSpecialOrderRequestId
	) {
		return null;
	}

	const request = await db.specialOrderApprovalRequest.findFirst({
		where: {
			id: order.currentSpecialOrderRequestId,
			salesOrderId: salesId,
			orderRevision: order.specialOrderRevision,
			status: "ACTIVE",
			expiresAt: { gt: new Date() },
		},
		select: { id: true, tokenHash: true, expiresAt: true },
	});
	if (!request) return null;

	const token = createSpecialOrderApprovalCapability(request.id);
	if (hashSpecialOrderApprovalCapability(token) !== request.tokenHash) {
		throw new Error("Unable to resolve the active approval capability.");
	}
	const appUrl = getAppUrl()?.replace(/\/$/, "");
	if (!appUrl) {
		throw new Error("Missing app URL for Special Order approval action.");
	}

	return {
		requestId: request.id,
		orderId: order.orderId,
		approvalUrl: `${appUrl}/sales/special-order-approval/${encodeURIComponent(token)}`,
		expiresAt: request.expiresAt,
	};
}

export async function recordSpecialOrderApprovalDelivery(
	db: Db,
	actions: SpecialOrderEmailApprovalAction[],
	delivery: SpecialOrderApprovalDeliveryResult | null,
) {
	if (!actions.length || !delivery) return;
	const deliveredAt = delivery.status === "sent" ? new Date() : null;
	await db.specialOrderApprovalRequest.updateMany({
		where: { id: { in: actions.map((action) => action.requestId) } },
		data: {
			deliveryStatus: delivery.status.toUpperCase(),
			...(deliveredAt ? { deliveredAt } : {}),
			lastDeliveryError: delivery.errorMessage || null,
		},
	});
}

function isRetryableRequestTransactionError(error: unknown) {
	if (!error || typeof error !== "object") return false;
	const candidate = error as { code?: unknown; message?: unknown };
	const message =
		typeof candidate.message === "string"
			? candidate.message.toLowerCase()
			: "";
	return (
		candidate.code === "P2034" ||
		message.includes("deadlock") ||
		message.includes("serialization")
	);
}

export async function ensureSpecialOrderEmailApprovalAction(
	db: Db,
	input: {
		salesId: number;
		issuedByUserId: number | null;
		activityName?: string;
		authorName?: string;
		revokedReason?: string;
		forceReplacement?: boolean;
		reapprovalReason?: string | null;
	},
): Promise<SpecialOrderEmailApprovalAction | null> {
	let resolved: {
		orderId: string;
		recipientEmail: string;
		request: Awaited<
			ReturnType<typeof db.specialOrderApprovalRequest.findFirstOrThrow>
		>;
		newlyIssued: boolean;
	} | null = null;
	for (let attempt = 0; attempt < 3; attempt += 1) {
		try {
			resolved = await db.$transaction(
				async (tx) => {
					const order = await tx.salesOrders.findFirst({
						where: { id: input.salesId, type: "order", deletedAt: null },
						select: {
							id: true,
							orderId: true,
							specialOrderDeclaration: true,
							specialOrderStatus: true,
							specialOrderRevision: true,
							currentSpecialOrderApprovalId: true,
							meta: true,
							customer: {
								select: {
									id: true,
									name: true,
									businessName: true,
									email: true,
								},
							},
							salesRep: {
								select: { id: true, name: true, email: true },
							},
							billingAddress: true,
							shippingAddress: true,
						},
					});
					if (
						!order ||
						order.specialOrderDeclaration !== "YES" ||
						!order.specialOrderRevision
					) {
						return null;
					}
					const recipientEmail = order.customer?.email?.trim();
					if (!hasSpecialOrderCustomerEmail(recipientEmail)) {
						throw new Error(
							"SPECIAL_ORDER_CUSTOMER_EMAIL_REQUIRED: A valid canonical customer email is required for Special Order approval.",
						);
					}
					const orderRevision = order.specialOrderRevision;
					if (!input.forceReplacement && order.currentSpecialOrderApprovalId) {
						const currentEvidence =
							await tx.specialOrderApprovalEvidence.findFirst({
								where: {
									id: order.currentSpecialOrderApprovalId,
									outcome: "APPROVED",
									orderRevision,
									supersededAt: null,
								},
								select: { id: true },
							});
						if (currentEvidence) return null;
					}
					const now = new Date();
					const active = !input.forceReplacement
						? await tx.specialOrderApprovalRequest.findFirst({
						where: {
							salesOrderId: order.id,
							orderRevision,
							status: "ACTIVE",
							expiresAt: { gt: now },
						},
						orderBy: { createdAt: "desc" },
						})
						: null;
					if (active) {
						return {
							orderId: order.orderId,
							recipientEmail,
							request: active,
							newlyIssued: false,
						};
					}
					const { policy, linkLifetimeDays } = await resolvePolicyContext(
						tx as unknown as Db,
						input.issuedByUserId,
					);
					const requestId = randomUUID();
					const token = createSpecialOrderApprovalCapability(requestId);
					const orderMeta = readSpecialOrderRecord(order.meta);
					const newSalesForm = readSpecialOrderRecord(orderMeta.newSalesForm);
					const orderSnapshot = {
						orderNo: order.orderId,
						form: readSpecialOrderRecord(newSalesForm.form),
						lineItems: Array.isArray(newSalesForm.lineItems)
							? newSalesForm.lineItems
							: [],
						extraCosts: Array.isArray(newSalesForm.extraCosts)
							? newSalesForm.extraCosts
							: [],
						summary: readSpecialOrderRecord(newSalesForm.summary),
						billingAddress: order.billingAddress,
						shippingAddress: order.shippingAddress,
					};
					const expiresAt = new Date(
						now.getTime() + linkLifetimeDays * 24 * 60 * 60 * 1000,
					);
					await tx.specialOrderApprovalRequest.updateMany({
						where: { salesOrderId: order.id, status: "ACTIVE" },
						data: {
							status: "REVOKED",
							revokedAt: now,
							revokedReason: input.revokedReason || "REPLACED_BY_SALES_EMAIL",
						},
					});
					if (
						input.forceReplacement &&
						input.reapprovalReason &&
						order.currentSpecialOrderApprovalId
					) {
						await tx.specialOrderApprovalEvidence.updateMany({
							where: { id: order.currentSpecialOrderApprovalId },
							data: {
								supersededAt: now,
								supersededReason: input.reapprovalReason,
								supersededByUserId: input.issuedByUserId,
							},
						});
					}
					const created = await tx.specialOrderApprovalRequest.create({
						data: {
							id: requestId,
							salesOrderId: order.id,
							policyVersionId: policy.id,
							orderRevision,
							tokenHash: hashSpecialOrderApprovalCapability(token),
							idempotencyKey: `special-order-request:${requestId}`,
							sentToEmail: recipientEmail,
							orderSnapshot: toSpecialOrderJson(orderSnapshot),
							customerSnapshot: toSpecialOrderJson(order.customer || {}),
							salespersonSnapshot: toSpecialOrderJson(order.salesRep || {}),
							sentAt: now,
							expiresAt,
							issuedByUserId: input.issuedByUserId,
						},
					});
					await tx.salesOrders.update({
						where: { id: order.id },
						data: {
							currentSpecialOrderRequestId: created.id,
							currentSpecialOrderApprovalId: null,
							specialOrderStatus:
								input.forceReplacement ||
								order.specialOrderStatus === "CUSTOMER_DECLINED" ||
								order.specialOrderStatus === "REAPPROVAL_REQUIRED"
									? "REAPPROVAL_REQUIRED"
									: "SIGNATURE_PENDING",
						},
					});
					await tx.salesHistory.create({
						data: {
							salesId: order.id,
							name:
								input.activityName ||
								(input.reapprovalReason
									? "Special Order reapproval requested"
									: "Special Order approval action added to Sales email"),
							authorName: input.authorName || "Sales email",
							data: toSpecialOrderJson({
								requestId: created.id,
								email: recipientEmail,
								reason: input.reapprovalReason || null,
							}),
						},
					});
					return {
						orderId: order.orderId,
						recipientEmail,
						request: created,
						newlyIssued: true,
					};
				},
				{ isolationLevel: "Serializable" },
			);
			break;
		} catch (error) {
			if (attempt === 2 || !isRetryableRequestTransactionError(error)) {
				throw error;
			}
		}
	}
	if (!resolved) return null;

	const token = createSpecialOrderApprovalCapability(resolved.request.id);
	if (hashSpecialOrderApprovalCapability(token) !== resolved.request.tokenHash) {
		throw new Error(
			"Unable to resolve the active Special Order approval action.",
		);
	}
	const appUrl = getAppUrl()?.replace(/\/$/, "");
	if (!appUrl) {
		throw new Error("Missing app URL for Special Order approval action.");
	}
	return {
		requestId: resolved.request.id,
		orderId: resolved.orderId,
		recipientEmail: resolved.recipientEmail,
		approvalUrl: `${appUrl}/sales/special-order-approval/${encodeURIComponent(token)}`,
		expiresAt: resolved.request.expiresAt,
		newlyIssued: resolved.newlyIssued,
	};
}
