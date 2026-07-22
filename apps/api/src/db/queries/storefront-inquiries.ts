import { createHash } from "node:crypto";
import type { TRPCContext } from "@api/trpc/init";
import { getUserIdsWithPermission } from "@gnd/auth/utils";
import type { Prisma } from "@gnd/db";
import {
	type StorefrontInquiryStatus,
	canTransitionStorefrontInquiry,
	storefrontCustomInquiryDraftSchema,
	storefrontFinalizeCustomInquirySchema,
	storefrontInquiryReference,
	storefrontInquiryStatusSchema,
	storefrontProjectTypeLabel,
} from "@gnd/sales/storefront-inquiry";
import { TRPCError } from "@trpc/server";
import { head } from "@vercel/blob";
import { sign, verify } from "jsonwebtoken";
import { z } from "zod";
import { saveStorefrontInquiryQuote } from "./new-sales-form";

const UPLOAD_TOKEN_TTL_SECONDS = 30 * 60;
const QUOTE_CONVERSION_LEASE_MS = 2 * 60 * 1000;

const uploadTokenPayloadSchema = z.object({
	scope: z.literal("storefront-inquiry-upload"),
	inquiryId: z.string().min(1),
	ownerUserId: z.number().int().positive().nullable(),
	guestHash: z.string().nullable(),
});

function json(value: unknown): Prisma.InputJsonValue {
	return value as Prisma.InputJsonValue;
}

function safeRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function inquirySecret() {
	const secret =
		process.env.STOREFRONT_INQUIRY_SECRET ||
		process.env.STOREFRONT_GUEST_SECRET ||
		process.env.JWT_SECRET ||
		process.env.AUTH_SECRET ||
		process.env.NEXTAUTH_SECRET ||
		(process.env.NODE_ENV !== "production"
			? "gnd-local-storefront-inquiry"
			: "");
	if (!secret) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Custom project intake is not configured.",
		});
	}
	return secret;
}

export function getStorefrontInquiryBlobToken() {
	return (
		process.env.STOREFRONT_INQUIRY_BLOB_READ_WRITE_TOKEN ||
		process.env.BLOB_READ_WRITE_TOKEN ||
		""
	);
}

function issueUploadToken(input: {
	inquiryId: string;
	ownerUserId?: number;
	guestHash?: string;
}) {
	return sign(
		{
			scope: "storefront-inquiry-upload",
			inquiryId: input.inquiryId,
			ownerUserId: input.ownerUserId || null,
			guestHash: input.guestHash || null,
		},
		inquirySecret(),
		{ expiresIn: UPLOAD_TOKEN_TTL_SECONDS },
	);
}

export function decodeStorefrontInquiryUploadToken(
	token: string,
	inquiryId: string,
) {
	let decoded: unknown;
	try {
		decoded = verify(token, inquirySecret());
	} catch {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "The upload session expired. Please try again.",
		});
	}
	const payload = uploadTokenPayloadSchema.parse(decoded);
	if (payload.inquiryId !== inquiryId) {
		throw new TRPCError({ code: "FORBIDDEN", message: "Invalid upload path." });
	}
	return payload;
}

export function verifyStorefrontInquiryUploadToken(input: {
	token: string;
	inquiryId: string;
	ownerUserId?: number;
	guestHash?: string;
}) {
	const payload = decodeStorefrontInquiryUploadToken(
		input.token,
		input.inquiryId,
	);
	if (
		payload.ownerUserId !== (input.ownerUserId || null) ||
		payload.guestHash !== (input.guestHash || null)
	) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "This upload session does not belong to this request.",
		});
	}
	return payload;
}

async function configuredSalesRep(ctx: TRPCContext) {
	const setting = await ctx.db.settings.findFirst({
		where: { type: "storefront-settings", deletedAt: null },
		orderBy: { id: "desc" },
		select: { meta: true },
	});
	const id = Number(safeRecord(setting?.meta).defaultSalesRepId || 0);
	if (!Number.isInteger(id) || id <= 0) return null;
	const eligibleIds = await getUserIdsWithPermission(
		ctx.db,
		"viewStorefrontOrders",
	);
	if (!eligibleIds.has(id)) return null;
	return ctx.db.users.findFirst({
		where: {
			id,
			deletedAt: null,
			accessRevokedAt: null,
		},
		select: { id: true, name: true, email: true },
	});
}

