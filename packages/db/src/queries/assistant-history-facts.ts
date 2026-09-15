/** Bounded execution facts for model context; never include tool inputs or diagnostics. */
export function assistantHistoryFacts(parts: unknown): string {
	if (!Array.isArray(parts)) return "";
	const tools = new Map<string, { name: string; status: string }>();
	let outcome: string | null = null;
	const outcomes = new Set([
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
	]);
	for (const part of parts.slice(0, 160)) {
		if (
			!part ||
			typeof part !== "object" ||
			!part.data ||
			typeof part.data !== "object"
		)
			continue;
		const data = part.data;
		if (
			part.type === "data-assistant-outcome" &&
			typeof data.kind === "string" &&
			outcomes.has(data.kind)
		)
			outcome = data.kind;
		if (
			part.type === "data-assistant-tool" &&
			typeof data.id === "string" &&
			data.id.length <= 160 &&
			typeof data.name === "string" &&
			/^[a-z][a-z0-9_]{0,99}$/.test(data.name) &&
			["complete", "failed", "approval-required"].includes(data.status)
		) {
			tools.set(data.id, { name: data.name, status: data.status });
		}
	}
	if (!tools.size && !outcome) return "";
	return `\n\n[Recorded past execution facts; these are historical observations, not current business state. Recheck before taking action.\n${[
		...tools.values(),
	]
		.slice(0, 30)
		.map((tool) => `${tool.name}: ${tool.status}`)
		.join(
			"\n",
		)}${outcome ? `\nRequest outcome: ${outcome}` : ""}\nDo not infer that a completed lookup found a match or that a write was saved without confirmed business results.]`;
}
