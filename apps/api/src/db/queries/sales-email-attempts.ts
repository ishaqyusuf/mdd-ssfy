import type {
	ListSalesEmailAttemptsInput,
	ResendSalesEmailAttemptInput,
} from "@api/schemas/emails";
import type { TRPCContext } from "@api/trpc/init";
import {
	getUserSpecificPermissions,
	mergePermissionRecords,
} from "@gnd/auth/utils";
import type { Prisma } from "@gnd/db";
import { generatePermissions } from "@gnd/utils/constants";
import { tasks } from "@trigger.dev/sdk/v3";
import { TRPCError } from "@trpc/server";

type SalesEmailAttemptStatus =
	| "QUEUED"
	| "SENDING"
	| "SENT"
	| "FAILED"
	| "SKIPPED";

const RETRYABLE_STATUSES = new Set<SalesEmailAttemptStatus>([
	"FAILED",
	"SKIPPED",
]);

const salesEmailAttemptSelect = {
	id: true,
	status: true,
	emailKind: true,
	documentType: true,
	emailType: true,
	subject: true,
	message: true,
	recipientEmail: true,
	customerName: true,
	customerEmail: true,
	provider: true,
	providerMessageId: true,
	providerStatus: true,
	taskRunId: true,
	errorCode: true,
	errorMessage: true,
	salesIds: true,
	salesNos: true,
	salesIdsText: true,
	salesNosText: true,
	originalAttemptId: true,
	sentAt: true,
	failedAt: true,
	skippedAt: true,
	createdAt: true,
	updatedAt: true,
	sender: {
		select: {
			id: true,
			name: true,
			email: true,
		},
	},
	salesRep: {
		select: {
			id: true,
			name: true,
			email: true,
		},
	},
	_count: {
		select: {
			retryAttempts: true,
		},
	},
} satisfies Prisma.SalesEmailAttemptSelect;

type SalesEmailAttemptListRow = Prisma.SalesEmailAttemptGetPayload<{
	select: typeof salesEmailAttemptSelect;
}>;

type SalesEmailAttemptRecord = Prisma.SalesEmailAttemptGetPayload<undefined>;

function objectRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return value as Record<string, unknown>;
}

async function requireSalesEmailActor(ctx: TRPCContext) {
	if (!ctx.userId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be signed in.",
		});
	}

	const user = await ctx.db.users.findFirst({
		where: {
			id: ctx.userId,
			deletedAt: null,
			accessRevokedAt: null,
		},
		select: {
			id: true,
			name: true,
			email: true,
			roles: {
				where: {
					deletedAt: null,
				},
				select: {
					role: {
						select: {
							name: true,
							RoleHasPermissions: {
								where: {
									deletedAt: null,
								},
								select: {
									permission: {
										select: {
											id: true,
											name: true,
										},
									},
								},
							},
						},
					},
				},
			},
		},
	});

	if (!user) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be signed in.",
		});
	}

	const role = user.roles[0]?.role;
	const rolePermissions =
		role?.RoleHasPermissions.map((item) => item.permission) ?? [];
	const specificPermissions = await getUserSpecificPermissions(ctx.db, user.id);
	const can = generatePermissions(
		role?.name,
		mergePermissionRecords(rolePermissions, specificPermissions),
	);
	const isSuperAdmin = role?.name?.toLowerCase() === "super admin";

	if (
		!isSuperAdmin &&
		!can.viewOrders &&
		!can.editOrders &&
		!can.viewEstimates
	) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You do not have access to sales email transactions.",
		});
	}

	return {
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
		},
		roleTitle: role?.name ?? null,
		can,
		isSuperAdmin,
	};
}

function normalizeDateRange(input?: ListSalesEmailAttemptsInput) {
	if (!input?.from && !input?.to) return undefined;

	return {
		...(input.from ? { gte: input.from } : {}),
		...(input.to ? { lte: input.to } : {}),
	};
}

