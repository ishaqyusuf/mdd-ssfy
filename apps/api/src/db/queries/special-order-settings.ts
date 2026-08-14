import type { Db } from "@gnd/db";
import {
	INITIAL_SPECIAL_ORDER_POLICY,
	canEnrollSpecialOrder,
} from "@gnd/sales/special-order";
import {
	type SpecialOrderSettings,
	normalizeSpecialOrderSettings,
} from "@gnd/settings";

type SpecialOrderPolicyInput = {
	title: string;
	acknowledgmentText: string;
	policyText: string;
};

async function loadSalesSettings(db: Db) {
	const existing = await db.settings.findFirst({
		where: { type: "sales-settings" },
	});
	if (existing) return existing;
	return db.settings.create({
		data: { type: "sales-settings", meta: {} },
	});
}

function readMeta(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

async function persistSpecialOrderSettings(
	db: Db,
	settingsId: number,
	meta: Record<string, unknown>,
	specialOrder: SpecialOrderSettings,
) {
	await db.settings.update({
		where: { id: settingsId },
		data: { meta: { ...meta, specialOrder } },
	});
}

export async function ensureInitialSpecialOrderPolicy(
	db: Db,
	actorUserId: number | null,
) {
	const salesSettings = await loadSalesSettings(db);
	const meta = readMeta(salesSettings.meta);
	let settings = normalizeSpecialOrderSettings(meta.specialOrder);
	let published = settings.activePolicyVersionId
		? await db.specialOrderPolicyVersion.findFirst({
				where: {
					id: settings.activePolicyVersionId,
					status: "PUBLISHED",
				},
			})
		: null;

	if (!published) {
		published = await db.specialOrderPolicyVersion.findFirst({
			where: { status: "PUBLISHED" },
			orderBy: { version: "desc" },
		});
	}

	if (!published) {
		published = await db.specialOrderPolicyVersion.create({
			data: {
				version: 1,
				status: "PUBLISHED",
				...INITIAL_SPECIAL_ORDER_POLICY,
				createdByUserId: actorUserId,
				publishedByUserId: actorUserId,
				publishedAt: new Date(),
			},
		});
	}

	if (settings.activePolicyVersionId !== published.id) {
		settings = { ...settings, activePolicyVersionId: published.id };
		await persistSpecialOrderSettings(db, salesSettings.id, meta, settings);
	}

	return { salesSettings, meta, settings, published };
}

export async function getSpecialOrderSettingsManagement(
	db: Db,
	actorUserId: number | null,
) {
	const base = await ensureInitialSpecialOrderPolicy(db, actorUserId);
	let draft = await db.specialOrderPolicyVersion.findFirst({
		where: { status: "DRAFT" },
		orderBy: { createdAt: "desc" },
	});
	if (!draft) {
		draft = await db.specialOrderPolicyVersion.create({
			data: {
				version: null,
				status: "DRAFT",
				title: base.published.title,
				acknowledgmentText: base.published.acknowledgmentText,
				policyText: base.published.policyText,
				createdByUserId: actorUserId,
			},
		});
	}
	const history = await db.specialOrderPolicyVersion.findMany({
		where: { status: "PUBLISHED" },
		orderBy: { version: "desc" },
		take: 25,
	});
	return {
		settings: base.settings,
		currentPolicy: base.published,
		draft,
		history,
	};
}

export async function updateSpecialOrderOperationalSettings(
	db: Db,
	actorUserId: number,
	input: Pick<
		SpecialOrderSettings,
		"releaseAudience" | "enforcementMode" | "approvalLinkLifetimeDays"
	>,
) {
	const base = await ensureInitialSpecialOrderPolicy(db, actorUserId);
	const settings = normalizeSpecialOrderSettings({
		...base.settings,
		...input,
	});
	await persistSpecialOrderSettings(
		db,
		base.salesSettings.id,
		base.meta,
		settings,
	);
	return settings;
}

export async function getSpecialOrderEnrollmentAccess(
	db: Db,
	actorUserId: number | null,
) {
	const [salesSettings, actor] = await Promise.all([
		db.settings.findFirst({
			where: { type: "sales-settings" },
			select: { meta: true },
		}),
		actorUserId
			? db.users.findFirst({
					where: {
						id: actorUserId,
						deletedAt: null,
						accessRevokedAt: null,
					},
					select: {
						roles: {
							where: {
								deletedAt: null,
								role: { deletedAt: null },
							},
							select: {
								role: { select: { name: true, deletedAt: true } },
							},
						},
					},
				})
			: Promise.resolve(null),
	]);
	const settings = normalizeSpecialOrderSettings(
		readMeta(salesSettings?.meta).specialOrder,
	);
	const roleNames =
		actor?.roles
			.filter((assignment) => !assignment.role?.deletedAt)
			.map((assignment) => assignment.role?.name) ?? [];
	return {
		releaseAudience: settings.releaseAudience,
		canEnroll: canEnrollSpecialOrder({
			releaseAudience: settings.releaseAudience,
			actorIsActive: Boolean(actor),
			roleNames,
		}),
	};
}

export async function saveSpecialOrderPolicyDraft(
	db: Db,
	actorUserId: number,
	input: SpecialOrderPolicyInput,
) {
	const draft = await db.specialOrderPolicyVersion.findFirst({
		where: { status: "DRAFT" },
		orderBy: { createdAt: "desc" },
	});
	if (draft) {
		return db.specialOrderPolicyVersion.update({
			where: { id: draft.id },
			data: { ...input, createdByUserId: actorUserId },
		});
	}
	return db.specialOrderPolicyVersion.create({
		data: {
			version: null,
			status: "DRAFT",
			...input,
			createdByUserId: actorUserId,
		},
	});
}

export async function publishSpecialOrderPolicy(
	db: Db,
	actorUserId: number,
	input: SpecialOrderPolicyInput,
) {
	return db.$transaction(async (tx) => {
		const salesSettings = await loadSalesSettings(tx as unknown as Db);
		const meta = readMeta(salesSettings.meta);
		const currentSettings = normalizeSpecialOrderSettings(meta.specialOrder);
		const latest = await tx.specialOrderPolicyVersion.findFirst({
			where: { status: "PUBLISHED" },
			orderBy: { version: "desc" },
			select: { version: true },
		});
		const published = await tx.specialOrderPolicyVersion.create({
			data: {
				version: (latest?.version ?? 0) + 1,
				status: "PUBLISHED",
				...input,
				createdByUserId: actorUserId,
				publishedByUserId: actorUserId,
				publishedAt: new Date(),
			},
		});
		await tx.specialOrderPolicyVersion.updateMany({
			where: { status: "DRAFT" },
			data: { status: "RETIRED", retiredAt: new Date() },
		});
		const settings = {
			...currentSettings,
			activePolicyVersionId: published.id,
		};
		await tx.settings.update({
			where: { id: salesSettings.id },
			data: { meta: { ...meta, specialOrder: settings } },
		});
		return { published, settings };
	});
}

export async function getSpecialOrderRolloutMetrics(db: Db, days = 30) {
	const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
	const [
		statusRows,
		oldestPending,
		outcomes,
		requestFailures,
		notificationFailures,
		reapprovalCount,
		operationRows,
		staleLinkCount,
		expiredLinkCount,
	] = await Promise.all([
		db.salesOrders.groupBy({
			by: ["specialOrderStatus"],
			where: {
				type: "order",
				deletedAt: null,
				specialOrderDeclaration: "YES",
			},
			_count: { _all: true },
		}),
		db.salesOrders.findFirst({
			where: {
				type: "order",
				deletedAt: null,
				specialOrderDeclaration: "YES",
				specialOrderStatus: {
					in: ["SIGNATURE_PENDING", "REAPPROVAL_REQUIRED"],
				},
			},
			orderBy: { updatedAt: "asc" },
			select: { updatedAt: true, createdAt: true },
		}),
		db.specialOrderApprovalEvidence.groupBy({
			by: ["outcome"],
			where: { acknowledgedAt: { gte: from } },
			_count: { _all: true },
		}),
		db.specialOrderApprovalRequest.count({
			where: { updatedAt: { gte: from }, deliveryStatus: "FAILED" },
		}),
		db.specialOrderNotificationDelivery.count({
			where: {
				updatedAt: { gte: from },
				OR: [
					{ customerStatus: "FAILED" },
					{ staffStatus: "FAILED" },
					{ inAppStatus: "FAILED" },
				],
			},
		}),
		db.salesHistory.count({
			where: {
				createdAt: { gte: from },
				name: "Special Order reapproval requested",
				deletedAt: null,
			},
		}),
		db.specialOrderOperationEvent.groupBy({
			by: ["operation", "result"],
			where: {
				occurredAt: { gte: from },
				operation: { in: ["PURCHASING", "PRODUCTION", "PACKING", "DISPATCH"] },
			},
			_count: { _all: true },
		}),
		db.specialOrderOperationEvent.count({
			where: {
				occurredAt: { gte: from },
				operation: "PUBLIC_LINK",
				result: "STALE",
			},
		}),
		db.specialOrderOperationEvent.count({
			where: {
				occurredAt: { gte: from },
				operation: "PUBLIC_LINK",
				result: "EXPIRED",
			},
		}),
	]);
	const statuses = Object.fromEntries(
		statusRows.map((row) => [
			row.specialOrderStatus || "UNKNOWN",
			row._count._all,
		]),
	);
	const outcomeCounts = Object.fromEntries(
		outcomes.map((row) => [row.outcome, row._count._all]),
	);
	const operationCounts = operationRows.map((row) => ({
		operation: row.operation,
		result: row.result,
		count: row._count._all,
	}));
	const pendingSince =
		oldestPending?.updatedAt || oldestPending?.createdAt || null;
	return {
		days,
		from,
		statuses,
		outcomes: outcomeCounts,
		oldestPendingDays: pendingSince
			? Math.max(
					0,
					Math.floor((Date.now() - pendingSince.getTime()) / 86_400_000),
				)
			: null,
		requestFailures,
		notificationFailures,
		reapprovalCount,
		staleLinkCount,
		expiredLinkCount,
		operationCounts,
	};
}
