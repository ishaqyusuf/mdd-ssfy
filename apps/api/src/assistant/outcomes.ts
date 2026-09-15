import { z } from "zod";

export const assistantOutcomeKinds = [
	"empty",
	"input",
	"ambiguous",
	"attachment-too-large",
	"upload-failed",
	"attachment-unreadable",
	"attachment-unsupported",
	"image-unsupported",
	"denied",
	"signed-out",
	"temporary",
	"partial",
	"unsupported",
	"cancelled",
	"conflict",
	"uncertain",
	"limit",
	"not-approved",
	"history-unconfirmed",
] as const;

export const assistantOutcomeSchema = z
	.object({
		kind: z.enum(assistantOutcomeKinds),
		reference: z
			.string()
			.regex(/^ERR-[A-Z0-9]{10}$/)
			.optional(),
	})
	.strict();
export type AssistantOutcome = z.infer<typeof assistantOutcomeSchema>;
export const assistantHistoryNoticeSchema = assistantOutcomeSchema.extend({ kind: z.literal("history-unconfirmed") });

/** These effects may have committed even when their response was lost. */
export function assistantEffectMayCommit(effect: string | undefined) {
	return effect === undefined || ["write", "artifact", "external_send", "destructive"].includes(effect);
}

const copy = {
	"upload-failed": { message: "I couldn't attach that file. Please try again.", action: null },
	"attachment-too-large": { message: "Please use smaller files and try again.", action: null },
	"attachment-unreadable": { message: "I couldn't read that file. Try another copy.", action: null },
	"attachment-unsupported": { message: "Please attach a PDF or image file.", action: null },
	"image-unsupported": { message: "Please attach a PDF or type the details here.", action: null },
	"history-unconfirmed": {
		message: "This reply may not be saved. Copy it before leaving this page.",
		action: null,
	},
	empty: {
		message: "I couldn't find a match. Check the details and try again.",
		action: null,
	},
	input: {
		message: "Please add a little more detail and try again.",
		action: null,
	},
	ambiguous: {
		message: "I found more than one match. Which one do you mean?",
		action: null,
	},
	denied: {
		message: "You don't have access to this information.",
		action: null,
	},
	"not-approved": {
		message: "The action wasn't approved. No changes were made.",
		action: null,
	},
	"signed-out": {
		message: "Please sign in again to continue.",
		action: "Sign in",
	},
	temporary: {
		message: "I couldn't check that right now. Please try again.",
		action: "Try again",
	},
	partial: {
		message: "Here's what I found. I couldn't check everything yet.",
		action: null,
	},
	unsupported: { message: "I can't do that yet.", action: null },
	cancelled: { message: "Stopped.", action: null },
	conflict: {
		message:
			"This information has changed. Check the latest details before continuing.",
		action: "Check latest details",
	},
	uncertain: {
		message:
			"I couldn't confirm whether that was saved. Check its status before trying again.",
		action: "Check status",
	},
	limit: {
		message: "You've reached your current limit. Please try again later.",
		action: null,
	},
} as const;

export function presentAssistantOutcome(outcome: AssistantOutcome) {
	return copy[outcome.kind];
}

// A later low-impact result must not erase a denied or uncertain action.
const outcomePriority: Record<AssistantOutcome["kind"], number> = {
	"upload-failed": 5,
	"attachment-too-large": 3,
	"attachment-unreadable": 3,
	"attachment-unsupported": 3,
	"image-unsupported": 3,
	ambiguous: 3,
	"history-unconfirmed": 5,
	empty: 1,
	unsupported: 2,
	input: 3,
	partial: 4,
	temporary: 5,
	limit: 6,
	conflict: 7,
	denied: 8,
	"not-approved": 8,
	"signed-out": 9,
	uncertain: 10,
	cancelled: 11,
};

export function mergeAssistantOutcome(
	current: AssistantOutcome | null,
	next: AssistantOutcome,
): AssistantOutcome {
	if (!current || outcomePriority[next.kind] > outcomePriority[current.kind])
		return next;
	return current;
}

export function assistantOutcomeForStatus(
	status: unknown,
): AssistantOutcome["kind"] | null {
	switch (status) {
		case "empty":
		case "not_found":
			return "empty";
		case "requires_input":
			return "input";
		case "denied":
			return "denied";
		case "partial":
			return "partial";
		case "not_implemented":
			return "unsupported";
		case "conflict":
			return "conflict";
		case "failed":
		case "unavailable":
			return "temporary";
		case "cancelled":
			return "cancelled";
		default:
			return null;
	}
}

export function assistantOutcomeFromEnvelope(
	envelope: Record<string, unknown> | null,
): AssistantOutcome["kind"] | null {
	if (!envelope) return null;
	const data =
		envelope.data && typeof envelope.data === "object"
			? (envelope.data as Record<string, unknown>)
			: null;
	if (envelope.status === "requires_input" && Array.isArray(data?.candidates) && data.candidates.length > 1)
		return "ambiguous";
	if (
		envelope.status === "unavailable" &&
		data &&
		Array.isArray(data.candidates) &&
		data.candidates.length === 0
	)
		return "empty";
	if (
		envelope.status === "success" &&
		data &&
		Array.isArray(data.items) &&
		data.items.length === 0
	)
		return "empty";
	return assistantOutcomeForStatus(envelope.status);
}

/** Error context for staff/model history contains only server-owned vocabulary. */
export function publicAssistantFailure(
	kind: AssistantOutcome["kind"],
	reference?: string,
) {
	const outcome = assistantOutcomeSchema.parse({
		kind,
		...(reference ? { reference } : {}),
	});
	return { ...outcome, message: presentAssistantOutcome(outcome).message };
}