export async function startStorefrontCustomInquiry(
	ctx: TRPCContext,
	input: unknown,
) {
	const payload = storefrontCustomInquiryDraftSchema.parse(input);
	const customer = ctx.userId
		? await ctx.db.customers.findFirst({
				where: { userId: ctx.userId, deletedAt: null },
				select: { id: true },
			})
		: null;
	const created = await ctx.db.$transaction(async (tx) => {
		const inquiry = await tx.storefrontInquiry.create({
			data: {
				type: "CUSTOM_QUOTE",
				status: "DRAFT",
				ownerUserId: ctx.userId,
				customerId: customer?.id || null,
				name: payload.name,
				email: payload.email.toLowerCase(),
				phone: payload.phone || null,
				subject: "Custom millwork project request",
				message: payload.brief.description,
				projectTypes: json(payload.brief.projectTypes),
				projectBrief: json(payload.brief),
				budget: payload.brief.budget || null,
				requestId: ctx.requestId,
				ipHash: ctx.ipAddress
					? createHash("sha256").update(ctx.ipAddress).digest("hex")
					: null,
			},
			select: { id: true },
		});
		const reference = storefrontInquiryReference(inquiry.id, "CUSTOM_QUOTE");
		await tx.storefrontInquiry.update({
			where: { id: inquiry.id },
			data: { reference, lastActivityAt: new Date() },
		});
		await tx.storefrontInquiryActivity.create({
			data: {
				inquiryId: inquiry.id,
				type: "draft.created",
				actorUserId: ctx.userId,
				metadata: json({ requestId: ctx.requestId }),
			},
		});
		return { id: inquiry.id, reference };
	});
	return {
		...created,
		uploadToken: issueUploadToken({
			inquiryId: created.id,
			ownerUserId: ctx.userId,
			guestHash: ctx.guestTokenHash,
		}),
		uploadExpiresInSeconds: UPLOAD_TOKEN_TTL_SECONDS,
	};
}

async function verifiedAttachments(
	inquiryId: string,
	attachments: z.infer<
		typeof storefrontFinalizeCustomInquirySchema
	>["attachments"],
) {
	if (!attachments.length) return [];
	const token = getStorefrontInquiryBlobToken();
	if (!token) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Private project attachments are not configured.",
		});
	}
	const prefix = `storefront-inquiries/${inquiryId}/`;
	return Promise.all(
		attachments.map(async (attachment) => {
			if (!attachment.pathname.startsWith(prefix)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "An attachment path is invalid.",
				});
			}
			const blob = await head(attachment.pathname, { token });
			if (
				blob.pathname !== attachment.pathname ||
				blob.size !== attachment.size ||
				blob.contentType !== attachment.contentType
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "An attachment could not be verified.",
				});
			}
			return { ...attachment, url: blob.url };
		}),
	);
}

