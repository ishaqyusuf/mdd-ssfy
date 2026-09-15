// Browser-safe cursor contract: no database runtime or private diagnostic data.
export function decodeAssistantDiagnosticCursor(value: string) {
	const match =
		/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\|(ERR-[A-Z0-9]{10})$/.exec(
			value,
		);
	if (!match) return null;
	const createdAt = new Date(match[1]!);
	if (
		!Number.isFinite(createdAt.getTime()) ||
		createdAt.toISOString() !== match[1]
	)
		return null;
	return { createdAt, reference: match[2]! };
}

export function encodeAssistantDiagnosticCursor(row: {
	createdAt: Date;
	reference: string;
}) {
	return `${row.createdAt.toISOString()}|${row.reference}`;
}
