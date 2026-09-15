import { createHash } from "node:crypto";
import type { Database } from "@gnd/db";
import { TRPCError } from "@trpc/server";
import type { z } from "zod";
import { assistantClientDiagnosticSchema } from "./diagnostic-contract";
import { captureAssistantDiagnostic } from "./diagnostics";
import { sendAssistantRedisCommand } from "./redis-command";
import { reportAssistantClientCaptureUnavailable } from "./client-report-health";

const clientReportRateScript =
	"local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],60000) end; return n";

export async function reportAssistantClientFailure(
	db: Database,
	actor: { userId: number; scopeType: string; scopeId: string },
	rawInput: z.infer<typeof assistantClientDiagnosticSchema>,
	dependencies = {
		command: sendAssistantRedisCommand,
		capture: captureAssistantDiagnostic,
	},
) {
	const input = assistantClientDiagnosticSchema.parse(rawInput);
	let count: number;
	try {
		count = Number(
			await dependencies.command([
				"EVAL",
				clientReportRateScript,
				1,
				`assistant:client-reports:${actor.userId}`,
			]),
		);
	} catch {
		reportAssistantClientCaptureUnavailable();
		throw new TRPCError({
			code: "SERVICE_UNAVAILABLE",
			message: "Unable to record this report right now.",
		});
	}
	if (!Number.isFinite(count) || count < 1 || count > 5)
		throw new TRPCError({
			code: "TOO_MANY_REQUESTS",
			message: "Please wait before sending another report.",
		});
	const conversation = input.conversationId
		? await db.assistantConversation.findFirst({
				where: {
					id: input.conversationId,
					ownerUserId: actor.userId,
					scopeType: actor.scopeType,
					scopeId: actor.scopeId,
					deletedAt: null,
				},
				select: { id: true },
			})
		: null;
	if (input.conversationId && !conversation)
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Conversation unavailable.",
		});
	if (input.runId) {
		const run = await db.assistantRun.findFirst({
			where: {
				id: input.runId,
				conversationId: conversation!.id,
				actorUserId: actor.userId,
			},
			select: { id: true },
		});
		if (!run)
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Response unavailable.",
			});
	}
	const reference = `ERR-${createHash("sha256").update(`${actor.userId}:${input.eventId}`).digest("hex").slice(0, 10).toUpperCase()}`;
	const result = await dependencies.capture(
		new Error("Assistant browser operation failed"),
		{
			reference,
			requestId: input.eventId,
			conversationId: conversation?.id,
			runId: input.runId,
			actorUserId: actor.userId,
			scopeType: actor.scopeType,
			scopeId: actor.scopeId,
			stage: "client",
			operation: `assistant.client.${input.stage}`,
			outcome:
				input.stage === "attachment" ? "upload-failed" : input.stage === "transport" || input.stage === "reconnect"
					? "uncertain"
					: "temporary",
		},
	);
	return { reference: result.reference, recorded: result.recorded };
}
