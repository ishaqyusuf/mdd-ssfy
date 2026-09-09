/** Validate discovered candidates; absence never authorizes another create. */
export function identifyGithubDeliveryReceipt(input: {
	repository: string;
	actorId: number;
	incidentId: string;
	actionKey: string;
	candidates: readonly unknown[];
	issueNumber?: number;
}):
	| { status: "found"; remoteId: string; receiptId?: string }
	| { status: "unresolved" | "ambiguous" } {
	if (
		(input.issueNumber !== undefined &&
			(!Number.isSafeInteger(input.issueNumber) || input.issueNumber <= 0)) ||
		!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(input.repository) ||
		!Number.isSafeInteger(input.actorId) ||
		input.actorId <= 0 ||
		!/^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(input.incidentId) ||
		!/^[a-f0-9]{64}$/.test(input.actionKey) ||
		input.candidates.length > 100
	)
		throw new Error("Invalid GitHub receipt query");
	const markers = [
		`<!-- reliability:${input.incidentId}:start -->`,
		`<!-- reliability:${input.incidentId}:end -->`,
		`<!-- reliability-action:${input.actionKey} -->`,
	];
	const matches = new Set<string>();
	for (const candidate of input.candidates) {
		if (!candidate || typeof candidate !== "object") continue;
		const row = candidate as Record<string, unknown>;
		const author = row.user;
		const identity = input.issueNumber === undefined ? row.number : row.id;
		const expectedUrl =
			input.issueNumber === undefined
				? `https://github.com/${input.repository}/issues/${identity}`
				: `https://github.com/${input.repository}/issues/${input.issueNumber}#issuecomment-${identity}`;
		if (
			row.pull_request ||
			!Number.isSafeInteger(identity) ||
			Number(identity) <= 0 ||
			row.html_url !== expectedUrl ||
			!author ||
			typeof author !== "object" ||
			!("id" in author) ||
			author.id !== input.actorId ||
			typeof row.body !== "string" ||
			row.body.length > 60_000
		)
			continue;
		const body = row.body;
		const positions = markers.map((marker) => body.indexOf(marker));
		const [start = -1, end = -1, action = -1] = positions;
		if (
			positions.some((position) => position < 0) ||
			start >= end ||
			end >= action
		)
			continue;
		if (
			markers.some(
				(marker, index) =>
					body.indexOf(marker, (positions[index] ?? -1) + marker.length) !== -1,
			)
		)
			continue;
		matches.add(String(identity));
	}
	if (matches.size > 1) return { status: "ambiguous" };
	const remoteId = [...matches][0];
	if (remoteId && input.issueNumber !== undefined)
		return {
			status: "found",
			remoteId: String(input.issueNumber),
			receiptId: remoteId,
		};
	return remoteId ? { status: "found", remoteId } : { status: "unresolved" };
}
