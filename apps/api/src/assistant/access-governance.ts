import { type Database, Prisma } from "@gnd/db";
import { z } from "zod";

export const assistantEntitlementUpdateSchema = z
	.object({
		userId: z.number().int().positive(),
		enabled: z.boolean(),
		expiresAt: z.coerce.date().nullable(),
		reason: z.string().trim().min(3).max(500),
		expectedVersion: z.number().int().nonnegative(),
	})
	.strict();

export class AssistantEntitlementConflictError extends Error {
	constructor() {
		super("Assistant access changed. Refresh and try again.");
		this.name = "AssistantEntitlementConflictError";
	}
}

export class AssistantAccessDisabledError extends Error {
	readonly code = "FORBIDDEN";

	constructor() {
		super("Assistant access is disabled");
		this.name = "AssistantAccessDisabledError";
	}
}

type EntitlementRecord = {
	id: string;
	userId: number;
	enabled: boolean;
	expiresAt: Date | null;
	version: number;
};

export type AssistantAccessState = {
	enabled: boolean;
	status: "enabled" | "disabled" | "expired";
	expiresAt: Date | null;
	version: number;
};

function accessState(
	entitlement: EntitlementRecord | null,
	now: Date,
): AssistantAccessState {
	if (!entitlement)
		return { enabled: false, status: "disabled", expiresAt: null, version: 0 };
	if (entitlement.expiresAt && entitlement.expiresAt <= now)
		return {
			enabled: false,
			status: "expired",
			expiresAt: entitlement.expiresAt,
			version: entitlement.version,
		};
	return {
		enabled: entitlement.enabled,
		status: entitlement.enabled ? "enabled" : "disabled",
		expiresAt: entitlement.expiresAt,
		version: entitlement.version,
	};
}

async function recordLazyExpiry(
	db: Database,
	entitlement: EntitlementRecord,
	now: Date,
) {
	if (
		!entitlement.enabled ||
		!entitlement.expiresAt ||
		entitlement.expiresAt > now
	)
		return;
	await db.$transaction(async (tx) => {
		const nextVersion = entitlement.version + 1;
		const updated = await tx.assistantUserEntitlement.updateMany({
			where: {
				id: entitlement.id,
				version: entitlement.version,
				enabled: true,
				expiresAt: { lte: now },
			},
			data: { enabled: false, version: nextVersion },
		});
		if (updated.count !== 1) return;
		await tx.assistantEntitlementEvent.create({
			data: {
				entitlementId: entitlement.id,
				userId: entitlement.userId,
				type: "expired",
				enabled: false,
				expiresAt: entitlement.expiresAt,
				reason: "Scheduled Assistant access expired",
				actorUserId: null,
				entitlementVersion: nextVersion,
			},
		});
	});
}

export async function getAssistantAccessState(
	db: Database,
	userId: number,
	now = new Date(),
	environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<AssistantAccessState> {
	if (environment.ASSISTANT_ENABLED?.trim().toLowerCase() === "false") {
		return { enabled: false, status: "disabled", expiresAt: null, version: 0 };
	}
	const [user, entitlement] = await Promise.all([
		db.users.findFirst({
			where: { id: userId, deletedAt: null, accessRevokedAt: null },
			select: { id: true },
		}),
		db.assistantUserEntitlement.findUnique({
			where: { userId },
			select: {
				id: true,
				userId: true,
				enabled: true,
				expiresAt: true,
				version: true,
			},
		}),
	]);
	if (!user)
		return { enabled: false, status: "disabled", expiresAt: null, version: 0 };
	if (
		entitlement?.enabled &&
		entitlement.expiresAt &&
		entitlement.expiresAt <= now
	)
		await recordLazyExpiry(db, entitlement, now);
	return accessState(entitlement, now);
}

export async function updateAssistantEntitlement(
	db: Database,
	actorUserId: number,
	rawInput: z.input<typeof assistantEntitlementUpdateSchema>,
	now = new Date(),
) {
	const input = assistantEntitlementUpdateSchema.parse(rawInput);
	if (input.enabled && input.expiresAt && input.expiresAt <= now)
		throw new Error("Assistant access expiry must be in the future");
	return db.$transaction(async (tx) => {
		const target = await tx.users.findFirst({
			where: { id: input.userId, deletedAt: null, accessRevokedAt: null },
			select: { id: true },
		});
		if (!target) throw new Error("Assistant access target is unavailable");
		const current = await tx.assistantUserEntitlement.findUnique({
			where: { userId: input.userId },
		});
		if ((current?.version ?? 0) !== input.expectedVersion)
			throw new AssistantEntitlementConflictError();
		const nextVersion = input.expectedVersion + 1;
		let entitlement: EntitlementRecord;
		if (current) {
			const updated = await tx.assistantUserEntitlement.updateMany({
				where: { id: current.id, version: input.expectedVersion },
				data: {
					enabled: input.enabled,
					expiresAt: input.expiresAt,
					reason: input.reason,
					updatedByUserId: actorUserId,
					version: nextVersion,
				},
			});
			if (updated.count !== 1) throw new AssistantEntitlementConflictError();
			entitlement = { ...current, ...input, version: nextVersion };
		} else {
			try {
				entitlement = await tx.assistantUserEntitlement.create({
					data: {
						userId: input.userId,
						enabled: input.enabled,
						expiresAt: input.expiresAt,
						reason: input.reason,
						createdByUserId: actorUserId,
						updatedByUserId: actorUserId,
						version: nextVersion,
					},
				});
			} catch (error) {
				if (
					error instanceof Prisma.PrismaClientKnownRequestError &&
					error.code === "P2002"
				)
					throw new AssistantEntitlementConflictError();
				throw error;
			}
		}
		await tx.assistantEntitlementEvent.create({
			data: {
				entitlementId: entitlement.id,
				userId: input.userId,
				type: input.enabled ? "enabled" : "disabled",
				enabled: input.enabled,
				expiresAt: input.expiresAt,
				reason: input.reason,
				actorUserId,
				entitlementVersion: nextVersion,
			},
		});
		return accessState(entitlement, now);
	});
}

export async function listAssistantEntitlements(
	db: Database,
	input: { search?: string; take: number },
) {
	const search = input.search?.trim();
	return db.users.findMany({
		where: {
			deletedAt: null,
			...(search
				? {
						OR: [
							{ name: { contains: search } },
							{ email: { contains: search } },
						],
					}
				: {}),
		},
		take: input.take,
		orderBy: [{ name: "asc" }, { id: "asc" }],
		select: {
			id: true,
			name: true,
			email: true,
			accessRevokedAt: true,
			assistantEntitlement: {
				select: {
					enabled: true,
					expiresAt: true,
					reason: true,
					version: true,
					updatedAt: true,
					updatedByUserId: true,
					events: {
						orderBy: { createdAt: "desc" },
						take: 20,
						select: {
							id: true,
							type: true,
							enabled: true,
							expiresAt: true,
							reason: true,
							actorUserId: true,
							entitlementVersion: true,
							createdAt: true,
						},
					},
				},
			},
		},
	});
}
