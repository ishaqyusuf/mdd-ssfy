import { createHash, randomUUID } from "node:crypto";
import type { Database, Prisma } from "@gnd/db";
import { z } from "zod";

import { assistantAnalyticsResultSchema } from "./analytics-result-contract";
import { buildAssistantProposalReview } from "./approvals";
import { assistantSalesRequestDraftPreviewSchema } from "./order-draft-contract";

import {
	ASSISTANT_TOOL_CATALOG_VERSION,
	type AssistantToolActor,
	assistantToolRegistry,
	executeRegisteredAssistantTool,
	preflightRegisteredAssistantProposal,
} from "./registry";

const scopeSchema = z.object({
	ownerUserId: z.number().int().positive(),
	scopeType: z.string().trim().min(1).max(50),
	scopeId: z.string().trim().min(1).max(191),
});

const assistantPreferenceFields = {
	responseStyle: z.enum(["concise", "balanced", "explanatory"]),
	responseDetail: z.enum(["brief", "standard", "detailed"]),
	chartPresentation: z.enum(["auto", "table", "bar", "line", "area"]),
};

export const assistantPreferenceSchema = z
	.object({
		...assistantPreferenceFields,
		version: z.number().int().positive(),
	})
	.strict();

export const assistantPreferenceUpdateSchema = z
	.object({
		...assistantPreferenceFields,
		expectedVersion: z.number().int().positive(),
	})
	.strict();

export const assistantParameterDefinitionSchema = z
	.object({
		key: z.string().regex(/^[a-z][a-zA-Z0-9_]{0,49}$/),
		label: z.string().trim().min(1).max(80),
		type: z.enum(["string", "number", "date", "relative_date"]),
		required: z.boolean().default(true),
	})
	.strict();

export const assistantOutputBindingSchema = z
	.object({
		name: z.string().regex(/^[a-z][a-zA-Z0-9_]{0,49}$/),
		path: z.string().regex(/^[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+){0,4}$/),
	})
	.strict();

const parameterMarkerSchema = z.object({ $parameter: z.string() }).strict();

function validateJsonTemplateBudget(value: unknown) {
	const stack = [{ value, depth: 0 }];
	let nodes = 0;
	let bytes = 0;
	const addBytes = (text: string) => {
		bytes += new TextEncoder().encode(text).byteLength;
		if (bytes > 32_000)
			throw new Error("Assistant recipe template is too large");
	};
	while (stack.length) {
		const current = stack.pop();
		if (!current) break;
		nodes += 1;
		if (nodes > 500 || current.depth > 12)
			throw new Error("Assistant recipe template is too complex");
		const item = current.value;
		if (item === null || typeof item === "boolean") continue;
		if (typeof item === "number") {
			if (!Number.isFinite(item))
				throw new Error("Assistant recipe template number is invalid");
			continue;
		}
		if (typeof item === "string") {
			addBytes(item);
			if (item.length > 2_000)
				throw new Error("Assistant recipe template text is too long");
			continue;
		}
		if (!item || typeof item !== "object")
			throw new Error("Assistant recipe template value is invalid");
		if (Array.isArray(item)) {
			if (item.length > 100)
				throw new Error("Assistant recipe template array is too large");
			for (const child of item)
				stack.push({ value: child, depth: current.depth + 1 });
			continue;
		}
		const entries = Object.entries(item);
		if (
			entries.length === 1 &&
			entries[0]?.[0] === "$parameter" &&
			typeof entries[0][1] === "string"
		) {
			parameterMarkerSchema.parse(item);
			addBytes(entries[0][1]);
			continue;
		}
		for (const [key, child] of entries) {
			if (key.length > 100)
				throw new Error("Assistant recipe template key is too long");
			addBytes(key);
			stack.push({ value: child, depth: current.depth + 1 });
		}
	}
	return value;
}

const jsonTemplateSchema: z.ZodType<unknown> = z
	.unknown()
	.superRefine((value, context) => {
		try {
			validateJsonTemplateBudget(value);
		} catch (error) {
			context.addIssue({
				code: "custom",
				message:
					error instanceof Error
						? error.message
						: "Assistant recipe template is invalid",
			});
		}
	});

export const assistantSavedActionCreateSchema = z.discriminatedUnion("kind", [
	z
		.object({
			kind: z.literal("prompt_shortcut"),
			name: z.string().trim().min(1).max(120),
			promptTemplate: z.string().trim().min(1).max(8_000),
		})
		.strict(),
	z
		.object({
			kind: z.literal("recipe"),
			name: z.string().trim().min(1).max(120),
			toolId: z.string().trim().min(1).max(191),
			toolVersion: z.number().int().positive(),
			inputTemplate: jsonTemplateSchema,
			parameterDefinitions: z.array(assistantParameterDefinitionSchema).max(20),
			outputBindings: z.array(assistantOutputBindingSchema).max(20),
		})
		.strict(),
]);

