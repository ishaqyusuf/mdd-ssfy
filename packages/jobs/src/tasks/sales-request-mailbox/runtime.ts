import {
	type MailboxDisconnectDependencies,
	type MailboxMessageDetailDependencies,
	type MailboxSyncDependencies,
	type MailboxSyncSource,
	type MailboxTokenHealthDependencies,
	disconnectMailboxConnection,
	runMailboxMessageDetail,
	runMailboxSyncStream,
	runMailboxTokenHealthLifecycle,
} from "@gnd/sales-request-mailbox";
import { z } from "zod";

const MAX_MAILBOX_JOB_IDENTIFIER_LENGTH = 255;

const mailboxJobIdentifierSchema = z
	.string()
	.min(1)
	.max(MAX_MAILBOX_JOB_IDENTIFIER_LENGTH)
	.refine((value) => value.trim() === value, "Identifier must be trimmed")
	.refine(
		(value) =>
			Array.from(value).every((character) => {
				const codePoint = character.codePointAt(0) ?? 0;
				return codePoint >= 32 && codePoint !== 127;
			}),
		"Identifier cannot contain control characters",
	);

const mailboxJobPayloadSchema = z
	.object({ workId: mailboxJobIdentifierSchema })
	.strict();

export const mailboxSyncJobPayloadSchema = mailboxJobPayloadSchema;
export const mailboxMessageDetailJobPayloadSchema = mailboxJobPayloadSchema;
export const mailboxTokenHealthJobPayloadSchema = mailboxJobPayloadSchema;
export const mailboxDisconnectJobPayloadSchema = mailboxJobPayloadSchema;

export type MailboxJobPayload = z.infer<typeof mailboxJobPayloadSchema>;

export const SALES_REQUEST_MAILBOX_SYNC_LEASE_MS = 2 * 60_000;
export const SALES_REQUEST_MAILBOX_DETAIL_LEASE_MS = 2 * 60_000;

export type SalesRequestMailboxJobContext = {
	runId: string;
	signal?: AbortSignal;
};

type MailboxJobWorkResolution<T> =
	| { kind: "ready"; work: T }
	| { kind: "not-found" };

export interface SalesRequestMailboxJobWorkStore {
	/**
	 * Every resolver reloads server-owned durable work. Implementations must scope
	 * the lookup to its work kind and return no work after cancellation, completion,
	 * or invalidation. Returned references are reauthorized by the lifecycle store.
	 */
	resolveSyncWork(input: {
		workId: string;
	}): Promise<
		MailboxJobWorkResolution<{
			connectionId: string;
			source: MailboxSyncSource;
		}>
	>;
	resolveMessageDetailWork(input: {
		workId: string;
	}): Promise<
		MailboxJobWorkResolution<{
			connectionId: string;
			source: MailboxSyncSource;
			providerMessageId: string;
			expectedSummaryRevision: number;
		}>
	>;
	resolveTokenHealthWork(input: {
		workId: string;
	}): Promise<
		MailboxJobWorkResolution<{
			connectionId: string;
			expectedConnectionRevision: number;
			reason: "token-expiring" | "forced-health-check";
		}>
	>;
	resolveDisconnectWork(input: {
		workId: string;
	}): Promise<
		MailboxJobWorkResolution<{
			actorUserId: number;
			connectionId: string;
			expectedConnectionRevision: number;
		}>
	>;
}

export type SalesRequestMailboxJobDependencies = {
	work: SalesRequestMailboxJobWorkStore;
	sync: MailboxSyncDependencies;
	detail: MailboxMessageDetailDependencies;
	tokenHealth: MailboxTokenHealthDependencies;
	disconnect: MailboxDisconnectDependencies;
	clock?: () => Date;
};

function jobContext(context: SalesRequestMailboxJobContext) {
	return {
		runId: mailboxJobIdentifierSchema.parse(context.runId),
		signal: context.signal,
	};
}

/**
 * Composes Trigger-style task handlers without registering a queue or selecting a
 * database. Queue payloads carry one opaque durable reference only. The work store
 * resolves all source, message, revision, and actor fields server-side; lifecycle
 * stores then revalidate current policy, ownership, and revision fences.
 */
export function createSalesRequestMailboxJobRuntime(
	dependencies: SalesRequestMailboxJobDependencies,
) {
	const clock = dependencies.clock ?? (() => new Date());

	return {
		sync: async (
			payload: unknown,
			execution: SalesRequestMailboxJobContext,
		) => {
			const input = mailboxSyncJobPayloadSchema.parse(payload);
			const context = jobContext(execution);
			if (context.signal?.aborted) return { kind: "cancelled" } as const;
			const resolved = await dependencies.work.resolveSyncWork(input);
			if (resolved.kind === "not-found")
				return { kind: "work-not-found" } as const;
			if (context.signal?.aborted) return { kind: "cancelled" } as const;
			const now = clock();
			return runMailboxSyncStream(
				{
					...resolved.work,
					runId: context.runId,
					now,
					leaseDurationMs: SALES_REQUEST_MAILBOX_SYNC_LEASE_MS,
					clock,
					signal: context.signal,
				},
				dependencies.sync,
			);
		},
		detail: async (
			payload: unknown,
			execution: SalesRequestMailboxJobContext,
		) => {
			const input = mailboxMessageDetailJobPayloadSchema.parse(payload);
			const context = jobContext(execution);
			if (context.signal?.aborted) return { kind: "cancelled" } as const;
			const resolved = await dependencies.work.resolveMessageDetailWork(input);
			if (resolved.kind === "not-found")
				return { kind: "work-not-found" } as const;
			if (context.signal?.aborted) return { kind: "cancelled" } as const;
			const now = clock();
			return runMailboxMessageDetail(
				{
					...resolved.work,
					runId: context.runId,
					now,
					leaseDurationMs: SALES_REQUEST_MAILBOX_DETAIL_LEASE_MS,
					clock,
					signal: context.signal,
				},
				dependencies.detail,
			);
		},
		tokenHealth: async (
			payload: unknown,
			execution: SalesRequestMailboxJobContext,
		) => {
			const input = mailboxTokenHealthJobPayloadSchema.parse(payload);
			const context = jobContext(execution);
			if (context.signal?.aborted) return { kind: "cancelled" } as const;
			const resolved = await dependencies.work.resolveTokenHealthWork(input);
			if (resolved.kind === "not-found")
				return { kind: "work-not-found" } as const;
			if (context.signal?.aborted) return { kind: "cancelled" } as const;
			return runMailboxTokenHealthLifecycle(
				{
					...resolved.work,
					operationId: input.workId,
					now: clock(),
					signal: context.signal,
				},
				{ ...dependencies.tokenHealth, clock },
			);
		},
		disconnect: async (
			payload: unknown,
			execution: SalesRequestMailboxJobContext,
		) => {
			const input = mailboxDisconnectJobPayloadSchema.parse(payload);
			const context = jobContext(execution);
			if (context.signal?.aborted) return { kind: "cancelled" } as const;
			const resolved = await dependencies.work.resolveDisconnectWork(input);
			if (resolved.kind === "not-found")
				return { kind: "work-not-found" } as const;
			if (context.signal?.aborted) return { kind: "cancelled" } as const;
			return disconnectMailboxConnection(
				{
					...resolved.work,
					now: clock(),
					signal: context.signal,
				},
				{ ...dependencies.disconnect, clock },
			);
		},
	};
}
