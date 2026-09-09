const bodyLimit = 60_000;

/** Only this delimited section is owned by reliability automation. */
export function updateGithubEvidenceBlock(input: {
	incidentId: string;
	evidence: string;
	existingBody: string | null;
}) {
	if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(input.incidentId))
		throw new Error("Invalid incident marker identity");
	if (
		input.evidence.length > 20_000 ||
		/<!--\s*reliability:/i.test(input.evidence)
	)
		throw new Error("Invalid automation evidence block");
	const start = `<!-- reliability:${input.incidentId}:start -->`;
	const end = `<!-- reliability:${input.incidentId}:end -->`;
	const replacement = `${start}\n${input.evidence}\n${end}`;
	if (input.existingBody === null) return replacement;
	const body = input.existingBody;
	const first = body.indexOf(start);
	const last = body.indexOf(end);
	if (
		body.length > bodyLimit ||
		first < 0 ||
		last < first ||
		body.indexOf(start, first + start.length) !== -1 ||
		body.indexOf(end, last + end.length) !== -1
	)
		throw new Error("Ambiguous or missing automation evidence markers");
	const existingEvidence = body.slice(first + start.length, last);
	if (/<!--\s*reliability:/i.test(existingEvidence))
		throw new Error("Nested automation evidence markers");
	const updated =
		body.slice(0, first) + replacement + body.slice(last + end.length);
	if (updated.length > bodyLimit)
		throw new Error("GitHub issue body exceeds budget");
	return updated;
}