export const assistantSavedActionUpdateSchema = z
	.object({
		id: z.string().min(1).max(191),
		expectedVersion: z.number().int().positive(),
		name: z.string().trim().min(1).max(120).optional(),
		promptTemplate: z.string().trim().min(1).max(8_000).optional(),
		inputTemplate: jsonTemplateSchema.optional(),
		parameterDefinitions: z
			.array(assistantParameterDefinitionSchema)
			.max(20)
			.optional(),
		outputBindings: z.array(assistantOutputBindingSchema).max(20).optional(),
	})
	.strict();

export const assistantSavedActionFromRunSchema = z.discriminatedUnion("kind", [
	z
		.object({
			runId: z.string().min(1).max(191),
			name: z.string().trim().min(1).max(120),
			kind: z.literal("prompt_shortcut"),
		})
		.strict(),
	z
		.object({
			runId: z.string().min(1).max(191),
			name: z.string().trim().min(1).max(120),
			kind: z.literal("recipe"),
			inputTemplate: jsonTemplateSchema,
			parameterDefinitions: z.array(assistantParameterDefinitionSchema).max(20),
			outputBindings: z.array(assistantOutputBindingSchema).max(20),
		})
		.strict(),
]);

export const assistantRecipeParametersSchema = z
	.record(
		z.string().max(50),
		z.union([z.string().max(2_000), z.number().finite()]),
	)
	.refine((value) => Object.keys(value).length <= 20);

type AssistantScope = z.infer<typeof scopeSchema>;