function buildSearchFilter(q?: string) {
	const term = q?.trim();
	if (!term) return null;

	return {
		OR: [
			{ recipientEmail: { contains: term } },
			{ customerEmail: { contains: term } },
			{ customerName: { contains: term } },
			{ subject: { contains: term } },
			{ salesNosText: { contains: term } },
			{ providerMessageId: { contains: term } },
		],
	};
}

function toStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value
		.map((item) => (item == null ? null : String(item)))
		.filter((item): item is string => Boolean(item));
}

function getRetryPayload(attempt: SalesEmailAttemptRecord) {
	const metadata = objectRecord(attempt.metadata);
	const payload =
		metadata.payload &&
		typeof metadata.payload === "object" &&
		!Array.isArray(metadata.payload)
			? { ...metadata.payload }
			: null;

	if (payload) return payload;

	const salesIds = toStringArray(attempt.salesIds)
		.map(Number)
		.filter((id) => Number.isFinite(id) && id > 0);
	const printType = attempt.documentType === "quote" ? "quote" : "order";

	if (!salesIds.length) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "This email attempt is missing the sales ids needed to resend.",
		});
	}

	if (attempt.emailKind === "composed_sales_document_email") {
		if (!attempt.subject) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "This custom email attempt is missing its subject.",
			});
		}

		return {
			printType,
			salesIds,
			customerEmail: attempt.customerEmail || attempt.recipientEmail,
			customerName: attempt.customerName || undefined,
			subject: attempt.subject,
			message: attempt.message || undefined,
		};
	}

	return {
		emailType: attempt.emailType || "with payment",
		printType,
		salesIds,
		customerEmail: attempt.customerEmail || attempt.recipientEmail,
		note: attempt.message || undefined,
	};
}

function mapAttempt(row: SalesEmailAttemptListRow, canResend: boolean) {
	const status = row.status as SalesEmailAttemptStatus;
	return {
		id: row.id,
		status,
		emailKind: row.emailKind,
		documentType: row.documentType,
		emailType: row.emailType,
		subject: row.subject,
		message: row.message,
		recipientEmail: row.recipientEmail,
		customerName: row.customerName,
		customerEmail: row.customerEmail,
		provider: row.provider,
		providerMessageId: row.providerMessageId,
		providerStatus: row.providerStatus,
		taskRunId: row.taskRunId,
		errorCode: row.errorCode,
		errorMessage: row.errorMessage,
		salesIds: toStringArray(row.salesIds).map(Number),
		salesNos: toStringArray(row.salesNos),
		salesIdsText: row.salesIdsText,
		salesNosText: row.salesNosText,
		originalAttemptId: row.originalAttemptId,
		retryCount: row._count?.retryAttempts ?? 0,
		canResend: canResend && RETRYABLE_STATUSES.has(status),
		sentAt: row.sentAt,
		failedAt: row.failedAt,
		skippedAt: row.skippedAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		sender: row.sender
			? {
					id: row.sender.id,
					name: row.sender.name,
					email: row.sender.email,
				}
			: null,
		salesRep: row.salesRep
			? {
					id: row.salesRep.id,
					name: row.salesRep.name,
					email: row.salesRep.email,
				}
			: null,
	};
}