export async function finalizeStorefrontCustomInquiry(
	ctx: TRPCContext,
	input: unknown,
) {
	const payload = storefrontFinalizeCustomInquirySchema.parse(input);
	verifyStorefrontInquiryUploadToken({
		token: payload.uploadToken,
		inquiryId: payload.inquiryId,
		ownerUserId: ctx.userId,
		guestHash: ctx.guestTokenHash,
	});
	const existing = await ctx.db.storefrontInquiry.findUnique({
		where: { id: payload.inquiryId },
		select: {
			id: true,
			reference: true,
			status: true,
			assignedToId: true,
			submittedAt: true,
		},
	});
	if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
	if (existing.submittedAt && existing.status !== "DRAFT") {
		return {
			id: existing.id,
			reference: existing.reference,
			assignedToId: existing.assignedToId,
			alreadySubmitted: true,
		};
	}
	const [attachments, salesRep] = await Promise.all([
		verifiedAttachments(payload.inquiryId, payload.attachments),
		configuredSalesRep(ctx),
	]);
	const now = new Date();
	const finalized = await ctx.db.$transaction(async (tx) => {
		const claimed = await tx.storefrontInquiry.updateMany({
			where: {
				id: payload.inquiryId,
				status: "DRAFT",
				submittedAt: null,
			},
			data: {
				status: "NEW",
				assignedToId: salesRep?.id || null,
				submittedAt: now,
				lastActivityAt: now,
			},
		});
		if (!claimed.count) {
			const inquiry = await tx.storefrontInquiry.findUniqueOrThrow({
				where: { id: payload.inquiryId },
				select: { id: true, reference: true, assignedToId: true },
			});
			return { ...inquiry, alreadySubmitted: true };
		}
		if (attachments.length) {
			await tx.storedDocument.createMany({
				data: attachments.map((attachment) => ({
					kind: "attachment",
					ownerType: "storefront_inquiry",
					ownerId: payload.inquiryId,
					ownerKey: attachment.pathname,
					provider: "vercel-blob",
					pathname: attachment.pathname,
					url: attachment.url,
					filename: attachment.filename,
					mimeType: attachment.contentType,
					extension: attachment.filename.split(".").pop() || null,
					size: attachment.size,
					visibility: "private",
					status: "ready",
					isCurrent: true,
					generated: false,
					uploadedBy: ctx.userId || null,
					meta: json({ source: "storefront-custom-inquiry" }),
				})),
			});
		}
		await tx.storefrontInquiryActivity.createMany({
			data: [
				{
					inquiryId: payload.inquiryId,
					type: "inquiry.submitted",
					actorUserId: ctx.userId || null,
					metadata: json({ attachmentCount: attachments.length }),
				},
				...(salesRep
					? [
							{
								inquiryId: payload.inquiryId,
								type: "inquiry.assigned",
								actorUserId: null,
								metadata: json({ assignedToId: salesRep.id }),
							},
						]
					: []),
			],
		});
		await tx.storefrontAuditEvent.create({
			data: {
				ownerUserId: ctx.userId,
				guestHash: ctx.userId ? null : ctx.guestTokenHash,
				action: "inquiry.submitted",
				entityType: "StorefrontInquiry",
				entityId: payload.inquiryId,
				requestId: ctx.requestId,
				metadata: json({
					type: "CUSTOM_QUOTE",
					attachmentCount: attachments.length,
				}),
			},
		});
		return {
			id: payload.inquiryId,
			reference: existing.reference,
			assignedToId: salesRep?.id || null,
			alreadySubmitted: false,
		};
	});
	return finalized;
}

export const storefrontInquiryListSchema = z.object({
	query: z.string().trim().max(191).optional(),
	status: storefrontInquiryStatusSchema.exclude(["DRAFT"]).optional(),
	assignedToId: z.number().int().positive().nullable().optional(),
	projectType: z.string().trim().max(100).optional(),
	owner: z.enum(["all", "mine", "unassigned"]).default("all"),
	cursor: z.string().trim().min(1).optional(),
	limit: z.number().int().min(1).max(50).default(25),
});

export async function listStorefrontInquiries(
	ctx: TRPCContext & { userId: number },
	input: z.infer<typeof storefrontInquiryListSchema>,
) {
	const payload = storefrontInquiryListSchema.parse(input);
	const rows = await ctx.db.storefrontInquiry.findMany({
		where: {
			status: payload.status || { not: "DRAFT" },
			...(payload.owner === "mine" ? { assignedToId: ctx.userId } : {}),
			...(payload.owner === "unassigned" ? { assignedToId: null } : {}),
			...(payload.assignedToId !== undefined
				? { assignedToId: payload.assignedToId }
				: {}),
			...(payload.projectType
				? { projectTypes: { array_contains: payload.projectType } }
				: {}),
			...(payload.query
				? {
						OR: [
							{ reference: { contains: payload.query } },
							{ name: { contains: payload.query } },
							{ email: { contains: payload.query } },
							{ phone: { contains: payload.query } },
							{ subject: { contains: payload.query } },
						],
					}
				: {}),
		},
		cursor: payload.cursor ? { id: payload.cursor } : undefined,
		skip: payload.cursor ? 1 : 0,
		orderBy: [
			{ lastActivityAt: "desc" },
			{ createdAt: "desc" },
			{ id: "desc" },
		],
		take: payload.limit + 1,
		select: {
			id: true,
			reference: true,
			type: true,
			status: true,
			name: true,
			email: true,
			phone: true,
			projectTypes: true,
			budget: true,
			assignedToId: true,
			salesQuoteId: true,
			submittedAt: true,
			lastActivityAt: true,
			createdAt: true,
		},
	});
	const page = rows.slice(0, payload.limit);
	const assigneeIds = [
		...new Set(
			page.map((row) => row.assignedToId).filter((id): id is number => !!id),
		),
	];
	const assignees = assigneeIds.length
		? await ctx.db.users.findMany({
				where: { id: { in: assigneeIds } },
				select: { id: true, name: true, email: true },
			})
		: [];
	const assigneeById = new Map(assignees.map((user) => [user.id, user]));
	return {
		items: page.map((row) => ({
			...row,
			projectTypes: Array.isArray(row.projectTypes) ? row.projectTypes : [],
			assignee: row.assignedToId
				? assigneeById.get(row.assignedToId) || null
				: null,
			submittedAt: row.submittedAt?.toISOString() || null,
			lastActivityAt: row.lastActivityAt?.toISOString() || null,
			createdAt: row.createdAt.toISOString(),
		})),
		nextCursor: rows.length > payload.limit ? page.at(-1)?.id || null : null,
	};
}