function hash(value: unknown) {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function actionScope(actor: AssistantToolActor): AssistantScope {
	return scopeSchema.parse({
		ownerUserId: actor.userId,
		scopeType: actor.scopeType,
		scopeId: actor.scopeId,
	});
}

function compatibilityRevision(toolId: string, toolVersion: number) {
	return `${ASSISTANT_TOOL_CATALOG_VERSION}:${toolId}@${toolVersion}`;
}

function getDefinition(toolId: string, toolVersion: number) {
	return assistantToolRegistry.find(
		(definition) =>
			definition.toolId === toolId && definition.version === toolVersion,
	);
}

function isSafeEffect(effect: string) {
	return effect === "read" || effect === "draft";
}

function collectParameterMarkers(value: unknown, markers = new Set<string>()) {
	const marker = parameterMarkerSchema.safeParse(value);
	if (marker.success) {
		markers.add(marker.data.$parameter);
		return markers;
	}
	if (Array.isArray(value)) {
		for (const item of value) collectParameterMarkers(item, markers);
	} else if (value && typeof value === "object") {
		for (const item of Object.values(value))
			collectParameterMarkers(item, markers);
	}
	return markers;
}

function validateRecipeContract(input: {
	definition: NonNullable<ReturnType<typeof getDefinition>>;
	inputTemplate: unknown;
	parameterDefinitions: unknown;
	outputBindings: unknown;
}) {
	const template = jsonTemplateSchema.parse(input.inputTemplate);
	const definitions = assistantParameterDefinitionSchema
		.array()
		.max(20)
		.parse(input.parameterDefinitions);
	const keys = definitions.map(({ key }) => key);
	if (new Set(keys).size !== keys.length)
		throw new Error("Assistant recipe parameter keys must be unique");
	const markers = collectParameterMarkers(template);
	if (markers.size !== keys.length || keys.some((key) => !markers.has(key))) {
		throw new Error(
			"Assistant recipe parameters must exactly match template markers",
		);
	}
	const sampleParameters = Object.fromEntries(
		definitions.map((definition) => [
			definition.key,
			definition.type === "number"
				? 1
				: definition.type === "date"
					? "2020-01-01"
					: definition.type === "relative_date"
						? "today"
						: "sample",
		]),
	);
	input.definition.inputSchema.parse(
		resolveParameters(
			template,
			definitions,
			sampleParameters,
			"UTC",
			new Date("2020-01-01T12:00:00.000Z"),
		),
	);
	const bindings = assistantOutputBindingSchema
		.array()
		.max(20)
		.parse(input.outputBindings);
	const outputRoots = new Set([
		"status",
		"data",
		"sources",
		"warnings",
		"entities",
		"revision",
		"artifact",
		"job",
		"allowedNextActions",
	]);
	if (bindings.some(({ path }) => !outputRoots.has(path.split(".")[0] ?? "")))
		throw new Error("Assistant recipe output binding is invalid");
	return { template, definitions, bindings };
}

function savedActionCompatibility(action: {
	toolId: string | null;
	toolVersion: number | null;
	effect: string | null;
	compatibilityRevision: string;
}) {
	if (!action.toolId || !action.toolVersion)
		return { status: "current" as const };
	const definition = getDefinition(action.toolId, action.toolVersion);
	if (
		definition?.capability === "implemented" &&
		definition.handler &&
		(isSafeEffect(definition.effect) || definition.proposalPreflight) &&
		action.effect === definition.effect &&
		action.compatibilityRevision ===
			compatibilityRevision(action.toolId, action.toolVersion)
	) {
		return { status: "current" as const };
	}
	const replacement = assistantToolRegistry
		.filter((candidate) => candidate.toolId === action.toolId)
		.sort((left, right) => right.version - left.version)[0];
	return {
		status: definition ? ("unavailable" as const) : ("retired" as const),
		repair: replacement
			? {
					toolId: replacement.toolId,
					toolVersion: replacement.version,
					title: replacement.title,
				}
			: null,
	};
}

export async function listAssistantSavedActions(
	db: Database,
	actor: AssistantToolActor,
) {
	const rows = await db.assistantSavedAction.findMany({
		where: { ...actionScope(actor), deletedAt: null, activeKey: "active" },
		orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
		take: 100,
	});
	return rows.map((row) => ({
		...row,
		compatibility: savedActionCompatibility(row),
	}));
}

export async function createAssistantSavedAction(
	db: Database,
	actor: AssistantToolActor,
	rawInput: unknown,
) {
	const input = assistantSavedActionCreateSchema.parse(rawInput);
	const scope = actionScope(actor);
	return db.$transaction(
		async (tx) => {
			const count = await tx.assistantSavedAction.count({
				where: { ...scope, deletedAt: null, activeKey: "active" },
			});
			if (count >= 100) throw new Error("Assistant favorites limit reached");
			const max = await tx.assistantSavedAction.aggregate({
				where: { ...scope, deletedAt: null, activeKey: "active" },
				_max: { displayOrder: true },
			});
			if (input.kind === "prompt_shortcut") {
				return tx.assistantSavedAction.create({
					data: {
						...scope,
						name: input.name,
						kind: input.kind,
						promptTemplate: input.promptTemplate,
						compatibilityRevision: "prompt-shortcut-v1",
						displayOrder: (max._max.displayOrder ?? -1) + 1,
					},
				});
			}
			const definition = getDefinition(input.toolId, input.toolVersion);
			if (!definition) throw new Error("Assistant recipe tool is retired");
			const validated = validateRecipeContract({
				definition,
				inputTemplate: input.inputTemplate,
				parameterDefinitions: input.parameterDefinitions,
				outputBindings: input.outputBindings,
			});
			return tx.assistantSavedAction.create({
				data: {
					...scope,
					name: input.name,
					kind: input.kind,
					toolId: definition.toolId,
					toolVersion: definition.version,
					effect: definition.effect,
					inputTemplate: validated.template as Prisma.InputJsonValue,
					parameterDefinitions: validated.definitions as Prisma.InputJsonValue,
					outputBindings: validated.bindings as Prisma.InputJsonValue,
					compatibilityRevision: compatibilityRevision(
						definition.toolId,
						definition.version,
					),
					displayOrder: (max._max.displayOrder ?? -1) + 1,
				},
			});
		},
		{ isolationLevel: "Serializable" },
	);
}

export async function updateAssistantSavedAction(
	db: Database,
	actor: AssistantToolActor,
	rawInput: unknown,
) {
	const input = assistantSavedActionUpdateSchema.parse(rawInput);
	const { id, expectedVersion, ...updates } = input;
	const row = await db.assistantSavedAction.findFirst({
		where: { id, ...actionScope(actor), deletedAt: null, activeKey: "active" },
	});
	if (!row) throw new Error("Assistant saved action was not found");
	if (
		row.kind === "prompt_shortcut" &&
		(updates.inputTemplate ||
			updates.parameterDefinitions ||
			updates.outputBindings)
	) {
		throw new Error("Prompt shortcuts do not accept recipe fields");
	}
	if (row.kind === "recipe" && updates.promptTemplate) {
		throw new Error("Recipes do not accept prompt templates");
	}
	if (row.kind === "recipe") {
		const definition =
			row.toolId && row.toolVersion
				? getDefinition(row.toolId, row.toolVersion)
				: null;
		if (!definition) throw new Error("Assistant recipe tool is retired");
		validateRecipeContract({
			definition,
			inputTemplate: updates.inputTemplate ?? row.inputTemplate,
			parameterDefinitions:
				updates.parameterDefinitions ?? row.parameterDefinitions,
			outputBindings: updates.outputBindings ?? row.outputBindings,
		});
	}
	const result = await db.assistantSavedAction.updateMany({
		where: {
			id,
			...actionScope(actor),
			version: expectedVersion,
			deletedAt: null,
			activeKey: "active",
		},
		data: {
			name: updates.name,
			promptTemplate: updates.promptTemplate,
			inputTemplate:
				updates.inputTemplate === undefined
					? undefined
					: (updates.inputTemplate as Prisma.InputJsonValue),
			parameterDefinitions:
				updates.parameterDefinitions === undefined
					? undefined
					: (updates.parameterDefinitions as Prisma.InputJsonValue),
			outputBindings:
				updates.outputBindings === undefined
					? undefined
					: (updates.outputBindings as Prisma.InputJsonValue),
			version: { increment: 1 },
		},
	});
	if (result.count !== 1)
		throw new Error("Assistant saved action changed; reload and retry");
	return db.assistantSavedAction.findUniqueOrThrow({ where: { id } });
}

export async function removeAssistantSavedAction(
	db: Database,
	actor: AssistantToolActor,
	input: { id: string; expectedVersion: number },
) {
	const result = await db.assistantSavedAction.updateMany({
		where: {
			id: input.id,
			...actionScope(actor),
			version: input.expectedVersion,
			deletedAt: null,
			activeKey: "active",
		},
		data: {
			deletedAt: new Date(),
			activeKey: input.id,
			version: { increment: 1 },
		},
	});
	if (result.count !== 1)
		throw new Error("Assistant saved action changed; reload and retry");
	return { id: input.id, removed: true as const };
}

export async function duplicateAssistantSavedAction(
	db: Database,
	actor: AssistantToolActor,
	input: { id: string; name: string },
) {
	const row = await db.assistantSavedAction.findFirst({
		where: {
			id: input.id,
			...actionScope(actor),
			deletedAt: null,
			activeKey: "active",
		},
	});
	if (!row) throw new Error("Assistant saved action was not found");
	return createAssistantSavedAction(
		db,
		actor,
		row.kind === "prompt_shortcut"
			? {
					kind: "prompt_shortcut",
					name: input.name,
					promptTemplate: row.promptTemplate,
				}
			: {
					kind: "recipe",
					name: input.name,
					toolId: row.toolId,
					toolVersion: row.toolVersion,
					inputTemplate: row.inputTemplate,
					parameterDefinitions: row.parameterDefinitions,
					outputBindings: row.outputBindings,
				},
	);
}

export async function reorderAssistantSavedActions(
	db: Database,
	actor: AssistantToolActor,
	items: Array<{ id: string; expectedVersion: number }>,
) {
	const ids = items.map(({ id }) => id);
	if (ids.length > 100 || new Set(ids).size !== ids.length)
		throw new Error("Assistant saved action order is invalid");
	const scope = actionScope(actor);
	return db.$transaction(
		async (tx) => {
			const rows = await tx.assistantSavedAction.findMany({
				where: { ...scope, deletedAt: null, activeKey: "active" },
				select: { id: true },
			});
			if (
				rows.length !== ids.length ||
				rows.some((row) => !ids.includes(row.id))
			) {
				throw new Error("Assistant saved action order is incomplete");
			}
			for (const [displayOrder, item] of items.entries()) {
				const updated = await tx.assistantSavedAction.updateMany({
					where: {
						id: item.id,
						...scope,
						version: item.expectedVersion,
						deletedAt: null,
						activeKey: "active",
					},
					data: { displayOrder, version: { increment: 1 } },
				});
				if (updated.count !== 1)
					throw new Error(
						"Assistant saved action order changed; reload and retry",
					);
			}
			return { reordered: ids.length };
		},
		{ isolationLevel: "Serializable" },
	);
}

function dateInTimezone(now: Date, timezone: string) {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(now);
}

function resolveRelativeDate(value: string, timezone: string, now: Date) {
	const today = dateInTimezone(now, timezone);
	if (value === "today") return today;
	if (value === "start_of_month") return `${today.slice(0, 8)}01`;
	const match = /^days_ago:(\d{1,3})$/.exec(value);
	if (!match) throw new Error("Assistant relative date is invalid");
	const days = Number(match[1]);
	if (days > 366) throw new Error("Assistant relative date exceeds 366 days");
	const date = new Date(`${today}T12:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() - days);
	return date.toISOString().slice(0, 10);
}

function resolveParameters(
	value: unknown,
	definitions: z.infer<typeof assistantParameterDefinitionSchema>[],
	parameters: Record<string, string | number>,
	timezone: string,
	now: Date,
): unknown {
	const marker = parameterMarkerSchema.safeParse(value);
	if (marker.success) {
		const definition = definitions.find(
			({ key }) => key === marker.data.$parameter,
		);
		if (!definition)
			throw new Error("Assistant recipe references an undefined parameter");
		const supplied = parameters[definition.key];
		if (supplied === undefined) {
			if (!definition.required) return undefined;
			throw new Error(
				`Assistant recipe parameter ${definition.key} is required`,
			);
		}
		if (definition.type === "number") {
			if (typeof supplied !== "number")
				throw new Error(
					`Assistant recipe parameter ${definition.key} must be a number`,
				);
			return supplied;
		}
		if (typeof supplied !== "string")
			throw new Error(
				`Assistant recipe parameter ${definition.key} must be text`,
			);
		if (definition.type === "relative_date")
			return resolveRelativeDate(supplied, timezone, now);
		if (definition.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(supplied))
			throw new Error(
				`Assistant recipe parameter ${definition.key} must be a date`,
			);
		return supplied;
	}
	if (Array.isArray(value))
		return value.map((item) =>
			resolveParameters(item, definitions, parameters, timezone, now),
		);
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>).flatMap(
				([key, item]) => {
					const resolved = resolveParameters(
						item,
						definitions,
						parameters,
						timezone,
						now,
					);
					return resolved === undefined ? [] : [[key, resolved]];
				},
			),
		);
	}
	return value;
}

export function resolveAssistantRecipeInput(input: {
	template: unknown;
	definitions: unknown;
	parameters: unknown;
	timezone: string;
	now?: Date;
}) {
	return resolveParameters(
		jsonTemplateSchema.parse(input.template),
		assistantParameterDefinitionSchema.array().max(20).parse(input.definitions),
		assistantRecipeParametersSchema.parse(input.parameters),
		input.timezone,
		input.now ?? new Date(),
	);
}

function readBinding(value: unknown, path: string) {
	let current = value;
	for (const key of path.split(".")) {
		if (!current || typeof current !== "object" || !(key in current))
			return null;
		current = (current as Record<string, unknown>)[key];
	}
	return ["string", "number", "boolean"].includes(typeof current) ||
		current === null
		? current
		: null;
}

export function buildAssistantSavedActionResultParts(
	definition: NonNullable<ReturnType<typeof getDefinition>>,
	result: unknown,
	toolCallId: string,
) {
	const envelope = result as {
		status: string;
		data?: unknown;
		sources?: Array<{ kind: string; id: string; label: string; href?: string }>;
		entities?: unknown[];
	};
	const { completed } = classifyAssistantSavedActionResultStatus(
		envelope.status,
	);
	const serialized = JSON.stringify(envelope.data ?? {}, null, 2);
	const body =
		serialized.length <= 12_000
			? serialized
			: JSON.stringify({
					truncated: true,
					message: "Result is too large to display.",
				});
	const codeBlock = body
		.split("\n")
		.map((line) => `    ${line}`)
		.join("\n");
	const parts: Prisma.InputJsonValue[] = [
		{
			type: "data-assistant-tool",
			id: `tool-${toolCallId}`,
			data: {
				id: toolCallId,
				name: definition.toolId,
				status: completed ? "complete" : "failed",
			},
		},
		{
			type: "text",
			text: `### ${definition.title}\n\nStatus: ${envelope.status}\n\n${codeBlock}`,
		},
	];
	if (
		definition.toolId === "analytics_query" &&
		["success", "partial"].includes(envelope.status)
	) {
		const analytics = assistantAnalyticsResultSchema.safeParse(envelope.data);
		if (analytics.success) {
			parts.push({
				type: "data-assistant-analytics",
				id: `analytics-${toolCallId}`,
				data: analytics.data as Prisma.InputJsonValue,
			});
		}
	}
	if (
		definition.toolId === "sales_draft_from_request" &&
		["success", "requires_input"].includes(envelope.status)
	) {
		const draft = assistantSalesRequestDraftPreviewSchema.safeParse(
			envelope.data,
		);
		if (draft.success) {
			parts.push({
				type: "data-assistant-order-draft",
				id: `order-draft-${toolCallId}`,
				data: draft.data as Prisma.InputJsonValue,
			});
		}
	}
	for (const [index, source] of (envelope.sources ?? [])
		.slice(0, 8)
		.entries()) {
		parts.push({
			type: "data-source",
			id: `saved-source-${toolCallId}-${index}`,
			data: {
				kind: source.kind,
				id: source.id,
				label: source.label,
				...(source.href?.startsWith("https://") ? { url: source.href } : {}),
				freshness: "saved action result",
			},
		});
	}
	for (const [index, entity] of (envelope.entities ?? [])
		.slice(0, 20)
		.entries()) {
		parts.push({
			type: "data-assistant-entity",
			id: `saved-entity-${toolCallId}-${index}`,
			data: entity as Prisma.InputJsonValue,
		});
	}
	return parts;
}

