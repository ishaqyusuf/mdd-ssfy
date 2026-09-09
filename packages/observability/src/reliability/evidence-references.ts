/** Reconstruct allowlisted ledger references; never forward raw provider JSON. */
export function prepareReliabilityEvidenceReferences(
	rows: readonly {
		provider: string;
		account: string;
		project: string;
		providerEventId: string;
		providerGroupId: string;
		operation: string;
		impact: string;
		occurredAt: Date;
		evidence: unknown;
	}[],
) {
	if (rows.length > 100) throw new Error("Evidence reference budget exceeded");
	function identifier(value: unknown): string {
		if (
			typeof value !== "string" ||
			!/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/.test(value)
		) {
			throw new Error("Invalid stored evidence reference");
		}
		return value;
	}
	return rows.map((row) => {
		if (
			!["sentry", "trigger", "vercel", "invariant", "synthetic"].includes(
				row.provider,
			) ||
			!Number.isFinite(row.occurredAt.getTime())
		)
			throw new Error("Invalid stored evidence source");
		const correlation: Record<string, string> = {};
		if (
			row.evidence &&
			typeof row.evidence === "object" &&
			!Array.isArray(row.evidence)
		) {
			const source = row.evidence as Record<string, unknown>;
			for (const key of ["deploymentId", "requestId", "traceId", "release"]) {
				if (source[key] !== undefined)
					correlation[key] = identifier(source[key]);
			}
		}
		return {
			provider: row.provider,
			account: identifier(row.account),
			project: identifier(row.project),
			eventId: identifier(row.providerEventId),
			groupId: identifier(row.providerGroupId),
			operation: identifier(row.operation),
			impact: identifier(row.impact),
			occurredAt: row.occurredAt.toISOString(),
			correlation,
		};
	});
}