export async function listSalesEmailAttempts(
	ctx: TRPCContext,
	input?: ListSalesEmailAttemptsInput,
) {
	const actor = await requireSalesEmailActor(ctx);
	const page = input?.page ?? 1;
	const size = input?.size ?? 25;
	const andFilters: Prisma.SalesEmailAttemptWhereInput[] = [
		{ deletedAt: null },
	];
	const createdAt = normalizeDateRange(input);
	const searchFilter = buildSearchFilter(input?.q);

	if (!actor.isSuperAdmin) {
		andFilters.push({
			OR: [{ senderId: actor.user.id }, { salesRepId: actor.user.id }],
		});
	}

	if (input?.status) {
		andFilters.push({ status: input.status });
	}

	if (input?.salesRepId) {
		if (!actor.isSuperAdmin && input.salesRepId !== actor.user.id) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You can only filter your own email transactions.",
			});
		}
		andFilters.push({ salesRepId: input.salesRepId });
	}

	if (createdAt) {
		andFilters.push({ createdAt });
	}

	if (searchFilter) {
		andFilters.push(searchFilter);
	}

	const where = { AND: andFilters };
	const [total, rows] = await Promise.all([
		ctx.db.salesEmailAttempt.count({ where }),
		ctx.db.salesEmailAttempt.findMany({
			where,
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			skip: (page - 1) * size,
			take: size,
			select: salesEmailAttemptSelect,
		}),
	]);

	return {
		rows: rows.map((row) => mapAttempt(row, actor.isSuperAdmin)),
		total,
		page,
		size,
		pageCount: Math.max(1, Math.ceil(total / size)),
		canViewAll: actor.isSuperAdmin,
		canResend: actor.isSuperAdmin,
	};
}

export async function resendSalesEmailAttempt(
	ctx: TRPCContext,
	input: ResendSalesEmailAttemptInput,
) {
	const actor = await requireSalesEmailActor(ctx);

	if (!actor.isSuperAdmin) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only Super Admin can resend failed sales emails.",
		});
	}

	const attempt = await ctx.db.salesEmailAttempt.findFirst({
		where: {
			id: input.attemptId,
			deletedAt: null,
		},
	});

	if (!attempt) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Email transaction not found.",
		});
	}

	if (!RETRYABLE_STATUSES.has(attempt.status as SalesEmailAttemptStatus)) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Only failed or skipped email attempts can be resent.",
		});
	}

	if (
		attempt.emailKind !== "simple_sales_document_email" &&
		attempt.emailKind !== "composed_sales_document_email"
	) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "This email transaction cannot be resent from the sales ledger.",
		});
	}

	const metadata = objectRecord(attempt.metadata);
	const payload = getRetryPayload(attempt);
	const retry = await ctx.db.salesEmailAttempt.create({
		data: {
			status: "QUEUED",
			emailKind: attempt.emailKind,
			documentType: attempt.documentType,
			emailType: attempt.emailType,
			subject: attempt.subject,
			message: attempt.message,
			recipientEmail: attempt.recipientEmail,
			customerName: attempt.customerName,
			customerEmail: attempt.customerEmail,
			senderId: actor.user.id,
			salesRepId: attempt.salesRepId,
			salesIds: attempt.salesIds as Prisma.InputJsonValue,
			salesNos: attempt.salesNos as Prisma.InputJsonValue,
			salesIdsText: attempt.salesIdsText,
			salesNosText: attempt.salesNosText,
			originalAttemptId: attempt.id,
			metadata: {
				...metadata,
				payload,
				retry: true,
				retriedById: actor.user.id,
				sourceAttemptId: attempt.id,
			} as unknown as Prisma.InputJsonObject,
		},
	});

	try {
		const event = await tasks.trigger("notification", {
			channel: attempt.emailKind,
			author: {
				id: actor.user.id,
				role: "employee",
			},
			payload: {
				...payload,
				emailAttemptId: retry.id,
				sourceAttemptId: attempt.id,
			},
			testEmailMode: Boolean(metadata.testEmailMode),
		});

		await ctx.db.salesEmailAttempt.update({
			where: {
				id: retry.id,
			},
			data: {
				status: "SENDING",
				taskRunId: event?.id ?? null,
			},
		});

		return {
			attempt: {
				id: retry.id,
				status: "SENDING" as const,
				taskRunId: event?.id ?? null,
			},
		};
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unable to queue resend.";
		await ctx.db.salesEmailAttempt.update({
			where: {
				id: retry.id,
			},
			data: {
				status: "FAILED",
				providerStatus: "queue_failed",
				errorMessage: message,
				failedAt: new Date(),
			},
		});

		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message,
		});
	}
}