export function classifyAssistantSavedActionResultStatus(status: string) {
	const reusable = status === "success" || status === "partial";
	return {
		completed: reusable || status === "requires_input",
		reusable,
	};
}

export function isReusableAssistantToolExecutionResult(result: unknown) {
	if (!result || typeof result !== "object") return false;
	const status = (result as { status?: unknown }).status;
	return status === "success" || status === "partial";
}

async function persistSavedActionResult(
	db: Database,
	actor: AssistantToolActor,
	input: {
		conversationId: string;
		actionId: string;
		definition: NonNullable<ReturnType<typeof getDefinition>>;
		toolInput: unknown;
		result: unknown;
		now: Date;
		executionSource?: "saved-action" | "manual-read-retry";
		idempotencyKey?: string;
	},
) {
	const scope = actionScope(actor);
	const runId = input.idempotencyKey ?? randomUUID();
	const requestId = input.idempotencyKey ?? randomUUID();
	const toolCallId = randomUUID();
	const executionSource = input.executionSource ?? "saved-action";
	const envelope = input.result as {
		status: string;
		sources?: unknown[];
		entities?: unknown[];
	};
	const { completed, reusable } = classifyAssistantSavedActionResultStatus(
		envelope.status,
	);
	if (input.idempotencyKey) {
		const existing = await db.assistantMessage.findFirst({
			where: {
				generatedRunId: runId,
				conversation: { ...scope, deletedAt: null },
			},
		});
		if (existing) {
			return {
				message: existing,
				completed,
				reusable,
				resultStatus: envelope.status,
			};
		}
	}
	return db.$transaction(
		async (tx) => {
			const allocation = await tx.assistantConversation.updateMany({
				where: {
					id: input.conversationId,
					...scope,
					archivedAt: null,
					deletedAt: null,
				},
				data: { lastSequence: { increment: 1 } },
			});
			if (allocation.count !== 1)
				throw new Error("Assistant conversation was not found");
			const conversation = await tx.assistantConversation.findUniqueOrThrow({
				where: { id: input.conversationId },
				select: { lastSequence: true },
			});
			await tx.assistantRun.create({
				data: {
					id: runId,
					conversationId: input.conversationId,
					actorUserId: actor.userId,
					requestId,
					requestFingerprint: hash({ actionId: input.actionId, requestId }),
					catalogVersion: ASSISTANT_TOOL_CATALOG_VERSION,
					model: executionSource,
					promptVersion: `${executionSource}-v1`,
					status: completed ? "succeeded" : "failed",
					terminalResult: {
						status: completed ? "succeeded" : "failed",
						resultStatus: envelope.status,
					},
					lastSequence: 1,
					startedAt: input.now,
					completedAt: input.now,
				},
			});
			await tx.assistantToolExecution.create({
				data: {
					runId,
					toolCallId,
					step: 1,
					eventSequence: 1,
					toolId: input.definition.toolId,
					toolVersion: input.definition.version,
					effect: input.definition.effect,
					status: completed ? "succeeded" : "failed",
					inputFingerprint: hash(input.toolInput),
					input: { redacted: true },
					result: {
						status: envelope.status,
						sourceCount: envelope.sources?.length ?? 0,
						entityCount: envelope.entities?.length ?? 0,
					},
					completedAt: input.now,
				},
			});
			const resultParts = buildAssistantSavedActionResultParts(
				input.definition,
				input.result,
				toolCallId,
			);
			if (executionSource === "manual-read-retry" && input.idempotencyKey) {
				resultParts.push({
					type: "data-assistant-read-retry",
					id: `read-retry-${input.idempotencyKey}`,
					data: { retryId: input.idempotencyKey, status: "consumed" },
				});
			}
			const message = await tx.assistantMessage.create({
				data: {
					conversationId: input.conversationId,
					sequence: conversation.lastSequence,
					role: "assistant",
					parts: resultParts as Prisma.InputJsonValue,
					searchText: `${input.definition.title} ${envelope.status}`,
					requestFingerprint: hash({ runId, result: input.result }),
					generatedRunId: runId,
				},
			});
			return { message, completed, reusable, resultStatus: envelope.status };
		},
		{ isolationLevel: "Serializable" },
	);
}

