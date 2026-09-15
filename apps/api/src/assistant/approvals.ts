import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { type Database, Prisma } from "@gnd/db";
import { z } from "zod";
import { captureAssistantDiagnostic } from "./diagnostics";
import { runAssistantOperation } from "./operation-diagnostics";
import { assistantOutcomeSchema, type AssistantOutcome } from "./outcomes";
import {
	ASSISTANT_TOOL_CATALOG_VERSION,
	AssistantProposalPrecommitError,
	type AssistantToolActor,
	assistantEffectPolicies,
	executeApprovedAssistantProposal,
	getAssistantReleaseAuthority,
	preflightRegisteredAssistantProposal,
} from "./registry";

const EXECUTION_LEASE_MS = 5 * 60_000;
const hash = (value: unknown) =>
	createHash("sha256").update(JSON.stringify(value)).digest("hex");
const proposalScope = (actor: AssistantToolActor) => ({
	actorUserId: actor.userId,
	run: {
		conversation: {
			ownerUserId: actor.userId,
			scopeType: actor.scopeType,
			scopeId: actor.scopeId,
			deletedAt: null,
		},
	},
});

export const assistantProposalCreateSchema = z
	.object({
		conversationId: z.string().trim().min(1).max(191),
		clientRequestId: z.string().uuid(),
		toolId: z.string().trim().min(3).max(191),
		toolVersion: z.number().int().positive(),
		input: z.unknown(),
	})
	.strict();
export const assistantProposalDecisionSchema = z
	.object({
		proposalId: z.string().trim().min(1).max(191),
		approvalToken: z.string().trim().min(32).max(512),
		confirmationRequestId: z.string().uuid(),
		decision: z.enum(["approve", "reject"]),
	})
	.strict();

type ProposalRecord = {
	id: string;
	runId: string;
	status: string;
	toolId: string;
	toolVersion: number;
	effect: string;
	payload: unknown;
	targetRevision?: string | null;
	diff?: unknown;
	expiresAt: Date;
	nonceHash: string;
	executionStartedAt?: Date | null;
	result?: unknown;
	errorCode?: string | null;
	run?: { requestFingerprint: string; conversationId?: string } | null;
};
type ProposalPreflight = typeof preflightRegisteredAssistantProposal;

function approvalExecutionReference(proposal: ProposalRecord) {
	return `ERR-${hash(`proposal-execution:${proposal.id}`).slice(0, 10).toUpperCase()}`;
}

function approvalSecret() {
	const secret =
		process.env.ASSISTANT_APPROVAL_SECRET?.trim() ||
		process.env.BETTER_AUTH_SECRET?.trim() ||
		process.env.NEXTAUTH_SECRET?.trim();
	if (!secret) throw new Error("Assistant approval signing is not configured");
	return secret;
}

function proposalToken(
	actor: AssistantToolActor,
	input: { clientRequestId: string; toolId: string; toolVersion: number },
) {
	return createHmac("sha256", approvalSecret())
		.update(
			JSON.stringify({
				actorUserId: actor.userId,
				scopeType: actor.scopeType,
				scopeId: actor.scopeId,
				...input,
			}),
		)
		.digest("base64url");
}

function validToken(expectedHash: string, token: string) {
	const received = Buffer.from(hash(token), "hex");
	const expected = Buffer.from(expectedHash, "hex");
	return (
		received.length === expected.length && timingSafeEqual(received, expected)
	);
}

function proposalDiff(
	title: string,
	payload: unknown,
	targetRevision?: string,
) {
	const parameters =
		payload && typeof payload === "object" && !Array.isArray(payload)
			? Object.keys(payload).sort()
			: [];
	return {
		summary: `Confirm ${title.toLocaleLowerCase()}.`,
		changes: [
			...parameters.map((key) => `Use the reviewed ${key} value.`),
			...(targetRevision ? ["Require the reviewed record revision."] : []),
		],
	};
}

export function buildAssistantProposalReview(input: {
	toolId: string;
	effect: string;
	payload: unknown;
	targetRevision?: string | null;
}) {
	const authority = getAssistantReleaseAuthority(input.toolId);
	const title = authority?.title ?? input.toolId;
	return {
		title,
		effect: input.effect,
		targetRevision: input.targetRevision ?? null,
		parameters: input.payload,
		diff: proposalDiff(title, input.payload, input.targetRevision ?? undefined),
	};
}

