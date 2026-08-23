import type { Db } from "@gnd/db";
import {
	type SalesHandoffTriggerInput,
	normalizeSalesHandoffTriggerPolicy,
	reviseSalesHandoffTriggerPolicy,
} from "./schema";

const SALES_SETTINGS_TYPE = "sales-settings";
const MAX_SERIALIZABLE_ATTEMPTS = 3;

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export async function getSalesHandoffTriggerSettings(db: Db) {
	const setting = await db.settings.findFirst({
		where: { type: SALES_SETTINGS_TYPE, deletedAt: null },
		select: { meta: true },
	});
	const meta = asRecord(setting?.meta);
	return normalizeSalesHandoffTriggerPolicy(meta.salesHandoffTrigger);
}

export async function updateSalesHandoffTriggerSettings(
	db: Db,
	input: SalesHandoffTriggerInput,
	options: { now?: Date } = {},
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
					const result = reviseSalesHandoffTriggerPolicy({
						current: meta.salesHandoffTrigger,
						next: input,
						changedAt,
					});

					if (!result.changed) return result;

					const nextMeta = { ...meta, salesHandoffTrigger: result.policy };
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

					return result;
				},
				{ isolationLevel: "Serializable" },
			);
		} catch (error) {
			if (
				!isRetryableSettingsWriteConflict(error) ||
				attempt === MAX_SERIALIZABLE_ATTEMPTS
			) {
				throw error;
			}
		}
	}

	throw new Error("Sales handoff trigger update exhausted its retry budget.");
}

function isRetryableSettingsWriteConflict(error: unknown) {
	const code =
		error && typeof error === "object" && "code" in error
			? String((error as { code?: unknown }).code || "")
			: "";
	return code === "P2034" || code === "P2028";
}
