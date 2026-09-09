import { createHash } from "node:crypto";

export type ReliabilityProvider =
	| "sentry"
	| "trigger"
	| "vercel"
	| "invariant"
	| "synthetic";

export type ReliabilityService = {
	id: string;
	owner: string;
	operations: readonly string[];
	sources: readonly {
		provider: ReliabilityProvider;
		account: string;
		project: string;
	}[];
};

export type ReliabilityImpact =
	| "unknown"
	| "isolated"
	| "workflow_blocked"
	| "data_corruption"
	| "duplicate_financial_effect"
	| "security_compromise"
	| "widespread_outage"
	| "expected";
export type ReliabilitySeverity = "P0" | "P1" | "P2" | "INFO";

function classifyImpact(value: unknown): {
	impact: ReliabilityImpact;
	severity: ReliabilitySeverity;
	status: "NEEDS_INVESTIGATION" | "DETECTED" | "NOT_ACTIONABLE";
} {
	switch (value) {
		case "data_corruption":
		case "duplicate_financial_effect":
		case "security_compromise":
		case "widespread_outage":
			return { impact: value, severity: "P0", status: "DETECTED" };
		case "workflow_blocked":
			return { impact: value, severity: "P1", status: "DETECTED" };
		case "isolated":
			return { impact: value, severity: "P2", status: "DETECTED" };
		case "unknown":
			return { impact: value, severity: "P2", status: "NEEDS_INVESTIGATION" };
		case "expected":
			return { impact: value, severity: "INFO", status: "NOT_ACTIONABLE" };
		default:
			throw new Error("Invalid reliability impact");
	}
}

function requiredIdentifier(value: unknown, field: string): string {
	if (
		typeof value !== "string" ||
		!/^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,159}$/.test(value)
	) {
		throw new Error(`Invalid reliability ${field}`);
	}
	return value;
}

function identity(parts: readonly string[]) {
	return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

export function prepareIncidentIntake(
	input: unknown,
	service: ReliabilityService,
	now: Date,
) {
	if (!input || typeof input !== "object" || Array.isArray(input)) {
		throw new Error("Invalid reliability event");
	}
	const data = input as Record<string, unknown>;
	const provider = requiredIdentifier(data.provider, "provider");
	const account = requiredIdentifier(data.account, "account");
	const project = requiredIdentifier(data.project, "project");
	const source = service.sources.find(
		(entry) =>
			entry.provider === provider &&
			entry.account === account &&
			entry.project === project,
	);
	if (!source || data.environment !== "production") {
		throw new Error("Unregistered reliability source");
	}
	const operation = requiredIdentifier(data.operation, "operation");
	if (!service.operations.includes(operation)) {
		throw new Error("Unregistered reliability operation");
	}
	const eventId = requiredIdentifier(data.eventId, "eventId");
	const groupId = requiredIdentifier(data.groupId, "groupId");
	const serviceId = requiredIdentifier(service.id, "serviceId");
	const owner = requiredIdentifier(service.owner, "owner");
	const timestamp = data.occurredAt;
	if (
		typeof timestamp !== "string" ||
		!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(timestamp)
	) {
		throw new Error("Invalid reliability occurrence time");
	}
	const occurredAt = new Date(timestamp);
	const canonicalTimestamp = timestamp.includes(".")
		? timestamp
		: timestamp.replace("Z", ".000Z");
	if (
		!Number.isFinite(now.getTime()) ||
		!Number.isFinite(occurredAt.getTime()) ||
		occurredAt.toISOString() !== canonicalTimestamp ||
		occurredAt.getTime() > now.getTime() + 300_000
	) {
		throw new Error("Invalid reliability occurrence time");
	}
	const { impact, severity, status } = classifyImpact(data.impact);
	const scope = [provider, account, project, "production"];
	const evidence: Record<string, string> = {};
	if (
		data.evidence &&
		typeof data.evidence === "object" &&
		!Array.isArray(data.evidence)
	) {
		const fields = data.evidence as Record<string, unknown>;
		for (const key of [
			"deploymentId",
			"requestId",
			"traceId",
			"release",
		] as const) {
			if (fields[key] !== undefined)
				evidence[key] = requiredIdentifier(fields[key], key);
		}
	}
	return {
		occurrence: {
			key: identity([...scope, eventId]),
			provider: source.provider,
			account,
			project,
			environment: "production" as const,
			eventId,
			groupId,
			operation,
			impact,
			occurredAt: occurredAt.toISOString(),
			...(Object.keys(evidence).length ? { evidence } : {}),
		},
		incident: {
			problemKey: identity([...scope, serviceId, groupId]),
			serviceId,
			owner,
			severity,
			status,
		},
	};
}

export type PreparedIncidentIntake = ReturnType<typeof prepareIncidentIntake>;