function proposalReview(proposal: ProposalRecord) {
	return {
		...buildAssistantProposalReview({
			toolId: proposal.toolId,
			effect: proposal.effect,
			payload: proposal.payload,
			targetRevision: proposal.targetRevision,
		}),
		diff: proposal.diff ?? null,
	};
}

function proposalReceipt(
	proposal: ProposalRecord,
	options: { includeProtected?: boolean } = {},
) {
	const includeProtected = options.includeProtected ?? true;
	const result = proposal.result;
	const parsedOutcome = assistantOutcomeSchema.safeParse(
		result && typeof result === "object" && "assistantOutcome" in result
			? result.assistantOutcome : null,
	);
	return {
		proposalId: proposal.id,
		status: proposal.status,
		toolId: proposal.toolId,
		toolVersion: proposal.toolVersion,
		effect: proposal.effect,
		expiresAt: proposal.expiresAt,
		result: includeProtected ? (proposal.result ?? null) : null,
		errorCode: proposal.errorCode ?? null,
		outcome: includeProtected && parsedOutcome.success ? parsedOutcome.data : null,
		review: includeProtected ? proposalReview(proposal) : null,
	};
}

async function transitionProposalAndRun(
	db: Database,
	proposal: ProposalRecord,
	where: Record<string, unknown>,
	proposalData: Record<string, unknown>,
	runData: Record<string, unknown>,
) {
	return db.$transaction(async (tx) => {
		const updated = await tx.assistantActionProposal.updateMany({
			where: { id: proposal.id, ...where },
			data: proposalData,
		});
		if (updated.count === 1) {
			const runUpdated = await tx.assistantRun.updateMany({
				where: { id: proposal.runId },
				data: runData,
			});
			if (runUpdated.count !== 1)
				throw new Error("Assistant proposal run transition failed");
		}
		return updated.count;
	});
}

async function reauthorizeProposal(
	actor: AssistantToolActor,
	proposal: ProposalRecord,
	preflight: ProposalPreflight,
) {
	try {
		const prepared = await preflight(actor, {
			toolId: proposal.toolId,
			version: proposal.toolVersion,
			input: proposal.payload,
		});
		return (
			(!proposal.targetRevision || prepared.targetRevision === proposal.targetRevision) ? "authorized" : "conflict"
		);
	} catch (error) {
		if (error instanceof AssistantProposalPrecommitError && (error.code === "denied" || error.code === "conflict")) return error.code;
		throw error;
	}
}

async function recoverStaleExecution(
	db: Database,
	proposal: ProposalRecord,
	now: Date,
	actor: AssistantToolActor,
	capture: typeof captureAssistantDiagnostic,
) {
	if (
		proposal.status !== "executing" ||
		!proposal.executionStartedAt ||
		proposal.executionStartedAt.getTime() > now.getTime() - EXECUTION_LEASE_MS
	)
		return proposal;
	const errorCode = "EXECUTION_OUTCOME_UNKNOWN";
	const reference = approvalExecutionReference(proposal);
	const result = { status: "unknown", assistantOutcome: { kind: "uncertain" as const, reference } };
	const count = await transitionProposalAndRun(
		db,
		proposal,
		{ status: "executing", executionStartedAt: proposal.executionStartedAt },
		{ status: "unknown", executionCompletedAt: now, errorCode, result },
		{ status: "failed", completedAt: now, errorCode, terminalResult: result },
	);
	if (count === 1) {
		try {
			await capture(new Error("Approved action exceeded its execution lease without a confirmed outcome"), {
				reference, stage: "action", operation: "assistant.approval.recoverStaleExecution",
				outcome: "uncertain", runId: proposal.runId, conversationId: proposal.run?.conversationId,
				actorUserId: actor.userId, scopeType: actor.scopeType, scopeId: actor.scopeId,
			});
		} catch {
			console.error("assistant_stale_approval_diagnostic_failed", { reference });
		}
	}
	return count === 1
		? { ...proposal, status: "unknown", errorCode, result }
		: { ...proposal, status: "processing" };
}

async function findScopedProposal(
	db: Database,
	actor: AssistantToolActor,
	where: Record<string, unknown>,
) {
	return db.assistantActionProposal.findFirst({
		where: { ...where, ...proposalScope(actor) },
		include: { run: { select: { requestFingerprint: true, conversationId: true } } },
	}) as Promise<ProposalRecord | null>;
}

