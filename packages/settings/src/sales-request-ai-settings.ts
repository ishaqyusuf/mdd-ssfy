import { type Db, Prisma } from "@gnd/db";
import {
	DEFAULT_SALES_REQUEST_AI_SELECTION,
	type SalesRequestAISelection,
	salesRequestAISelectionSchema,
} from "./sales-request-ai-catalog";

const SALES_SETTINGS_TYPE = "sales-settings";
const SETTINGS_TRANSACTION_TIMEOUT_MS = 60_000;

export type SalesRequestAISettings = {
	settingId: number;
	selection: SalesRequestAISelection;
	source: "default" | "invalid" | "persisted";
};

export type UpdateSalesRequestAISettingsInput = SalesRequestAISelection & {
	settingId: number;
};

export type SalesRequestAISettingsUpdate = SalesRequestAISettings & {
	changed: boolean;
};

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function strictRecord(value: unknown, label: string): RecordValue {
	if (value == null) return {};
	if (typeof value === "string") {
		let parsed: unknown;
		try {
			parsed = JSON.parse(value);
		} catch {
			throw new Error(`Invalid sales settings ${label}`);
		}
		return strictRecord(parsed, label);
	}
	if (!isRecord(value)) throw new Error(`Invalid sales settings ${label}`);
	return value;
}

function requireSettingId(value: unknown): asserts value is number {
	if (!Number.isSafeInteger(value) || (value as number) <= 0) {
		throw new Error("A valid sales settings ID is required");
	}
}

function own(record: RecordValue, key: string) {
	return Object.prototype.hasOwnProperty.call(record, key);
}

function readPersistedSelection(meta: unknown): {
	selection: SalesRequestAISelection;
	source: "default" | "invalid" | "persisted";
} {
	const settings = strictRecord(meta, "metadata");
	const requestGeneration = strictRecord(
		settings.requestGeneration,
		"requestGeneration",
	);
	if (!own(requestGeneration, "ai")) {
		return {
			selection: { ...DEFAULT_SALES_REQUEST_AI_SELECTION },
			source: "default",
		};
	}

	const parsed = salesRequestAISelectionSchema.safeParse(requestGeneration.ai);
	if (!parsed.success) {
		return {
			selection: { ...DEFAULT_SALES_REQUEST_AI_SELECTION },
			source: "invalid",
		};
	}
	return { selection: parsed.data, source: "persisted" };
}

export async function getSalesRequestAISettings(
	db: Pick<Db, "settings">,
	settingId: number,
): Promise<SalesRequestAISettings> {
	requireSettingId(settingId);
	const setting = await db.settings.findFirst({
		where: { id: settingId, type: SALES_SETTINGS_TYPE, deletedAt: null },
		select: { id: true, meta: true },
	});
	if (!setting) throw new Error(`Sales settings not found: ${settingId}`);
	if (setting.id !== settingId) {
		throw new Error(`Sales settings identity mismatch: ${settingId}`);
	}

	return { settingId, ...readPersistedSelection(setting.meta) };
}

export async function updateSalesRequestAISettings(
	db: Db,
	rawInput: UpdateSalesRequestAISettingsInput,
): Promise<SalesRequestAISettingsUpdate> {
	const settingId = rawInput?.settingId;
	requireSettingId(settingId);
	const selection = salesRequestAISelectionSchema.parse({
		provider: rawInput?.provider,
		model: rawInput?.model,
	});

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

			const settings = { ...strictRecord(setting.meta, "metadata") };
			const requestGeneration = {
				...strictRecord(settings.requestGeneration, "requestGeneration"),
			};
			const current = salesRequestAISelectionSchema.safeParse(
				requestGeneration.ai,
			);
			const changed =
				!own(requestGeneration, "ai") ||
				!current.success ||
				current.data.provider !== selection.provider ||
				current.data.model !== selection.model;

			if (changed) {
				requestGeneration.ai = selection;
				settings.requestGeneration = requestGeneration;
				await tx.settings.update({
					where: { id: setting.id },
					data: { meta: settings },
				});
			}

			return {
				changed,
				settingId,
				selection,
				source: "persisted" as const,
			};
		},
		{
			isolationLevel: "Serializable",
			timeout: SETTINGS_TRANSACTION_TIMEOUT_MS,
		},
	);
}
