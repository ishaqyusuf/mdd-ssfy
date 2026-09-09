import { createHash } from "node:crypto";
import { type VercelLogSource, prepareVercelLog } from "./vercel-log";

/** Installed CLI request-summary format; call only after a scoped production query. */
export function prepareVercelQueryLog(
	row: Record<string, unknown>,
	source: VercelLogSource,
	now: Date,
) {
	if (
		typeof row.id !== "string" ||
		!/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/.test(row.id)
	)
		throw new Error("Invalid Vercel request identity");
	if (!Array.isArray(row.logs) || row.logs.length > 1000)
		throw new Error("Invalid Vercel request logs");
	const nestedError = row.logs.some(
		(entry) =>
			entry &&
			typeof entry === "object" &&
			["error", "fatal"].includes(entry.level),
	);
	const origin =
		row.source === "serverless"
			? "lambda"
			: row.source === "edge-function" || row.source === "edge-middleware"
				? "edge"
				: row.source;
	const id = createHash("sha256")
		.update(JSON.stringify(["request-summary", row.deploymentId, row.id]))
		.digest("hex");
	return prepareVercelLog(
		{
			id,
			deploymentId: row.deploymentId,
			projectId: row.projectId,
			environment: row.environment,
			source: origin,
			timestamp: row.timestamp,
			level: nestedError ? "error" : row.level,
			statusCode: row.responseStatusCode,
			requestId: row.id,
			traceId: row.traceId,
		},
		source,
		now,
	);
}
