import { type Database, Prisma } from "@gnd/db";
import {
	ASSISTANT_PROVIDER_CATALOG,
	type AssistantProvider,
	type AssistantRuntimeSelection,
	getAssistantApiKey,
	resolveAssistantRuntimeSelection,
} from "./runtime";

const SETTING_KEY = "global";
const PROVIDER_LABELS: Record<AssistantProvider, string> = {
	openai: "OpenAI",
	anthropic: "Anthropic",
	deepseek: "DeepSeek",
	google: "Google Gemini",
};

export class AssistantRuntimeSettingConflictError extends Error {
	constructor() {
		super("Assistant AI settings changed. Refresh and try again.");
		this.name = "AssistantRuntimeSettingConflictError";
	}
}

function selectionFromRow(row: { provider: string; model: string }) {
	try {
		return resolveAssistantRuntimeSelection({
			ASSISTANT_AI_PROVIDER: row.provider,
			ASSISTANT_AI_MODEL: row.model,
		});
	} catch {
		return null;
	}
}

export function getAssistantProviderOptions(
	environment: Readonly<Record<string, string | undefined>> = process.env,
) {
	return Object.entries(ASSISTANT_PROVIDER_CATALOG).map(([id, models]) => ({
		id: id as AssistantProvider,
		label: PROVIDER_LABELS[id as AssistantProvider],
		defaultModel: models[0],
		models: models.map((model) => ({ id: model, label: model })),
		configured: Boolean(
			getAssistantApiKey(id as AssistantProvider, environment),
		),
	}));
}

export async function getAssistantRuntimeConfiguration(
	db: Database,
	environment: Readonly<Record<string, string | undefined>> = process.env,
) {
	const row = await db.assistantRuntimeSetting.findUnique({
		where: { key: SETTING_KEY },
	});
	const persisted = row ? selectionFromRow(row) : null;
	const selection = persisted ?? resolveAssistantRuntimeSelection(environment);
	return {
		selection,
		source: row
			? persisted
				? ("persisted" as const)
				: ("invalid" as const)
			: ("environment" as const),
		version: row?.version ?? 0,
		updatedAt: row?.updatedAt ?? null,
		updatedByUserId: row?.updatedByUserId ?? null,
	};
}

export async function getAssistantRuntimeSettingsSurface(db: Database) {
	const [configuration, events] = await Promise.all([
		getAssistantRuntimeConfiguration(db),
		db.assistantRuntimeSettingEvent.findMany({
			where: { settingKey: SETTING_KEY },
			orderBy: { createdAt: "desc" },
			take: 20,
		}),
	]);
	return {
		...configuration,
		providers: getAssistantProviderOptions(),
		events,
	};
}

export async function updateAssistantRuntimeSettings(
	db: Database,
	actorUserId: number,
	input: AssistantRuntimeSelection & { expectedVersion: number },
) {
	const selection = resolveAssistantRuntimeSelection({
		ASSISTANT_AI_PROVIDER: input.provider,
		ASSISTANT_AI_MODEL: input.model,
	});
	const provider = getAssistantProviderOptions().find(
		(option) => option.id === selection.provider,
	);
	if (!provider?.configured) {
		throw new Error(
			`Configure the ${provider?.label ?? selection.provider} Assistant API key before selecting it.`,
		);
	}
	return db.$transaction(
		async (tx) => {
			const current = await tx.assistantRuntimeSetting.findUnique({
				where: { key: SETTING_KEY },
			});
			if ((current?.version ?? 0) !== input.expectedVersion)
				throw new AssistantRuntimeSettingConflictError();
			const version = input.expectedVersion + 1;
			if (current) {
				const result = await tx.assistantRuntimeSetting.updateMany({
					where: { key: SETTING_KEY, version: input.expectedVersion },
					data: {
						provider: selection.provider,
						model: selection.model,
						version,
						updatedByUserId: actorUserId,
					},
				});
				if (result.count !== 1)
					throw new AssistantRuntimeSettingConflictError();
			} else {
				try {
					await tx.assistantRuntimeSetting.create({
						data: {
							key: SETTING_KEY,
							provider: selection.provider,
							model: selection.model,
							version,
							updatedByUserId: actorUserId,
						},
					});
				} catch (error) {
					if (
						error instanceof Prisma.PrismaClientKnownRequestError &&
						error.code === "P2002"
					)
						throw new AssistantRuntimeSettingConflictError();
					throw error;
				}
			}
			await tx.assistantRuntimeSettingEvent.create({
				data: {
					settingKey: SETTING_KEY,
					provider: selection.provider,
					model: selection.model,
					version,
					actorUserId,
				},
			});
			return { selection, version, source: "persisted" as const };
		},
		{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
	);
}