export async function persistAssistantReadRetryResult(
	db: Database,
	actor: AssistantToolActor,
	input: {
		conversationId: string;
		retryId: string;
		toolId: string;
		toolVersion: number;
		result: unknown;
	},
	now = new Date(),
) {
	const definition = getDefinition(input.toolId, input.toolVersion);
	if (!definition || definition.effect !== "read") {
		throw new Error("Assistant read retry is unavailable");
	}
	return persistSavedActionResult(
		db,
		actor,
		{
			conversationId: input.conversationId,
			actionId: `manual-read-retry:${input.retryId}`,
			definition,
			toolInput: { retryId: input.retryId },
			result: input.result,
			now,
			executionSource: "manual-read-retry",
			idempotencyKey: input.retryId,
		},
	);
}

export async function executeAssistantSavedAction(
	db: Database,
	actor: AssistantToolActor,
	input: { id: string; parameters: unknown; conversationId?: string },
	now = new Date(),
) {
	const parameters = assistantRecipeParametersSchema.parse(input.parameters);
	const scope = actionScope(actor);
	const action = await db.assistantSavedAction.findFirst({
		where: { id: input.id, ...scope, deletedAt: null, activeKey: "active" },
	});
	if (!action) throw new Error("Assistant saved action was not found");
	if (action.kind === "prompt_shortcut") {
		await db.assistantSavedAction.updateMany({
			where: { id: action.id, ...scope },
			data: { lastRunStatus: "ready", lastRunAt: now },
		});
		return {
			status: "prompt_ready" as const,
			prompt: action.promptTemplate ?? "",
		};
	}
	const compatibility = savedActionCompatibility(action);
	if (compatibility.status !== "current")
		return { status: "repair_required" as const, compatibility };
	if (!action.toolId || !action.toolVersion || !action.effect)
		throw new Error("Assistant recipe contract is incomplete");
	const definition = getDefinition(action.toolId, action.toolVersion);
	if (!definition) throw new Error("Assistant recipe tool is retired");
	let toolInput: unknown;
	try {
		const definitions = assistantParameterDefinitionSchema
			.array()
			.parse(action.parameterDefinitions ?? []);
		toolInput = resolveAssistantRecipeInput({
			template: action.inputTemplate,
			definitions,
			parameters,
			timezone: actor.timezone ?? "UTC",
			now,
		});
		definition.inputSchema.parse(toolInput);
	} catch (error) {
		await db.assistantSavedAction.updateMany({
			where: { id: action.id, ...scope },
			data: { lastRunStatus: "failed", lastRunAt: now },
		});
		throw error;
	}
	if (definition.effect === "read" || definition.effect === "draft") {
		try {
			if (!input.conversationId)
				throw new Error("Assistant recipes require a conversation");
			const result = await executeRegisteredAssistantTool(actor, {
				toolId: definition.toolId,
				version: definition.version,
				input: toolInput,
			});
			const bindings = assistantOutputBindingSchema
				.array()
				.parse(action.outputBindings ?? []);
			const persisted = await persistSavedActionResult(db, actor, {
				conversationId: input.conversationId,
				actionId: action.id,
				definition,
				toolInput,
				result,
				now,
			});
			await db.assistantSavedAction.updateMany({
				where: { id: action.id, ...scope },
				data: { lastRunStatus: persisted.resultStatus, lastRunAt: now },
			});
			return {
				status: persisted.completed
					? ("completed" as const)
					: ("failed" as const),
				resultStatus: persisted.resultStatus,
				messageId: persisted.message.id,
				bindings: Object.fromEntries(
					bindings.map((binding) => [
						binding.name,
						readBinding(result, binding.path),
					]),
				),
			};
		} catch (error) {
			await db.assistantSavedAction.updateMany({
				where: { id: action.id, ...scope },
				data: { lastRunStatus: "failed", lastRunAt: now },
			});
			throw error;
		}
	}
	let proposalPreflight: { ok: true; targetRevision?: string };
	try {
		proposalPreflight = await preflightRegisteredAssistantProposal(actor, {
			toolId: definition.toolId,
			version: definition.version,
			input: toolInput,
		});
	} catch (error) {
		await db.assistantSavedAction.updateMany({
			where: { id: action.id, ...scope },
			data: { lastRunStatus: "failed", lastRunAt: now },
		});
		throw error;
	}
	if (!input.conversationId) {
		await db.assistantSavedAction.updateMany({
			where: { id: action.id, ...scope },
			data: { lastRunStatus: "failed", lastRunAt: now },
		});
		throw new Error("Assistant write recipes require a conversation");
	}
	const conversation = await db.assistantConversation.findFirst({
		where: { id: input.conversationId, ...scope, deletedAt: null },
		select: { id: true },
	});
	if (!conversation) {
		await db.assistantSavedAction.updateMany({
			where: { id: action.id, ...scope },
			data: { lastRunStatus: "failed", lastRunAt: now },
		});
		throw new Error("Assistant conversation was not found");
	}
	const nonce = randomUUID();
	const requestId = randomUUID();
	const review = buildAssistantProposalReview({
		toolId: definition.toolId,
		effect: definition.effect,
		payload: toolInput,
		targetRevision: proposalPreflight.targetRevision,
	});
	const proposal = await db.$transaction(async (tx) => {
		const run = await tx.assistantRun.create({
			data: {
				conversationId: conversation.id,
				actorUserId: actor.userId,
				requestId,
				requestFingerprint: hash({ actionId: action.id, requestId }),
				catalogVersion: ASSISTANT_TOOL_CATALOG_VERSION,
				model: "saved-action",
				promptVersion: "saved-action-v1",
				status: "waiting_for_approval",
				lastSequence: 1,
			},
		});
		return tx.assistantActionProposal.create({
			data: {
				runId: run.id,
				actorUserId: actor.userId,
				toolId: definition.toolId,
				toolVersion: definition.version,
				effect: definition.effect,
				payloadHash: hash(toolInput),
				payload: toolInput as Prisma.InputJsonValue,
				targetRevision: proposalPreflight.targetRevision,
				diff: review.diff as Prisma.InputJsonValue,
				status: "pending",
				expiresAt: new Date(now.getTime() + 15 * 60_000),
				nonceHash: hash(nonce),
				idempotencyKey: `saved-action:${action.id}:${requestId}`,
				eventSequence: 1,
			},
		});
	});
	await db.assistantSavedAction.updateMany({
		where: { id: action.id, ...scope },
		data: { lastRunStatus: "requires_approval", lastRunAt: now },
	});
	return {
		status: "requires_approval" as const,
		proposalId: proposal.id,
		approvalToken: nonce,
		expiresAt: proposal.expiresAt,
		review,
	};
}

