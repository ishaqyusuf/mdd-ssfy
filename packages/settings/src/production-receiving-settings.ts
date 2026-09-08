import type { Db, TransactionClient } from "@gnd/db";
import { z } from "zod";

const record = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

export function normalizeProductionReceivingPolicy(value: unknown) {
	const policy = record(value);
	return {
		workerCanReceiveInbound: policy.workerCanReceiveInbound === true,
		revision:
			typeof policy.revision === "number" &&
			Number.isSafeInteger(policy.revision) &&
			policy.revision >= 0
				? policy.revision
				: 0,
		changedAt: typeof policy.changedAt === "string" ? policy.changedAt : null,
	};
}
export const productionReceivingPolicyInputSchema = z.object({
	workerCanReceiveInbound: z.boolean(),
	expectedRevision: z.number().int().nonnegative(),
});
export async function getProductionReceivingSettings(
	db: Pick<TransactionClient, "settings">,
) {
	const setting = await db.settings.findFirst({
		where: { type: "sales-settings", deletedAt: null },
		select: { meta: true },
	});
	return normalizeProductionReceivingPolicy(record(setting?.meta).production);
}
export async function updateProductionReceivingSettings(
	db: Db,
	input: z.infer<typeof productionReceivingPolicyInputSchema>,
	actorId: number,
) {
	return db.$transaction(
		async (tx) => {
			const setting = await tx.settings.findFirst({
				where: { type: "sales-settings", deletedAt: null },
				select: { id: true, meta: true },
			});
			const meta = record(setting?.meta);
			const previous = normalizeProductionReceivingPolicy(meta.production);
			if (previous.revision !== input.expectedRevision)
				throw new Error(
					"Production receiving settings changed. Refresh and try again.",
				);
			if (previous.workerCanReceiveInbound === input.workerCanReceiveInbound)
				return { settings: previous, changed: false };
			const settings = {
				workerCanReceiveInbound: input.workerCanReceiveInbound,
				revision: previous.revision + 1,
				changedAt: new Date().toISOString(),
			};
			const nextMeta = {
				...meta,
				production: { ...record(meta.production), ...settings },
			};
			if (setting)
				await tx.settings.update({
					where: { id: setting.id },
					data: { meta: nextMeta },
				});
			else
				await tx.settings.create({
					data: { type: "sales-settings", meta: nextMeta },
				});
			await tx.event.create({
				data: {
					type: "production_receiving_policy_changed",
					userId: actorId,
					data: { version: 1, previous, settings },
				},
			});
			return { settings, changed: true };
		},
		{ isolationLevel: "Serializable" },
	);
}