export async function getStorefrontInquirySummary(
	ctx: TRPCContext & { userId: number },
) {
	const [groups, unassigned] = await Promise.all([
		ctx.db.storefrontInquiry.groupBy({
			by: ["status"],
			where: { status: { not: "DRAFT" } },
			_count: { _all: true },
		}),
		ctx.db.storefrontInquiry.count({
			where: {
				status: { notIn: ["DRAFT", "CLOSED", "SPAM"] },
				assignedToId: null,
			},
		}),
	]);
	const counts = Object.fromEntries(
		groups.map((group) => [group.status, group._count._all]),
	);
	return {
		new: counts.NEW || 0,
		inReview: counts.IN_REVIEW || 0,
		awaitingCustomer: counts.AWAITING_CUSTOMER || 0,
		quoteCreated: counts.QUOTE_CREATED || 0,
		unassigned,
	};
}

export async function getStorefrontInquiryDetail(
	ctx: TRPCContext,
	inquiryId: string,
) {
	const inquiry = await ctx.db.storefrontInquiry.findFirst({
		where: { id: inquiryId, status: { not: "DRAFT" } },
	});
	if (!inquiry) throw new TRPCError({ code: "NOT_FOUND" });
	const [assignee, customer, quote, matches] = await Promise.all([
		inquiry.assignedToId
			? ctx.db.users.findUnique({
					where: { id: inquiry.assignedToId },
					select: { id: true, name: true, email: true },
				})
			: null,
		inquiry.customerId
			? ctx.db.customers.findFirst({
					where: { id: inquiry.customerId, deletedAt: null },
					select: {
						id: true,
						name: true,
						businessName: true,
						email: true,
						phoneNo: true,
					},
				})
			: null,
		inquiry.salesQuoteId
			? ctx.db.salesOrders.findFirst({
					where: { id: inquiry.salesQuoteId, deletedAt: null },
					select: {
						id: true,
						orderId: true,
						slug: true,
						status: true,
						grandTotal: true,
					},
				})
			: null,
		inquiry.customerId
			? []
			: ctx.db.customers.findMany({
					where: {
						deletedAt: null,
						dealerOwnerId: null,
						OR: [
							{ email: inquiry.email },
							...(inquiry.phone ? [{ phoneNo: inquiry.phone }] : []),
						],
					},
					take: 5,
					select: {
						id: true,
						name: true,
						businessName: true,
						email: true,
						phoneNo: true,
					},
				}),
	]);
	return {
		...inquiry,
		projectTypes: Array.isArray(inquiry.projectTypes)
			? inquiry.projectTypes
			: [],
		projectBrief: safeRecord(inquiry.projectBrief),
		assignee,
		customer,
		quote: quote
			? { ...quote, grandTotal: Number(quote.grandTotal || 0) }
			: null,
		customerMatches: matches,
		createdAt: inquiry.createdAt.toISOString(),
		updatedAt: inquiry.updatedAt.toISOString(),
		submittedAt: inquiry.submittedAt?.toISOString() || null,
		lastActivityAt: inquiry.lastActivityAt?.toISOString() || null,
		closedAt: inquiry.closedAt?.toISOString() || null,
	};
}

