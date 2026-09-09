import { type ReliabilityService, prepareIncidentIntake } from "./intake";

export type VercelLogSource = {
	account: string;
	project: string;
	operation: string;
	service: ReliabilityService;
};

/** Normalize only authenticated records; the drain secret binds the account. */
export function prepareVercelLog(
	log: Record<string, unknown>,
	source: VercelLogSource,
	now: Date,
) {
	if (log.projectId !== source.project)
		throw new Error("Unregistered Vercel project");
	if (log.environment === "preview") return null;
	if (log.environment !== "production")
		throw new Error("Unverified Vercel environment");
	if (
		typeof log.timestamp !== "number" ||
		!Number.isSafeInteger(log.timestamp) ||
		log.timestamp < 0 ||
		!Number.isFinite(new Date(log.timestamp).getTime())
	)
		throw new Error("Invalid Vercel timestamp");
	if (
		typeof log.deploymentId !== "string" ||
		!/^[A-Za-z0-9_-]{1,160}$/.test(log.deploymentId)
	)
		throw new Error("Invalid Vercel deployment");
	if (
		![
			"build",
			"edge",
			"lambda",
			"static",
			"external",
			"firewall",
			"redirect",
		].includes(String(log.source))
	)
		throw new Error("Invalid Vercel source");
	const proxy =
		log.proxy && typeof log.proxy === "object" && !Array.isArray(log.proxy)
			? (log.proxy as Record<string, unknown>)
			: {};
	const is5xx = (value: unknown) =>
		typeof value === "number" &&
		Number.isInteger(value) &&
		value >= 500 &&
		value <= 599;
	const actionable =
		log.level === "error" ||
		log.level === "fatal" ||
		is5xx(log.statusCode) ||
		is5xx(proxy.statusCode) ||
		(log.source === "lambda" && log.statusCode === -1);
	if (
		log.traceId !== undefined &&
		log["trace.id"] !== undefined &&
		log.traceId !== log["trace.id"]
	)
		throw new Error("Conflicting Vercel trace identity");
	const traceId = log.traceId ?? log["trace.id"];
	// Native log IDs preserve occurrence identity. Cross-log grouping requires
	// later evidence correlation; do not merge unrelated errors by deployment alone.
	const intake = prepareIncidentIntake(
		{
			provider: "vercel",
			account: source.account,
			project: source.project,
			environment: "production",
			eventId: log.id,
			groupId: log.id,
			operation: source.operation,
			impact: "unknown",
			occurredAt: new Date(log.timestamp).toISOString(),
			evidence: {
				deploymentId: log.deploymentId,
				...(typeof log.requestId === "string"
					? { requestId: log.requestId }
					: {}),
				...(typeof traceId === "string" ? { traceId } : {}),
			},
		},
		source.service,
		now,
	);
	return actionable ? intake : null;
}
