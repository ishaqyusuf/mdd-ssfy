import type { Database } from "@gnd/db";
import {
	DEFAULT_SALES_REQUEST_PILOT_SETTINGS,
	getSalesRequestPilotSettings,
} from "@gnd/settings";
import { TRPCError } from "@trpc/server";

export type SalesRequestPilotSurface = "order" | "quote";

export type SalesRequestPilotAccessReason =
	| "eligible"
	| "feature-disabled"
	| "pilot-disabled"
	| "pilot-invalid"
	| "actor-inactive"
	| "not-enrolled"
	| "permission"
	| "surface-not-supported";

export type SalesRequestPilotAccess = {
	surface: SalesRequestPilotSurface | null;
	featureEnabled: boolean;
	pilotEnabled: boolean;
	eligible: boolean;
	cohortMember: boolean;
	reviewer: boolean;
	settingsRevision: number;
	reason: SalesRequestPilotAccessReason;
};

type PilotDatabase = Pick<Database, "settings" | "users">;

export async function requireActiveSalesRequestPilotActors(input: {
	db: Pick<Database, "users">;
	cohortUserIds: readonly number[];
	reviewerUserIds: readonly number[];
}) {
	const requestedIds = [
		...new Set([...input.cohortUserIds, ...input.reviewerUserIds]),
	].sort((left, right) => left - right);
	if (requestedIds.length === 0) return;

	const activeActors = await input.db.users.findMany({
		where: {
			id: { in: requestedIds },
			deletedAt: null,
			accessRevokedAt: null,
		},
		select: { id: true },
	});
	const activeIds = new Set(activeActors.map((actor) => actor.id));
	const missingIds = requestedIds.filter((id) => !activeIds.has(id));
	if (missingIds.length > 0) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Pilot users must be active: ${missingIds.join(", ")}`,
		});
	}
}

function isPilotSurface(
	value: SalesRequestPilotSurface | null | undefined,
): value is SalesRequestPilotSurface {
	return value === "order" || value === "quote";
}

async function readActivePilotSettings(db: PilotDatabase) {
	const rows = await db.settings.findMany({
		where: { type: "sales-settings", deletedAt: null },
		select: { id: true },
	});
	const settingId = rows
		.map((row) => row.id)
		.filter((id): id is number => Number.isSafeInteger(id) && id > 0)
		.sort((left, right) => left - right)[0];
	if (!settingId) return null;
	return getSalesRequestPilotSettings(db, settingId);
}

export async function getSalesRequestPilotAccess(input: {
	db: PilotDatabase;
	userId?: number;
	surface?: SalesRequestPilotSurface | null;
}): Promise<SalesRequestPilotAccess> {
	const surface = isPilotSurface(input.surface) ? input.surface : null;
	const featureEnabled = process.env.SALES_REQUEST_AI_ENABLED === "true";
	const settings = await readActivePilotSettings(input.db);
	const pilotSettings =
		settings?.settings ?? DEFAULT_SALES_REQUEST_PILOT_SETTINGS;
	const pilotEnabled =
		settings?.source === "persisted" && pilotSettings.enabled;
	const actor = input.userId
		? await input.db.users.findFirst({
				where: {
					id: input.userId,
					deletedAt: null,
					accessRevokedAt: null,
				},
				select: { id: true },
			})
		: null;
	const actorActive = Boolean(actor);
	const cohortMember =
		actorActive &&
		Boolean(input.userId && pilotSettings.cohortUserIds.includes(input.userId));
	const reviewer =
		actorActive &&
		Boolean(
			input.userId && pilotSettings.reviewerUserIds.includes(input.userId),
		);

	let reason: SalesRequestPilotAccessReason;
	if (!surface) reason = "surface-not-supported";
	else if (!featureEnabled) reason = "feature-disabled";
	else if (settings?.source === "invalid") reason = "pilot-invalid";
	else if (!pilotEnabled) reason = "pilot-disabled";
	else if (!actorActive) reason = "actor-inactive";
	else if (!cohortMember && !reviewer) reason = "not-enrolled";
	else reason = "eligible";

	return {
		surface,
		featureEnabled,
		pilotEnabled,
		eligible: reason === "eligible",
		cohortMember,
		reviewer,
		settingsRevision: settings?.settings.revision ?? 0,
		reason,
	};
}

/**
 * Authorizes only the text-first pilot surface. This must run before the
 * preview snapshot, usage reservation, and provider construction so an
 * excluded actor cannot spend provider quota or receive a catalog snapshot.
 */
export async function requireSalesRequestPilotAccess(input: {
	db: PilotDatabase;
	userId?: number;
	surface?: SalesRequestPilotSurface | null;
}) {
	if (!input.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
	if (process.env.SALES_REQUEST_AI_ENABLED !== "true") {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Sales request generation is currently disabled.",
		});
	}

	const access = await getSalesRequestPilotAccess(input);
	if (access.reason === "surface-not-supported") {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"Sales request generation is available only while creating a new order or quote.",
		});
	}
	if (access.reason === "pilot-invalid" || access.reason === "pilot-disabled") {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"Sales request generation is not enabled for the internal pilot.",
		});
	}
	if (access.reason === "actor-inactive") {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	if (!access.eligible) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message:
				"Sales request generation is limited to the configured internal pilot cohort.",
		});
	}
	return access;
}
