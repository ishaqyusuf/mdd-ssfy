export function prepareVercelLogQuery(input: {
	account: string;
	project: string;
	since: Date;
	until: Date;
	limit: number;
}) {
	if (
		![input.account, input.project].every((value) =>
			/^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(value),
		) ||
		!Number.isFinite(input.since.getTime()) ||
		!Number.isFinite(input.until.getTime()) ||
		input.since >= input.until ||
		!Number.isInteger(input.limit) ||
		input.limit < 1 ||
		input.limit > 1000
	)
		throw new Error("Invalid Vercel log query");
	// Arguments for a process API, never interpolate these into a shell command.
	// Read all levels: combined level/status filters could exclude crash or 5xx logs.
	return [
		"logs",
		"--scope",
		input.account,
		"--project",
		input.project,
		"--environment",
		"production",
		"--no-branch",
		"--non-interactive",
		"--json",
		"--limit",
		String(input.limit),
		"--since",
		input.since.toISOString(),
		"--until",
		input.until.toISOString(),
	];
}

/** CLI records differ from drain records and still require their own normalization. */
export function decodeVercelLogQuery(output: Uint8Array, limit: number) {
	if (
		!Number.isInteger(limit) ||
		limit < 1 ||
		limit > 1000 ||
		output.byteLength > 2_097_152
	)
		throw new Error("Invalid Vercel query output");
	const lines = new TextDecoder("utf-8", { fatal: true })
		.decode(output)
		.split("\n")
		.filter((line) => line.trim());
	if (lines.length > limit)
		throw new Error("Vercel query output exceeded limit");
	const records = lines.map((line): Record<string, unknown> => {
		const value: unknown = JSON.parse(line);
		if (!value || typeof value !== "object" || Array.isArray(value))
			throw new Error("Invalid Vercel log record");
		return value as Record<string, unknown>;
	});
	// Below-limit is not a completeness guarantee; CLI/provider retention still applies.
	return { records, saturated: records.length === limit };
}
