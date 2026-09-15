import { createHash } from "node:crypto";
import { classifyError, createErrorReference } from "@gnd/errors";
import { z } from "zod";
import { assistantOutcomeSchema, presentAssistantOutcome } from "./outcomes";

export * from "./diagnostic-contract";
import type { AssistantDiagnosticStage } from "./diagnostic-contract";

export type AssistantDiagnosticContext = {
	reference?: string;
	requestId?: string;
	conversationId?: string;
	runId?: string;
	toolCallId?: string;
	actorUserId?: number;
	scopeType?: string;
	scopeId?: string;
	stage: AssistantDiagnosticStage;
	operation: string;
	provider?: string;
	model?: string;
	durationMs?: number;
	attempt?: 1 | 2;
	presentation?: "not-shown";
	outcome?: z.infer<typeof assistantOutcomeSchema>["kind"];
};

function field(error: unknown, key: string): unknown {
	try {
		return error && typeof error === "object"
			? Reflect.get(error, key)
			: undefined;
	} catch {
		return undefined;
	}
}

const knownNames = new Set([
	"Error",
	"TypeError",
	"RangeError",
	"AbortError",
	"TimeoutError",
	"ZodError",
	"TRPCError",
	"InvalidPDFException",
	"PasswordException",
	"PrismaClientKnownRequestError",
	"PrismaClientUnknownRequestError",
	"PrismaClientInitializationError",
	"PrismaClientValidationError",
	"AI_APICallError",
	"AI_InvalidToolInputError",
	"AI_NoSuchToolError",
]);

/** Never retain arbitrary exception messages: they commonly embed SQL/input/secrets. */
export function assistantTechnicalDetails(error: unknown) {
	const causes: Array<{ name: string; code?: string; status?: number }> = [];
	const seen = new Set<unknown>();
	let current = error;
	for (let depth = 0; current && depth < 4 && !seen.has(current); depth++) {
		seen.add(current);
		const name = field(current, "name");
		const code = field(current, "code");
		const status = field(current, "statusCode");
		causes.push({
			name: typeof name === "string" && knownNames.has(name) ? name : "Error",
			...(typeof code === "string" &&
			/^(P\d{4}|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EPIPE)$/.test(code)
				? { code }
				: {}),
			...(typeof status === "number" &&
			Number.isInteger(status) &&
			status >= 400 &&
			status <= 599
				? { status }
				: {}),
		});
		current = field(current, "cause");
	}
	const rawStack = field(error, "stack");
	// Keep only repo-relative file/line coordinates, never the message or arguments.
	const frames =
		typeof rawStack === "string"
			? rawStack
					.split("\n")
					.slice(1)
					.flatMap((line) => {
						const match = line.match(
							/(?:\/|\()((?:apps|packages)\/[\w./-]+\.(?:tsx?|[cm]?js)):(\d+):(\d+)/,
						);
						return match ? [`${match[1]}:${match[2]}:${match[3]}`] : [];
					})
					.slice(0, 12)
			: [];
	return { causes, frames };
}

export function buildAssistantDiagnostic(
	error: unknown,
	context: AssistantDiagnosticContext,
) {
	const classified = (() => {
		try {
			return classifyError(error);
		} catch {
			return classifyError(new Error("Assistant failure"));
		}
	})();
	const kind =
		context.outcome ??
		(classified.category === "authentication"
			? "signed-out"
			: classified.category === "permission"
				? "denied"
				: classified.category === "not_found"
					? "empty"
					: classified.category === "conflict"
						? "conflict"
						: classified.category === "rate_limit"
							? "limit"
							: "temporary");
	const reference = context.reference ?? createErrorReference();
	const outcome = assistantOutcomeSchema.parse({ kind, reference });
	const details = assistantTechnicalDetails(error);
	const fingerprint = createHash("sha256")
		.update(
			JSON.stringify([
				context.stage,
				context.operation,
				classified.code,
				details.causes[0]?.code,
				details.causes[0]?.status,
				details.frames[0],
			]),
		)
		.digest("hex");
	const { attempt, presentation, ...recordContext } = context;
	return {
		...recordContext,
		reference,
		fingerprint,
		code: classified.code,
		severity: ["empty", "input", "ambiguous", "cancelled", "unsupported", "attachment-too-large", "attachment-unreadable", "attachment-unsupported", "image-unsupported"].includes(kind)
			? "info"
			: classified.severity,
		publicMessage: presentation === "not-shown" ? "No error message was shown for this attempt." : presentAssistantOutcome(outcome).message,
		outcome: kind,
		details: { ...details, ...(attempt ? { attempt } : {}), ...(presentation ? { presentation } : {}) },
		environment: process.env.NODE_ENV ?? "unknown",
		release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 64) ?? null,
	};
}
