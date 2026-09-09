import { createHash } from "node:crypto";
import { type ReliabilityService, prepareIncidentIntake } from "./intake";

export type TriggerRunSource = {
	account: string;
	project: string;
	environmentId: string;
	fallbackOperation: string;
	operations: readonly { task: string; operation: string }[];
	service: ReliabilityService;
};
function identifier(value: unknown) {
	if (
		typeof value !== "string" ||
		!/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/.test(value)
	)
		throw new Error("Invalid Trigger identity");
	return value;
}
function date(value: unknown, now: Date) {
	const raw = value instanceof Date ? value.toISOString() : value;
	if (
		typeof raw !== "string" ||
		!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(raw)
	)
		throw new Error("Invalid Trigger timestamp");
	const result = new Date(raw);
	if (
		!Number.isFinite(now.getTime()) ||
		!Number.isFinite(result.getTime()) ||
		result.toISOString() !==
			(raw.includes(".") ? raw : raw.replace("Z", ".000Z")) ||
		result.getTime() > now.getTime() + 300_000
	)
		throw new Error("Invalid Trigger timestamp");
	return result;
}
export function prepareTriggerRun(
	input: unknown,
	source: TriggerRunSource,
	now: Date,
	context: ({ discovery: true } | { expectedRunId: string }) & {
		expectedCancellation?: boolean;
	},
) {
	if (!input || typeof input !== "object" || Array.isArray(input))
		throw new Error("Invalid Trigger run");
	const run = input as Record<string, unknown>;
	const runId = identifier(run.id);
	identifier(source.environmentId);
	if (!runId.startsWith("run_")) throw new Error("Invalid Trigger identity");
	if ("discovery" in context || run.env !== undefined) {
		const env = run.env;
		if (
			!env ||
			typeof env !== "object" ||
			!("id" in env) ||
			env.id !== source.environmentId
		)
			throw new Error("Unregistered Trigger environment");
	}
	if ("expectedRunId" in context && runId !== context.expectedRunId)
		throw new Error("Trigger run identity mismatch");
	if (run.isTest !== false) throw new Error("Trigger test or unclassified run");
	const task = identifier(run.taskIdentifier);
	const status = identifier(run.status);
	if (status.length > 40) throw new Error("Invalid Trigger status");
	const createdAt = date(run.createdAt, now);
	const updatedAt = date(run.updatedAt, now);
	if (updatedAt < createdAt) throw new Error("Invalid Trigger timestamp order");
	const failed = [
		"FAILED",
		"CRASHED",
		"SYSTEM_FAILURE",
		"EXPIRED",
		"TIMED_OUT",
	].includes(status);
	const terminal = failed || status === "COMPLETED" || status === "CANCELED";
	const occurredAt = terminal
		? date(run.finishedAt ?? run.expiredAt ?? run.updatedAt, now)
		: updatedAt;
	if (occurredAt < createdAt)
		throw new Error("Invalid Trigger timestamp order");
	const operation =
		source.operations.find((entry) => entry.task === task)?.operation ??
		source.fallbackOperation;
	const intake = prepareIncidentIntake(
		{
			provider: "trigger",
			account: source.account,
			project: source.project,
			environment: "production",
			eventId: createHash("sha256")
				.update(JSON.stringify([runId, status, occurredAt.toISOString()]))
				.digest("hex"),
			groupId: runId,
			operation,
			impact:
				status === "CANCELED" && context.expectedCancellation === true
					? "expected"
					: "unknown",
			occurredAt: occurredAt.toISOString(),
		},
		source.service,
		now,
	);
	return {
		watchKey: createHash("sha256")
			.update(
				JSON.stringify([
					source.service.id,
					source.account,
					source.project,
					"production",
					runId,
				]),
			)
			.digest("hex"),
		serviceId: source.service.id,
		account: source.account,
		project: source.project,
		environment: "production" as const,
		runId,
		providerStatus: status,
		terminal,
		providerCreatedAt: createdAt,
		providerUpdatedAt: updatedAt,
		intake: failed || status === "CANCELED" ? intake : null,
	};
}
export type PreparedTriggerRun = ReturnType<typeof prepareTriggerRun>;