export async function listStorefrontInquiryDocuments(
	ctx: TRPCContext,
	inquiryId: string,
) {
	const inquiry = await ctx.db.storefrontInquiry.findFirst({
		where: { id: inquiryId, status: { not: "DRAFT" } },
		select: { id: true },
	});
	if (!inquiry) throw new TRPCError({ code: "NOT_FOUND" });
	const documents = await ctx.db.storedDocument.findMany({
		where: {
			ownerType: "storefront_inquiry",
			ownerId: inquiryId,
			kind: "attachment",
			status: "ready",
			deletedAt: null,
		},
		orderBy: { createdAt: "asc" },
		select: {
			id: true,
			filename: true,
			mimeType: true,
			size: true,
			createdAt: true,
		},
	});
	return documents.map((document) => ({
		...document,
		filename: document.filename || "Project attachment",
		createdAt: document.createdAt?.toISOString() || null,
		downloadUrl: `/api/storefront/inquiries/${inquiryId}/attachments/${document.id}`,
	}));
}

export async function listStorefrontInquiryActivity(
	ctx: TRPCContext,
	inquiryId: string,
) {
	const rows = await ctx.db.storefrontInquiryActivity.findMany({
		where: { inquiryId },
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: 100,
	});
	const actorIds = [
		...new Set(
			rows.map((row) => row.actorUserId).filter((id): id is number => !!id),
		),
	];
	const actors = actorIds.length
		? await ctx.db.users.findMany({
				where: { id: { in: actorIds } },
				select: { id: true, name: true, email: true },
			})
		: [];
	const actorById = new Map(actors.map((actor) => [actor.id, actor]));
	return rows.map((row) => ({
		...row,
		actor: row.actorUserId ? actorById.get(row.actorUserId) || null : null,
		createdAt: row.createdAt.toISOString(),
	}));
}

export async function listStorefrontInquiryAssignees(ctx: TRPCContext) {
	const eligibleIds = await getUserIdsWithPermission(
		ctx.db,
		"viewStorefrontOrders",
	);
	return ctx.db.users.findMany({
		where: {
			id: { in: [...eligibleIds] },
			deletedAt: null,
			accessRevokedAt: null,
		},
		orderBy: { name: "asc" },
		select: { id: true, name: true, email: true },
	});
}

