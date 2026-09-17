import { randomUUID } from "node:crypto";
import { z } from "zod";
import { sendAssistantRedisCommand } from "./redis-command";
import { executeRegisteredAssistantTool, getExecutableAssistantDefinitions, type AssistantToolActor } from "./registry";

const ticketSchema = z.object({
	userId: z.number().int().positive(), scopeType: z.string().max(64), scopeId: z.string().max(191),
	conversationId: z.string().min(1).max(191), runId: z.string().min(1).max(191),
	toolCallId: z.string().min(1).max(191), toolId: z.string().min(1).max(191), version: z.number().int().positive(),
	input: z.unknown(), expiresAt: z.number().int().positive(),
}).strict();
type Ticket = z.infer<typeof ticketSchema>;
type Dependencies = {
	command: typeof sendAssistantRedisCommand;
	definitions: typeof getExecutableAssistantDefinitions;
	execute: typeof executeRegisteredAssistantTool;
	now: () => number;
};
const defaults: Dependencies = { command: sendAssistantRedisCommand, definitions: getExecutableAssistantDefinitions, execute: executeRegisteredAssistantTool, now: Date.now };
const key = (id: string) => `assistant:manual-read-retry:${id}`;
const lockKey = (id: string) => `assistant:manual-read-retry-lock:${id}`;
const consumeScript = "if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('DEL',KEYS[1]); return 1 end; return 0";

/** Retry data is private, short-lived execution state, never diagnostic metadata. */
export async function createAssistantReadRetry(
	actor: AssistantToolActor,
	input: Pick<Ticket, "conversationId" | "runId" | "toolCallId" | "toolId" | "version" | "input">,
	overrides: Partial<Dependencies> = {},
) {
	const deps = { ...defaults, ...overrides };
	try {
		const definition = deps.definitions(actor).find(tool => tool.toolId === input.toolId && tool.version === input.version && tool.effect === "read");
		if (!definition) return null;
		const ticket = ticketSchema.parse({ ...input, input: definition.inputSchema.parse(input.input), userId: actor.userId, scopeType: actor.scopeType, scopeId: actor.scopeId, expiresAt: deps.now() + 600_000 });
		const serialized = JSON.stringify(ticket);
		if (Buffer.byteLength(serialized) > 8192) return null;
		const id = randomUUID();
		const stored = await deps.command(["SET", key(id), serialized, "EX", 600, "NX"]);
		return stored === "OK" ? id : null;
	} catch { return null; }
}

export class AssistantReadRetryUnavailable extends Error {
	constructor() { super("This check is no longer available. Please ask again."); }
}

export async function executeAssistantReadRetry(
	actor: AssistantToolActor,
	id: string,
	options: {
		signal: AbortSignal;
		/** Must verify ownership, scope and a matching failed read in durable history. */
		authorize: (ticket: Pick<Ticket, "conversationId" | "runId" | "toolCallId" | "toolId" | "version">) => Promise<boolean>;
		/** Reload entitlement, scope, and grants immediately before redemption. */
		resolveActor?: () => Promise<AssistantToolActor>;
		/** Persist the completed read before the ticket is removed. */
		persist?: (input: {
			conversationId: string;
			runId: string;
			toolCallId: string;
			toolId: string;
			version: number;
			result: unknown;
		}) => Promise<unknown>;
	},
	overrides: Partial<Dependencies> = {},
) {
	const deps = { ...defaults, ...overrides };
	options.signal.throwIfAborted();
	if (!z.string().uuid().safeParse(id).success) throw new AssistantReadRetryUnavailable();
	const raw = await deps.command(["GET", key(id)]);
	if (typeof raw !== "string" || Buffer.byteLength(raw) > 8192) throw new AssistantReadRetryUnavailable();
	let ticket: Ticket;
	try { ticket = ticketSchema.parse(JSON.parse(raw)); } catch { throw new AssistantReadRetryUnavailable(); }
	if (ticket.expiresAt <= deps.now() || ticket.userId !== actor.userId || ticket.scopeType !== actor.scopeType || ticket.scopeId !== actor.scopeId) throw new AssistantReadRetryUnavailable();
	if (!(await options.authorize(ticket))) throw new AssistantReadRetryUnavailable();
	const currentActor = options.resolveActor ? await options.resolveActor() : actor;
	if (currentActor.userId !== ticket.userId || currentActor.scopeType !== ticket.scopeType || currentActor.scopeId !== ticket.scopeId) throw new AssistantReadRetryUnavailable();
	const definition = deps.definitions(currentActor).find(tool => tool.toolId === ticket.toolId && tool.version === ticket.version && tool.effect === "read");
	if (!definition) throw new AssistantReadRetryUnavailable();
	const parsedInput = definition.inputSchema.parse(ticket.input);
	options.signal.throwIfAborted();
	const leaseId = randomUUID();
	if (await deps.command(["SET", lockKey(id), leaseId, "EX", 600, "NX"]) !== "OK") throw new AssistantReadRetryUnavailable();
	try {
		const result = await deps.execute(currentActor, { toolId: ticket.toolId, version: ticket.version, input: parsedInput }, {}, { signal: options.signal });
		options.signal.throwIfAborted();
		const retried = {
			conversationId: ticket.conversationId, runId: ticket.runId,
			toolCallId: ticket.toolCallId, toolId: ticket.toolId,
			version: ticket.version, result,
		};
		const persistence = await options.persist?.(retried);
		const consumed = await deps.command(["EVAL", consumeScript, 1, key(id), raw]);
		// Expiry is already a successful consumption. If a transport returns an
		// unexpected compare result while the key still exists, remove this opaque
		// one-use handle before reporting the persisted result.
		if (Number(consumed) !== 1) await deps.command(["DEL", key(id)]);
		return { ...retried, persistence };
	} finally {
		await deps.command(["EVAL", consumeScript, 1, lockKey(id), leaseId]).catch(() => undefined);
	}
}
