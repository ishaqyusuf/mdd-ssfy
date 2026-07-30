export const CONTRACTOR_ISSUE_RESOLUTION_ACTIONS = [
	"opened",
	"resolved",
] as const;

export const CONTRACTOR_ISSUE_RESOLUTIONS = [
	"verified",
	"corrected_source",
	"accepted_legacy",
	"duplicate_record",
] as const;

export type ContractorIssueResolution =
	(typeof CONTRACTOR_ISSUE_RESOLUTIONS)[number];

export type ContractorIssueEvidence = {
	id: string;
	code: string;
	contractorId?: number | null;
	ledgerEntryId?: string | null;
	expectedAmount?: string | number | null;
	actualAmount?: string | number | null;
	differenceAmount?: string | number | null;
	evidence?: unknown;
};

export type ContractorIssueResolutionEvent = {
	id: number;
	userId?: number | null;
	createdAt?: Date | string | null;
	data: {
		action?: string | null;
		fingerprint?: string | null;
		note?: string | null;
		resolution?: string | null;
	};
};

function normalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(normalize);
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, item]) => [key, normalize(item)]),
		);
	}
	return value;
}

export function buildContractorIssueFingerprint(
	issue: ContractorIssueEvidence,
) {
	return JSON.stringify(
		normalize({
			id: issue.id,
			code: issue.code,
			contractorId: issue.contractorId ?? null,
			ledgerEntryId: issue.ledgerEntryId ?? null,
			expectedAmount:
				issue.expectedAmount == null ? null : String(issue.expectedAmount),
			actualAmount:
				issue.actualAmount == null ? null : String(issue.actualAmount),
			differenceAmount:
				issue.differenceAmount == null ? null : String(issue.differenceAmount),
			evidence: issue.evidence ?? null,
		}),
	);
}

export function applyContractorIssueResolution(
	issue: ContractorIssueEvidence,
	events: ContractorIssueResolutionEvent[],
) {
	const fingerprint = buildContractorIssueFingerprint(issue);
	const latest = [...events]
		.sort((left, right) => {
			const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
			const rightTime = right.createdAt
				? new Date(right.createdAt).getTime()
				: 0;
			return leftTime === rightTime ? left.id - right.id : leftTime - rightTime;
		})
		.at(-1);
	if (!latest) {
		return {
			resolutionStatus: "unreviewed" as const,
			resolutionEventId: null,
			resolutionNote: null,
			resolution: null,
			resolvedAt: null,
			resolvedById: null,
		};
	}
	const current = latest.data.fingerprint === fingerprint;
	const resolved = current && latest.data.action === "resolved";
	const opened = current && latest.data.action === "opened";
	const resolution = CONTRACTOR_ISSUE_RESOLUTIONS.includes(
		latest.data.resolution as ContractorIssueResolution,
	)
		? (latest.data.resolution as ContractorIssueResolution)
		: null;
	return {
		resolutionStatus: resolved
			? ("resolved" as const)
			: opened
				? ("in_progress" as const)
				: ("stale" as const),
		resolutionEventId: latest.id,
		resolutionNote: latest.data.note?.trim() || null,
		resolution,
		resolvedAt: resolved ? latest.createdAt || null : null,
		resolvedById: resolved ? latest.userId || null : null,
	};
}