export async function saveAssistantActionFromRun(
	db: Database,
	actor: AssistantToolActor,
	rawInput: unknown,
) {
	const input = assistantSavedActionFromRunSchema.parse(rawInput);
	const executions = await db.assistantToolExecution.findMany({
		where: {
			runId: input.runId,
			status: "succeeded",
			run: {
				actorUserId: actor.userId,
				conversation: { ...actionScope(actor), deletedAt: null },
			},
		},
		orderBy: [{ eventSequence: "desc" }, { id: "desc" }],
		take: 25,
		include: {
			run: { include: { triggerMessage: { select: { parts: true } } } },
		},
	});
	const execution = executions.find((candidate) =>
		isReusableAssistantToolExecutionResult(candidate.result),
	);
	if (!execution) throw new Error("A durable successful action is required");
	if (input.kind === "recipe") {
		return createAssistantSavedAction(db, actor, {
			kind: "recipe",
			name: input.name,
			toolId: execution.toolId,
			toolVersion: execution.toolVersion,
			inputTemplate: input.inputTemplate,
			parameterDefinitions: input.parameterDefinitions,
			outputBindings: input.outputBindings,
		});
	}
	const parts = Array.isArray(execution.run.triggerMessage?.parts)
		? execution.run.triggerMessage.parts
		: [];
	const prompt = parts
		.flatMap((part) =>
			part &&
			typeof part === "object" &&
			(part as { type?: unknown }).type === "text" &&
			typeof (part as { text?: unknown }).text === "string"
				? [(part as { text: string }).text]
				: [],
		)
		.join("\n")
		.trim();
	if (!prompt) throw new Error("The successful action has no reusable prompt");
	return createAssistantSavedAction(db, actor, {
		kind: "prompt_shortcut",
		name: input.name,
		promptTemplate: prompt,
	});
}

