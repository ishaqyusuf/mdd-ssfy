import type { Db, TransactionClient } from "@gnd/db";
import {
	type GuardedPackingPolicy,
	type GuardedPackingPolicyInput,
	normalizeGuardedPackingPolicy,
	reviseGuardedPackingPolicy,
} from "./schema";

const SALES_SETTINGS_TYPE = "sales-settings";
const MAX_SERIALIZABLE_ATTEMPTS = 3;
const GUARDED_PACKING_TRANSACTION_TIMEOUT_MS = 60_000;

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export async function getGuardedPackingSettings(db: Db) {
	const setting = await db.settings.findFirst({
		where: { type: SALES_SETTINGS_TYPE, deletedAt: null },
		select: { meta: true },
	});
	return normalizeGuardedPackingPolicy(asRecord(setting?.meta).guardedPacking);
}

export async function updateGuardedPackingSettings<
	TPersistedEffect = undefined,
>(
	db: Db,
	input: GuardedPackingPolicyInput,
	options: {
		now?: Date;
		afterPersist?: (
			tx: TransactionClient,
			change: {
				previousPolicy: GuardedPackingPolicy;
				nextPolicy: GuardedPackingPolicy;
			},
		) => Promise<TPersistedEffect>;
	} = {},
) {
	const changedAt = (options.now ?? new Date()).toISOString();
	for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
		try {
			return await db.$transaction(
				async (tx) => {
					const setting = await tx.settings.findFirst({
						where: { type: SALES_SETTINGS_TYPE, deletedAt: null },
						select: { id: true, meta: true },
					});
					const meta = asRecord(setting?.meta);
					const current = normalizeGuardedPackingPolicy(meta.guardedPacking);
					const result = reviseGuardedPackingPolicy({
						current: meta.guardedPacking,
						next: input,
						changedAt,
					});
					if (!result.changed) {
						return {
							...result,
							previousPolicy: current,
							persistedEffect: undefined,
						};
					}

					const nextMeta = { ...meta, guardedPacking: result.policy };
					if (setting) {
						await tx.settings.update({
							where: { id: setting.id },
							data: { meta: nextMeta },
						});
					} else {
						await tx.settings.create({
							data: { type: SALES_SETTINGS_TYPE, meta: nextMeta },
						});
					}
					const persistedEffect = options.afterPersist
						? await options.afterPersist(tx, {
								previousPolicy: current,
								nextPolicy: result.policy,
							})
						: undefined;
					return {
						...result,
						previousPolicy: current,
						persistedEffect,
					};
				},
				{
					isolationLevel: "Serializable",
					timeout: GUARDED_PACKING_TRANSACTION_TIMEOUT_MS,
				},
			);
		} catch (error) {
			const code =
				error && typeof error === "object" && "code" in error
					? String((error as { code?: unknown }).code || "")
					: "";
			if (
				!(code === "P2034" || code === "P2028") ||
				attempt === MAX_SERIALIZABLE_ATTEMPTS
			) {
				throw error;
			}
		}
	}
	throw new Error(
		"Guarded packing settings update exhausted its retry budget.",
	);
}
