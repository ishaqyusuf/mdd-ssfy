import type {
	MobileAccessRequestStatus,
	RequestMobileAccessInput,
	UpdateMobileAccessRequestInput,
} from "@api/schemas/mobile-access";
import { manualMobileAccessInvitationAdapter } from "@api/services/mobile-access-invitation";
import {
	canTransitionMobileAccessRequest,
	mobileAccessStatusTimestamp,
	nextMobileAccessStatuses,
} from "@api/services/mobile-access-workflow";
import type { TRPCContext } from "@api/trpc/init";
import { TRPCError } from "@trpc/server";

import { requireSuperAdmin } from "./hrm";

const TERMINAL_RETRY_STATUSES = new Set<MobileAccessRequestStatus>([
	"REJECTED",
	"CANCELLED",
]);

async function requireActiveEmployee(ctx: TRPCContext) {
	if (!ctx.userId) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	const employee = await ctx.db.users.findFirst({
		where: {
			id: ctx.userId,
			deletedAt: null,
			accessRevokedAt: null,
			roles: { some: { deletedAt: null, role: { deletedAt: null } } },
		},
		select: { id: true, name: true, email: true },
	});
	if (!employee) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "An active employee account is required.",
		});
	}
	return employee;
}

const selfRequestSelect = {
	id: true,
	platform: true,
	status: true,
	employeeNote: true,
	statusNote: true,
	requestedAt: true,
	approvedAt: true,
	invitedAt: true,
	acceptedAt: true,
	installedAt: true,
	rejectedAt: true,
	cancelledAt: true,
	lastStatusChangedAt: true,
	updatedAt: true,
	events: {
		orderBy: { createdAt: "asc" as const },
		select: {
			id: true,
			fromStatus: true,
			toStatus: true,
			note: true,
			createdAt: true,
		},
	},
} as const;

export async function getMyMobileAccessRequests(ctx: TRPCContext) {
	const employee = await requireActiveEmployee(ctx);
	return ctx.db.mobileAccessRequest.findMany({
		where: { userId: employee.id },
		orderBy: { platform: "asc" },
		select: selfRequestSelect,
	});
}

export async function requestMobileAccess(
	ctx: TRPCContext,
	input: RequestMobileAccessInput,
) {
	const employee = await requireActiveEmployee(ctx);
	const result = await ctx.db.$transaction(async (tx) => {
		const existing = await tx.mobileAccessRequest.findUnique({
			where: {
				userId_platform: {
					userId: employee.id,
					platform: input.platform,
				},
			},
		});
		if (existing && !TERMINAL_RETRY_STATUSES.has(existing.status)) {
			return tx.mobileAccessRequest.findUniqueOrThrow({
				where: { id: existing.id },
				select: selfRequestSelect,
			});
		}

		const now = new Date();
		const request = existing
			? await tx.mobileAccessRequest.update({
					where: { id: existing.id },
					data: {
						status: "REQUESTED",
						employeeNote: input.employeeNote ?? null,
						statusNote: null,
						internalNote: null,
						invitationProvider: null,
						externalReference: null,
						requestedAt: now,
						approvedAt: null,
						invitedAt: null,
						acceptedAt: null,
						installedAt: null,
						rejectedAt: null,
						cancelledAt: null,
						reviewedById: null,
						lastStatusChangedAt: now,
					},
				})
			: await tx.mobileAccessRequest.create({
					data: {
						userId: employee.id,
						platform: input.platform,
						employeeNote: input.employeeNote ?? null,
						requestedAt: now,
						lastStatusChangedAt: now,
					},
				});

		await tx.mobileAccessRequestEvent.create({
			data: {
				requestId: request.id,
				actorId: employee.id,
				fromStatus: existing?.status ?? null,
				toStatus: "REQUESTED",
				note: input.employeeNote ?? null,
				meta: { source: "dashboard-self-service" },
			},
		});

		const administrators = await tx.users.findMany({
			where: {
				deletedAt: null,
				accessRevokedAt: null,
				roles: {
					some: {
						deletedAt: null,
						role: { name: "Super Admin", deletedAt: null },
					},
				},
			},
			select: { id: true },
		});
		if (administrators.length > 0) {
			await tx.notifications.createMany({
				data: administrators.map((administrator) => ({
					fromUserId: employee.id,
					userId: administrator.id,
					type: "mobile-access-requested",
					message: `${employee.name ?? employee.email} requested ${input.platform === "IOS" ? "iOS" : "Android"} mobile access.`,
					link: "/support/mobile-app",
					alert: true,
				})),
			});
		}

		return tx.mobileAccessRequest.findUniqueOrThrow({
			where: { id: request.id },
			select: selfRequestSelect,
		});
	});
	return result;
}