export async function createAssistantActionProposal(
	db: Database,
	actor: AssistantToolActor,
	rawInput: unknown,
	now = new Date(),
	preflight: ProposalPreflight = preflightRegisteredAssistantProposal,
) {
	const input = assistantProposalCreateSchema.parse(rawInput);
	const authority = getAssistantReleaseAuthority(input.toolId);
	if (
		!authority ||
		authority.version !== input.toolVersion ||
		authority.capability !== "implemented" ||
		assistantEffectPolicies[authority.effect].confirmation !== "explicit"
	)
		throw new Error("Assistant proposal is not available");
	const conversation = await db.assistantConversation.findFirst({
		where: {
			id: input.conversationId,
			ownerUserId: actor.userId,
			scopeType: actor.scopeType,
			scopeId: actor.scopeId,
			deletedAt: null,
		},
		select: { id: true },
	});
	if (!conversation) throw new Error("Assistant conversation was not found");
	const prepared = await preflight(actor, {
		toolId: input.toolId,
		version: input.toolVersion,
		input: input.input,
	});
	const idempotencyKey = `ui-proposal:${input.clientRequestId}`;
	const fingerprint = hash(input);
	const approvalToken = proposalToken(actor, input);
	const readExisting = async () => {
		const existing = await findScopedProposal(db, actor, { idempotencyKey });
		if (!existing) return null;
		if (existing.run?.requestFingerprint !== fingerprint)
			throw new Error(
				"Assistant proposal request conflicts with an earlier request",
			);
		return existing;
	};
	const existing = await readExisting();
	if (existing)
		return { ...proposalReceipt(existing), approvalToken, deduplicated: true };
	let created: ProposalRecord;
	let deduplicated = false;
	try {
		created = (await db.$transaction(async (tx) => {
			const run = await tx.assistantRun.create({
				data: {
					conversationId: conversation.id,
					actorUserId: actor.userId,
					requestId: input.clientRequestId,
					requestFingerprint: fingerprint,
					catalogVersion: ASSISTANT_TOOL_CATALOG_VERSION,
					model: "deterministic-proposal",
					promptVersion: "assistant-approval-v1",
					status: "waiting_for_approval",
					lastSequence: 1,
				},
			});
			return tx.assistantActionProposal.create({
				data: {
					runId: run.id,
					actorUserId: actor.userId,
					toolId: input.toolId,
					toolVersion: input.toolVersion,
					effect: authority.effect,
					payloadHash: hash(input.input),
					payload: input.input as Prisma.InputJsonValue,
					targetRevision: prepared.targetRevision,
					diff: proposalDiff(
						authority.title,
						input.input,
						prepared.targetRevision,
					) as Prisma.InputJsonValue,
					status: "pending",
					expiresAt: new Date(now.getTime() + 15 * 60_000),
					nonceHash: hash(approvalToken),
					idempotencyKey,
					eventSequence: 1,
				},
			});
		})) as ProposalRecord;
	} catch (error) {
		if (
			!(error instanceof Prisma.PrismaClientKnownRequestError) ||
			error.code !== "P2002"
		)
			throw error;
		const raced = await readExisting();
		if (!raced) throw error;
		created = raced;
		deduplicated = true;
	}
	return { ...proposalReceipt(created), approvalToken, deduplicated };
}

export async function getAssistantActionProposal(
	db: Database,
	actor: AssistantToolActor,
	proposalId: string,
	now = new Date(),
	preflight: ProposalPreflight = preflightRegisteredAssistantProposal,
	capture: typeof captureAssistantDiagnostic = captureAssistantDiagnostic,
) {
	const found = await findScopedProposal(db, actor, { id: proposalId });
	if (!found) throw new Error("Assistant proposal was not found");
	const proposal = await recoverStaleExecution(db, found, now, actor, capture);
	const authorized = await reauthorizeProposal(actor, proposal, preflight);
	return authorized === "authorized"
		? proposalReceipt(proposal)
		: {
				...proposalReceipt(proposal, { includeProtected: false }),
				errorCode: authorized === "denied" ? "AUTHORIZATION_CHANGED" : "TARGET_CHANGED",
			};
}