export async function updateStorefrontInquiryStatus(
	ctx: TRPCContext & { userId: number },
	input: { id: string; status: StorefrontInquiryStatus },
) {
	const status = storefrontInquiryStatusSchema
		.exclude(["DRAFT", "QUOTE_CREATED"])
		.parse(input.status);
	const current = await ctx.db.storefrontInquiry.findFirst({
		where: { id: input.id, status: { not: "DRAFT" } },
		select: { id: true, status: true },
	});
	if (!current) throw new TRPCError({ code: "NOT_FOUND" });
	if (!canTransitionStorefrontInquiry(current.status, status)) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Cannot move this inquiry from ${current.status} to ${status}.`,
		});
	}
	const now = new Date();
	await ctx.db.$transaction([
		ctx.db.storefrontInquiry.update({
			where: { id: input.id },
			data: {
				status,
				lastActivityAt: now,
				closedAt: status === "CLOSED" || status === "SPAM" ? now : null,
			},
		}),
		ctx.db.storefrontInquiryActivity.create({
			data: {
				inquiryId: input.id,
				type: "status.changed",
				actorUserId: ctx.userId,
				metadata: json({ from: current.status, to: status }),
			},
		}),
		ctx.db.storefrontAuditEvent.create({
			data: {
				actorUserId: ctx.userId,
				action: "inquiry.status_updated",
				entityType: "StorefrontInquiry",
				entityId: input.id,
				requestId: ctx.requestId,
				metadata: json({ from: current.status, to: status }),
			},
		}),
	]);
	return { ok: true, status };
}

export async function assignStorefrontInquiry(
	ctx: TRPCContext & { userId: number },
	input: { id: string; assignedToId: number | null },
) {
	const assignee = input.assignedToId
		? await (async () => {
				const eligibleIds = await getUserIdsWithPermission(
					ctx.db,
					"viewStorefrontOrders",
				);
				if (!eligibleIds.has(input.assignedToId!)) return null;
				return ctx.db.users.findFirst({
					where: {
						id: input.assignedToId,
						deletedAt: null,
						accessRevokedAt: null,
					},
					select: { id: true, name: true, email: true },
				});
			})()
		: null;
	if (input.assignedToId && !assignee) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Select an eligible sales rep.",
		});
	}
	const now = new Date();
	const current = await ctx.db.storefrontInquiry.findFirst({
		where: { id: input.id, status: { not: "DRAFT" } },
		select: { assignedToId: true, status: true },
	});
	if (!current) throw new TRPCError({ code: "NOT_FOUND" });
	await ctx.db.$transaction([
		ctx.db.storefrontInquiry.update({
			where: { id: input.id },
			data: {
				assignedToId: assignee?.id || null,
				status: current.status === "NEW" && assignee ? "IN_REVIEW" : undefined,
				lastActivityAt: now,
			},
		}),
		ctx.db.storefrontInquiryActivity.create({
			data: {
				inquiryId: input.id,
				type: "inquiry.assigned",
				actorUserId: ctx.userId,
				metadata: json({
					from: current.assignedToId,
					to: assignee?.id || null,
				}),
			},
		}),
		ctx.db.storefrontAuditEvent.create({
			data: {
				actorUserId: ctx.userId,
				action: "inquiry.assigned",
				entityType: "StorefrontInquiry",
				entityId: input.id,
				requestId: ctx.requestId,
				metadata: json({ assignedToId: assignee?.id || null }),
			},
		}),
	]);
	return { ok: true, assignee };
}

export async function addStorefrontInquiryNote(
	ctx: TRPCContext & { userId: number },
	input: { id: string; body: string },
) {
	const body = z.string().trim().min(1).max(10_000).parse(input.body);
	const inquiry = await ctx.db.storefrontInquiry.findFirst({
		where: { id: input.id, status: { not: "DRAFT" } },
		select: { id: true },
	});
	if (!inquiry) throw new TRPCError({ code: "NOT_FOUND" });
	const now = new Date();
	const activity = await ctx.db.$transaction(async (tx) => {
		const created = await tx.storefrontInquiryActivity.create({
			data: {
				inquiryId: input.id,
				type: "note.added",
				actorUserId: ctx.userId,
				body,
			},
		});
		await tx.storefrontInquiry.update({
			where: { id: input.id },
			data: { lastActivityAt: now },
		});
		return created;
	});
	return { id: activity.id, createdAt: activity.createdAt.toISOString() };
}

export async function linkStorefrontInquiryCustomer(
	ctx: TRPCContext & { userId: number },
	input: { id: string; customerId: number },
) {
	const customer = await ctx.db.customers.findFirst({
		where: { id: input.customerId, dealerOwnerId: null, deletedAt: null },
		select: {
			id: true,
			name: true,
			businessName: true,
			email: true,
			phoneNo: true,
		},
	});
	if (!customer)
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Customer not found.",
		});
	const now = new Date();
	await ctx.db.$transaction([
		ctx.db.storefrontInquiry.update({
			where: { id: input.id },
			data: { customerId: customer.id, lastActivityAt: now },
		}),
		ctx.db.storefrontInquiryActivity.create({
			data: {
				inquiryId: input.id,
				type: "customer.linked",
				actorUserId: ctx.userId,
				metadata: json({ customerId: customer.id }),
			},
		}),
	]);
	return customer;
}

async function findStorefrontInquiryOriginQuote(
	ctx: TRPCContext,
	inquiryId: string,
) {
	return ctx.db.salesOrders.findFirst({
		where: {
			deletedAt: null,
			salesChannel: "storefront-custom",
			meta: {
				path: "$.storefrontInquiry.id",
				equals: inquiryId,
			},
		},
		orderBy: { id: "asc" },
		select: { id: true, orderId: true, slug: true, status: true },
	});
}

async function recoverStorefrontInquiryQuote(
	ctx: TRPCContext & { userId: number },
	inquiryId: string,
) {
	const quote = await findStorefrontInquiryOriginQuote(ctx, inquiryId);
	if (!quote) return null;
	const now = new Date();
	await ctx.db.$transaction(async (tx) => {
		const linked = await tx.storefrontInquiry.updateMany({
			where: { id: inquiryId, salesQuoteId: null },
			data: {
				salesQuoteId: quote.id,
				status: "QUOTE_CREATED",
				quoteConversionStartedAt: null,
				quoteConversionById: null,
				lastActivityAt: now,
			},
		});
		if (!linked.count) return;
		await tx.storefrontInquiryActivity.create({
			data: {
				inquiryId,
				type: "quote.recovered",
				actorUserId: ctx.userId,
				metadata: json({ salesQuoteId: quote.id, quoteNo: quote.orderId }),
			},
		});
		await tx.storefrontAuditEvent.create({
			data: {
				actorUserId: ctx.userId,
				action: "inquiry.quote_recovered",
				entityType: "StorefrontInquiry",
				entityId: inquiryId,
				requestId: ctx.requestId,
				metadata: json({ salesQuoteId: quote.id }),
			},
		});
	});
	return { ...quote, alreadyCreated: true };
}

export async function createStorefrontInquiryQuote(
	ctx: TRPCContext & { userId: number },
	inquiryId: string,
) {
	const existing = await ctx.db.storefrontInquiry.findFirst({
		where: { id: inquiryId, status: { not: "DRAFT" } },
	});
	if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
	if (existing.salesQuoteId) {
		const quote = await ctx.db.salesOrders.findUniqueOrThrow({
			where: { id: existing.salesQuoteId },
			select: { id: true, orderId: true, slug: true, status: true },
		});
		return { ...quote, alreadyCreated: true };
	}
	const recovered = await recoverStorefrontInquiryQuote(ctx, inquiryId);
	if (recovered) return recovered;
	if (!existing.customerId) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Link a customer first.",
		});
	}
	if (!existing.assignedToId) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Assign a sales rep first.",
		});
	}
	const leaseCutoff = new Date(Date.now() - QUOTE_CONVERSION_LEASE_MS);
	const leased = await ctx.db.storefrontInquiry.updateMany({
		where: {
			id: inquiryId,
			salesQuoteId: null,
			OR: [
				{ quoteConversionStartedAt: null },
				{ quoteConversionStartedAt: { lte: leaseCutoff } },
			],
		},
		data: {
			quoteConversionStartedAt: new Date(),
			quoteConversionById: ctx.userId,
		},
	});
	if (!leased.count) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Quote creation is already in progress.",
		});
	}
	try {
		const recoveredAfterLease = await recoverStorefrontInquiryQuote(
			ctx,
			inquiryId,
		);
		if (recoveredAfterLease) return recoveredAfterLease;
		const brief = safeRecord(existing.projectBrief);
		const projectTypes = Array.isArray(existing.projectTypes)
			? existing.projectTypes.map((value) => {
					try {
						return storefrontProjectTypeLabel(value as never);
					} catch {
						return String(value);
					}
				})
			: [];
		const notes = [
			`Storefront custom millwork request ${existing.reference || existing.id}`,
			projectTypes.length ? `Project: ${projectTypes.join(", ")}` : null,
			brief.city && brief.state
				? `Location: ${brief.city}, ${brief.state}`
				: null,
			`Customer description: ${existing.message}`,
		]
			.filter(Boolean)
			.join("\n");
		const quote = await saveStorefrontInquiryQuote(ctx, {
			inquiryId,
			reference: existing.reference || existing.id,
			customerId: existing.customerId,
			salesRepId: existing.assignedToId,
			notes,
		});
		const now = new Date();
		await ctx.db.$transaction([
			ctx.db.storefrontInquiry.update({
				where: { id: inquiryId },
				data: {
					salesQuoteId: quote.salesId,
					status: "QUOTE_CREATED",
					quoteConversionStartedAt: null,
					quoteConversionById: null,
					lastActivityAt: now,
				},
			}),
			ctx.db.storefrontInquiryActivity.create({
				data: {
					inquiryId,
					type: "quote.created",
					actorUserId: ctx.userId,
					metadata: json({
						salesQuoteId: quote.salesId,
						quoteNo: quote.orderId,
					}),
				},
			}),
			ctx.db.storefrontAuditEvent.create({
				data: {
					actorUserId: ctx.userId,
					action: "inquiry.quote_created",
					entityType: "StorefrontInquiry",
					entityId: inquiryId,
					requestId: ctx.requestId,
					metadata: json({ salesQuoteId: quote.salesId }),
				},
			}),
		]);
		return {
			id: quote.salesId,
			orderId: quote.orderId,
			slug: quote.slug,
			status: "Draft",
			alreadyCreated: false,
		};
	} catch (error) {
		await ctx.db.storefrontInquiry.updateMany({
			where: {
				id: inquiryId,
				salesQuoteId: null,
				quoteConversionById: ctx.userId,
			},
			data: { quoteConversionStartedAt: null, quoteConversionById: null },
		});
		throw error;
	}
}