export async function getMobileAccessRequestsForAdmin(ctx: TRPCContext) {
	await requireSuperAdmin(ctx);
	const requests = await ctx.db.mobileAccessRequest.findMany({
		orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
		include: {
			requester: { select: { id: true, name: true, email: true } },
			reviewedBy: { select: { id: true, name: true, email: true } },
			events: {
				orderBy: { createdAt: "asc" },
				include: {
					actor: { select: { id: true, name: true, email: true } },
				},
			},
		},
	});
	return requests.map((request) => ({
		...request,
		nextStatuses: nextMobileAccessStatuses(request.status).filter(
			(status): status is UpdateMobileAccessRequestInput["status"] =>
				status !== "REQUESTED",
		),
	}));
}

export async function updateMobileAccessRequest(
	ctx: TRPCContext,
	input: UpdateMobileAccessRequestInput,
) {
	const actor = await requireSuperAdmin(ctx);
	return ctx.db.$transaction(async (tx) => {
		const current = await tx.mobileAccessRequest.findUnique({
			where: { id: input.id },
			include: { requester: { select: { name: true, email: true } } },
		});
		if (!current) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Mobile access request not found.",
			});
		}
		if (!canTransitionMobileAccessRequest(current.status, input.status)) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `Cannot move a mobile access request from ${current.status} to ${input.status}.`,
			});
		}

		const now = new Date();
		const invitation =
			input.status === "INVITED"
				? manualMobileAccessInvitationAdapter.prepareRecordedInvitation({
						platform: current.platform,
						externalReference: input.externalReference,
					})
				: {};
		const changed = await tx.mobileAccessRequest.updateMany({
			where: { id: current.id, status: current.status },
			data: {
				status: input.status,
				statusNote: input.statusNote ?? null,
				internalNote:
					input.internalNote === undefined
						? current.internalNote
						: input.internalNote,
				reviewedById: actor.id,
				lastStatusChangedAt: now,
				...mobileAccessStatusTimestamp(input.status, now),
				...invitation,
			},
		});
		if (changed.count !== 1) {
			throw new TRPCError({
				code: "CONFLICT",
				message:
					"The request changed while it was being reviewed. Refresh and retry.",
			});
		}

		await tx.mobileAccessRequestEvent.create({
			data: {
				requestId: current.id,
				actorId: actor.id,
				fromStatus: current.status,
				toStatus: input.status,
				note: input.statusNote ?? null,
				meta: {
					source: "dashboard-admin-review",
					invitationMode:
						input.status === "INVITED"
							? manualMobileAccessInvitationAdapter.mode
							: undefined,
				},
			},
		});
		await tx.notifications.create({
			data: {
				fromUserId: actor.id,
				userId: current.userId,
				type: "mobile-access-status-updated",
				message: `Your ${current.platform === "IOS" ? "iOS" : "Android"} mobile access request is now ${input.status.toLowerCase()}.`,
				link: "/support/mobile-app",
				alert: true,
			},
		});

		return tx.mobileAccessRequest.findUniqueOrThrow({
			where: { id: current.id },
			include: {
				requester: { select: { id: true, name: true, email: true } },
				reviewedBy: { select: { id: true, name: true, email: true } },
				events: {
					orderBy: { createdAt: "asc" },
					include: {
						actor: { select: { id: true, name: true, email: true } },
					},
				},
			},
		});
	});
}