export async function decideAssistantActionProposal(
	db: Database,
	actor: AssistantToolActor,
	rawInput: unknown,
	dependencies: {
		preflight: ProposalPreflight;
		execute: typeof executeApprovedAssistantProposal;
		capture?: typeof captureAssistantDiagnostic;
	} = {
		preflight: preflightRegisteredAssistantProposal,
		execute: executeApprovedAssistantProposal,
	},
	now = new Date(),
) {
	const input = assistantProposalDecisionSchema.parse(rawInput);
	const found = await findScopedProposal(db, actor, { id: input.proposalId });
	if (!found || !validToken(found.nonceHash, input.approvalToken))
		throw new Error("Assistant proposal was not found");
	const proposal = await recoverStaleExecution(db, found, now, actor, dependencies.capture ?? captureAssistantDiagnostic);
	const failureResult = async (error: unknown, status: string, kind: AssistantOutcome["kind"]) => {
		const reference = approvalExecutionReference(proposal);
		if (kind === "temporary" || kind === "uncertain") {
			await (dependencies.capture ?? captureAssistantDiagnostic)(error, {
				reference, stage: "action", operation: `assistant.approval.${proposal.toolId}`,
				runId: proposal.runId, conversationId: proposal.run?.conversationId, actorUserId: actor.userId,
				scopeType: actor.scopeType, scopeId: actor.scopeId, outcome: kind,
			});
		}
		return { status, assistantOutcome: { kind, ...(["temporary", "uncertain"].includes(kind) ? { reference } : {}) } };
	};
	if (proposal.status !== "pending") {
		const authorized = await reauthorizeProposal(
			actor,
			proposal,
			dependencies.preflight,
		);
		const visibleProposal =
			proposal.status === "executing"
				? { ...proposal, status: "processing" }
				: proposal;
		return authorized === "authorized"
			? proposalReceipt(visibleProposal)
			: {
					...proposalReceipt(visibleProposal, { includeProtected: false }),
					errorCode: authorized === "denied" ? "AUTHORIZATION_CHANGED" : "TARGET_CHANGED",
				};
	}
	if (proposal.expiresAt <= now) {
		const errorCode = "APPROVAL_EXPIRED";
		const count = await transitionProposalAndRun(
			db,
			proposal,
			{ status: "pending" },
			{ status: "expired", errorCode },
			{ status: "failed", completedAt: now, errorCode },
		);
		return {
			...proposalReceipt({
				...proposal,
				status: count ? "expired" : "processing",
			}),
			errorCode: count ? errorCode : null,
		};
	}
	if (input.decision === "reject") {
		const errorCode = "APPROVAL_REJECTED";
		const count = await transitionProposalAndRun(
			db,
			proposal,
			{ status: "pending" },
			{ status: "rejected", rejectedAt: now, errorCode },
			{ status: "failed", completedAt: now, errorCode },
		);
		return proposalReceipt({
			...proposal,
			status: count ? "rejected" : "processing",
			errorCode: count ? errorCode : null,
		});
	}
	let preflight: { ok: true; targetRevision?: string };
	try {
		preflight = await dependencies.preflight(actor, {
			toolId: proposal.toolId,
			version: proposal.toolVersion,
			input: proposal.payload,
		});
	} catch (error) {
		if (!(error instanceof AssistantProposalPrecommitError) || !["denied", "conflict"].includes(error.code)) {
			return runAssistantOperation({
				stage: "action", operation: "assistant.approval.preflight", runId: proposal.runId,
				conversationId: proposal.run?.conversationId, actorUserId: actor.userId,
				scopeType: actor.scopeType, scopeId: actor.scopeId,
			}, async () => { throw error; }, { capture: dependencies.capture });
		}
		const status = error.code;
		const errorCode = status === "denied" ? "AUTHORIZATION_CHANGED" : "TARGET_CHANGED";
		const count = await transitionProposalAndRun(
			db,
			proposal,
			{ status: "pending" },
			{ status, errorCode },
			{ status: "failed", completedAt: now, errorCode },
		);
		return {
			...proposalReceipt(
				{ ...proposal, status: count ? status : "processing", errorCode },
				{ includeProtected: false },
			),
			errorCode: count ? errorCode : null,
		};
	}
	if (
		proposal.targetRevision &&
		preflight.targetRevision !== proposal.targetRevision
	) {
		const errorCode = "TARGET_CHANGED";
		const count = await transitionProposalAndRun(
			db,
			proposal,
			{ status: "pending" },
			{ status: "conflict", errorCode },
			{ status: "failed", completedAt: now, errorCode },
		);
		return {
			...proposalReceipt({
				...proposal,
				status: count ? "conflict" : "processing",
				errorCode,
			}),
			errorCode: count ? errorCode : null,
		};
	}
	const claimed = await transitionProposalAndRun(
		db,
		proposal,
		{ status: "pending" },
		{
			status: "executing",
			confirmedAt: now,
			confirmationRequestId: input.confirmationRequestId,
			executionStartedAt: now,
		},
		{ status: "executing", startedAt: now, errorCode: null },
	);
	if (claimed !== 1)
		return { ...proposalReceipt(proposal), status: "processing" };
	try {
		const result = await dependencies.execute(actor, {
			toolId: proposal.toolId,
			version: proposal.toolVersion,
			payload: proposal.payload,
			expectedTargetRevision: proposal.targetRevision ?? undefined,
		});
		const outcome = classifyExecutionResult(result);
		const safeResult = outcome.proposalStatus === "succeeded" ? result
			: await failureResult(new Error("Approved action returned a failure outcome"), outcome.proposalStatus,
				outcome.proposalStatus === "denied" ? "denied" : outcome.proposalStatus === "conflict" ? "conflict" : "temporary");
		const resultJson = safeResult as Prisma.InputJsonValue;
		const finalized = await transitionProposalAndRun(
			db,
			proposal,
			{
				status: "executing",
				confirmationRequestId: input.confirmationRequestId,
			},
			{
				status: outcome.proposalStatus,
				result: resultJson,
				consumedAt: now,
				executionCompletedAt: now,
				errorCode: outcome.errorCode,
			},
			{
				status: outcome.runStatus,
				terminalResult: resultJson,
				completedAt: now,
				errorCode: outcome.errorCode,
			},
		);
		if (finalized !== 1)
			return { ...proposalReceipt(proposal), status: "processing" };
		return proposalReceipt({
			...proposal,
			status: outcome.proposalStatus,
			result: safeResult,
			errorCode: outcome.errorCode,
		});
	} catch (error) {
		if (error instanceof AssistantProposalPrecommitError) {
			const status = error.code;
			const errorCode =
				status === "conflict"
					? "EXECUTION_CONFLICT"
					: status === "denied"
						? "EXECUTION_DENIED"
						: "EXECUTION_FAILED";
			const result = await failureResult(error, status, status === "denied" ? "denied" : status === "conflict" ? "conflict" : "temporary");
			await transitionProposalAndRun(
				db,
				proposal,
				{
					status: "executing",
					confirmationRequestId: input.confirmationRequestId,
				},
				{ status, executionCompletedAt: now, errorCode, result },
				{ status: "failed", completedAt: now, errorCode, terminalResult: result },
			);
			return proposalReceipt({ ...proposal, status, errorCode, result });
		}
		const errorCode = "EXECUTION_OUTCOME_UNKNOWN";
		const result = await failureResult(error, "unknown", "uncertain");
		await transitionProposalAndRun(
			db,
			proposal,
			{
				status: "executing",
				confirmationRequestId: input.confirmationRequestId,
			},
			{ status: "unknown", executionCompletedAt: now, errorCode, result },
			{ status: "failed", completedAt: now, errorCode, terminalResult: result },
		);
		return {
			...proposalReceipt({ ...proposal, status: "unknown", errorCode, result }),
			errorCode,
		};
	}
}

function classifyExecutionResult(result: unknown) {
	const status =
		result && typeof result === "object" && "status" in result
			? String(result.status)
			: "failed";
	if (["success", "partial", "pending"].includes(status))
		return {
			proposalStatus: "succeeded",
			runStatus: "succeeded",
			errorCode: null,
		};
	if (["conflict", "requires_input"].includes(status))
		return {
			proposalStatus: "conflict",
			runStatus: "failed",
			errorCode: "EXECUTION_CONFLICT",
		};
	if (status === "denied")
		return {
			proposalStatus: "denied",
			runStatus: "failed",
			errorCode: "EXECUTION_DENIED",
		};
	return {
		proposalStatus: "failed",
		runStatus: "failed",
		errorCode: "EXECUTION_FAILED",
	};
}
