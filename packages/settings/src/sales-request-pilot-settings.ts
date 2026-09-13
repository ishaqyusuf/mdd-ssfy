import { type Db, Prisma } from "@gnd/db";
import { z } from "zod";

const SALES_SETTINGS_TYPE = "sales-settings";
const SETTINGS_TRANSACTION_TIMEOUT_MS = 60_000;
const MAX_PILOT_USERS = 100;
const MAX_REVIEWERS = 25;

const userIdSchema = z.number().int().positive();

/**
 * The pilot is deliberately opt-in. An enabled record with no named cohort or
 * reviewer is rejected instead of silently becoming an all-staff rollout.
 */
export const salesRequestPilotSettingsInputSchema = z
	.object({
		enabled: z.boolean(),
		cohortUserIds: z.array(userIdSchema).max(MAX_PILOT_USERS).default([]),
		reviewerUserIds: z.array(userIdSchema).max(MAX_REVIEWERS).default([]),
	})
	.strict()
	.superRefine((value, ctx) => {
		if (value.enabled && value.cohortUserIds.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["cohortUserIds"],
				message: "Add at least one named pilot user before enabling the pilot.",
			});
		}
		if (value.enabled && value.reviewerUserIds.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["reviewerUserIds"],
				message: "Add at least one reviewer before enabling the pilot.",
			});
		}
	});

export type SalesRequestPilotSettingsInput = z.input<
	typeof salesRequestPilotSettingsInputSchema
>;

export const salesRequestPilotSettingsSchema =
	salesRequestPilotSettingsInputSchema.extend({
		revision: z.number().int().min(0),
		changedAt: z.string().datetime().nullable(),
	});

export type SalesRequestPilotSettings = z.infer<
	typeof salesRequestPilotSettingsSchema
>;

export type SalesRequestPilotSettingsSource =
	| "default"
	| "invalid"
	| "persisted";

export type SalesRequestPilotSettingsResult = {
	settingId: number;
	settings: SalesRequestPilotSettings;
	source: SalesRequestPilotSettingsSource;
};

export const DEFAULT_SALES_REQUEST_PILOT_SETTINGS: SalesRequestPilotSettings = {
	enabled: false,
	cohortUserIds: [],
	reviewerUserIds: [],
	revision: 0,
	changedAt: null,
};

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function strictRecord(value: unknown, label: string): RecordValue {
	if (value == null) return {};
	if (typeof value === "string") {
		try {
			return strictRecord(JSON.parse(value), label);
		} catch {
			throw new Error(`Invalid sales settings ${label}`);
		}
	}
	if (!isRecord(value)) throw new Error(`Invalid sales settings ${label}`);
	return value;
}

function requireSettingId(value: unknown): asserts value is number {
	if (!Number.isSafeInteger(value) || (value as number) <= 0) {
		throw new Error("A valid sales settings ID is required");
	}
}

function normalizeUserIds(values: readonly number[]) {
	return [...new Set(values)].sort((left, right) => left - right);
}

export function normalizeSalesRequestPilotSettingsInput(
	value: SalesRequestPilotSettingsInput,
) {
	return salesRequestPilotSettingsInputSchema.parse({
		enabled: value.enabled,
		cohortUserIds: normalizeUserIds(value.cohortUserIds ?? []),
		reviewerUserIds: normalizeUserIds(value.reviewerUserIds ?? []),
	});
}

function readPersistedPilotSettings(meta: unknown): {
	settings: SalesRequestPilotSettings;
	source: SalesRequestPilotSettingsSource;
} {
	const settings = strictRecord(meta, "metadata");
	const requestGeneration = strictRecord(
		settings.requestGeneration,
		"requestGeneration",
	);
	if (!Object.hasOwn(requestGeneration, "pilot")) {
		return {
			settings: { ...DEFAULT_SALES_REQUEST_PILOT_SETTINGS },
			source: "default",
		};
	}

	const parsed = salesRequestPilotSettingsSchema.safeParse(
		requestGeneration.pilot,
	);
	if (!parsed.success) {
		return {
			settings: { ...DEFAULT_SALES_REQUEST_PILOT_SETTINGS },
			source: "invalid",
		};
	}

	return { settings: parsed.data, source: "persisted" };
}

export async function getSalesRequestPilotSettings(
	db: Pick<Db, "settings">,
	settingId: number,
): Promise<SalesRequestPilotSettingsResult> {
	requireSettingId(settingId);
	const setting = await db.settings.findFirst({
		where: { id: settingId, type: SALES_SETTINGS_TYPE, deletedAt: null },
		select: { id: true, meta: true },
	});
	if (!setting) throw new Error(`Sales settings not found: ${settingId}`);
	if (setting.id !== settingId) {
		throw new Error(`Sales settings identity mismatch: ${settingId}`);
	}

	return { settingId, ...readPersistedPilotSettings(setting.meta) };
}

export type UpdateSalesRequestPilotSettingsInput =
	SalesRequestPilotSettingsInput & {
		settingId: number;
		changedAt?: Date;
	};

export type SalesRequestPilotSettingsUpdate =
	SalesRequestPilotSettingsResult & {
		changed: boolean;
	};

export async function updateSalesRequestPilotSettings(
	db: Db,
	rawInput: UpdateSalesRequestPilotSettingsInput,
): Promise<SalesRequestPilotSettingsUpdate> {
	const settingId = rawInput?.settingId;
	requireSettingId(settingId);
	const input = normalizeSalesRequestPilotSettingsInput(rawInput);
	const changedAt = rawInput.changedAt ?? new Date();

	return db.$transaction(
		async (tx) => {
			const lockedRows = await tx.$queryRaw<Array<{ id: number }>>(
				Prisma.sql`SELECT id FROM Settings
					WHERE id=${settingId}
					  AND type=${SALES_SETTINGS_TYPE}
					  AND deletedAt IS NULL
					FOR UPDATE`,
			);
			if (!lockedRows.some((row) => row.id === settingId)) {
				throw new Error(`Sales settings not found: ${settingId}`);
			}

			const setting = await tx.settings.findFirst({
				where: { id: settingId, type: SALES_SETTINGS_TYPE, deletedAt: null },
				select: { id: true, meta: true },
			});
			if (!setting) throw new Error(`Sales settings not found: ${settingId}`);
			if (setting.id !== settingId) {
				throw new Error(`Sales settings identity mismatch: ${settingId}`);
			}

			const meta = { ...strictRecord(setting.meta, "metadata") };
			const current = readPersistedPilotSettings(meta);
			const changed =
				current.source !== "persisted" ||
				current.settings.enabled !== input.enabled ||
				JSON.stringify(current.settings.cohortUserIds) !==
					JSON.stringify(input.cohortUserIds) ||
				JSON.stringify(current.settings.reviewerUserIds) !==
					JSON.stringify(input.reviewerUserIds);

			if (!changed) {
				return {
					changed: false,
					settingId,
					settings: current.settings,
					source: "persisted" as const,
				};
			}

			const requestGeneration = {
				...strictRecord(meta.requestGeneration, "requestGeneration"),
			};
			const next: SalesRequestPilotSettings = {
				...input,
				revision: current.settings.revision + 1,
				changedAt: changedAt.toISOString(),
			};
			requestGeneration.pilot = next;
			meta.requestGeneration = requestGeneration;
			await tx.settings.update({
				where: { id: settingId },
				data: { meta },
			});

			return {
				changed: true,
				settingId,
				settings: next,
				source: "persisted" as const,
			};
		},
		{
			isolationLevel: "Serializable",
			timeout: SETTINGS_TRANSACTION_TIMEOUT_MS,
		},
	);
}