export async function getAssistantSaveActionEligibility(
	db: Database,
	actor: AssistantToolActor,
	runId: string,
) {
	const executions = await db.assistantToolExecution.findMany({
		where: {
			runId,
			status: "succeeded",
			run: {
				actorUserId: actor.userId,
				conversation: { ...actionScope(actor), deletedAt: null },
			},
		},
		select: { id: true, result: true },
		take: 25,
	});
	return {
		eligible: executions.some((execution) =>
			isReusableAssistantToolExecutionResult(execution.result),
		),
	};
}

export async function getAssistantPreferences(
	db: Database,
	actor: AssistantToolActor,
) {
	const row = await db.assistantPreference.findUnique({
		where: { ownerUserId_scopeType_scopeId: actionScope(actor) },
	});
	return assistantPreferenceSchema.parse(
		row ?? {
			responseStyle: "balanced",
			responseDetail: "standard",
			chartPresentation: "auto",
			version: 1,
		},
	);
}

export async function updateAssistantPreferences(
	db: Database,
	actor: AssistantToolActor,
	input: {
		responseStyle: "concise" | "balanced" | "explanatory";
		responseDetail: "brief" | "standard" | "detailed";
		chartPresentation: "auto" | "table" | "bar" | "line" | "area";
		expectedVersion: number;
	},
) {
	const { expectedVersion, ...parsed } =
		assistantPreferenceUpdateSchema.parse(input);
	const scope = actionScope(actor);
	const existing = await db.assistantPreference.findUnique({
		where: { ownerUserId_scopeType_scopeId: scope },
	});
	if (!existing) {
		if (expectedVersion !== 1)
			throw new Error("Assistant preferences changed; reload and retry");
		return db.assistantPreference.create({ data: { ...scope, ...parsed } });
	}
	const updated = await db.assistantPreference.updateMany({
		where: { id: existing.id, version: expectedVersion },
		data: { ...parsed, version: { increment: 1 } },
	});
	if (updated.count !== 1)
		throw new Error("Assistant preferences changed; reload and retry");
	return db.assistantPreference.findUniqueOrThrow({
		where: { id: existing.id },
	});
}

export function listAssistantPersonalMemories(
	db: Database,
	actor: AssistantToolActor,
) {
	return db.assistantPersonalMemory.findMany({
		where: { ...actionScope(actor), deletedAt: null },
		orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
		take: 50,
	});
}

export async function createAssistantPersonalMemory(
	db: Database,
	actor: AssistantToolActor,
	content: string,
) {
	const value = z.string().trim().min(1).max(500).parse(content);
	const scope = actionScope(actor);
	return db.$transaction(
		async (tx) => {
			const count = await tx.assistantPersonalMemory.count({
				where: { ...scope, deletedAt: null },
			});
			if (count >= 50) throw new Error("Assistant memory limit reached");
			return tx.assistantPersonalMemory.create({
				data: { ...scope, content: value },
			});
		},
		{ isolationLevel: "Serializable" },
	);
}

export async function removeAssistantPersonalMemory(
	db: Database,
	actor: AssistantToolActor,
	input: { id: string; expectedVersion: number },
) {
	const result = await db.assistantPersonalMemory.updateMany({
		where: {
			id: input.id,
			...actionScope(actor),
			version: input.expectedVersion,
			deletedAt: null,
		},
		data: { deletedAt: new Date(), version: { increment: 1 } },
	});
	if (result.count !== 1)
		throw new Error("Assistant memory changed; reload and retry");
	return { id: input.id, removed: true as const };
}
