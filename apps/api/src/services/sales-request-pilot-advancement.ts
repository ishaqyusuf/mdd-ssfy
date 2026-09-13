import {
	SALES_REQUEST_GENERATION_PILOT_REVIEW_PERIOD_DAYS,
	type SalesRequestGenerationPilotAuthority,
} from "./sales-request-telemetry";

const DAY_MS = 24 * 60 * 60 * 1_000;
const MAX_AUTHORITY_TEXT_LENGTH = 256;
const MAX_POLICY_VERSION_LENGTH = 64;
const MAX_SCHEMA_VERSION = 10_000;
const MAX_REVISION = 2_147_483_647;
const SHA256_DIGEST = /^sha256:[a-f0-9]{64}$/;
const ISO_UTC_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const UTC_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VERSION_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export const SALES_REQUEST_PILOT_ADVANCEMENT_MAX_PERIOD_DECISIONS = 2;

export const SALES_REQUEST_PILOT_ADVANCEMENT_BLOCKERS = [
	"current-authority-unavailable",
	"current-authority-invalid",
	"period-decisions-missing",
	"exactly-two-periods-required",
	"invalid-period-decision",
	"period-window-invalid",
	"periods-not-ascending",
	"periods-not-adjacent",
	"period-failed",
	"reviewer-invalid",
	"reviewed-at-invalid",
	"review-before-period-end",
	"authority-identity-invalid",
	"authority-identity-mismatch",
	"authority-digest-invalid",
	"authority-digest-mismatch",
	"evidence-digest-invalid",
	"threshold-policy-invalid",
	"threshold-policy-mismatch",
	"threshold-policy-digest-invalid",
	"threshold-policy-digest-mismatch",
] as const;

export type SalesRequestPilotAdvancementBlocker =
	(typeof SALES_REQUEST_PILOT_ADVANCEMENT_BLOCKERS)[number];

export type SalesRequestPilotPeriodDecision = Readonly<{
	periodStart: string;
	periodEnd: string;
	authority: Readonly<SalesRequestGenerationPilotAuthority>;
	authorityDigest: string;
	evidenceDigest: string;
	decision: "pass" | "fail";
	reviewedAt: string;
	reviewerUserId: number;
	thresholdPolicyVersion: string;
	thresholdPolicyDigest: string;
}>;

export type SalesRequestPilotCurrentAuthority = Readonly<
	SalesRequestGenerationPilotAuthority & {
		authorityDigest: string;
		thresholdPolicyVersion: string;
		thresholdPolicyDigest: string;
	}
>;

export type SalesRequestPilotAdvancementInput = Readonly<{
	periodDecisions: readonly SalesRequestPilotPeriodDecision[];
	currentAuthority: SalesRequestPilotCurrentAuthority | null | undefined;
}>;

export type SalesRequestPilotAdvancementEvaluation = Readonly<{
	eligible: boolean;
	blockers: readonly SalesRequestPilotAdvancementBlocker[];
}>;

const authorityIdentityFields = [
	"scope",
	"configurationRevision",
	"provider",
	"model",
	"promptVersion",
	"schemaVersion",
	"pilotSettingsRevision",
	"providerBenchmarkApprovalRevision",
] as const satisfies readonly (keyof SalesRequestGenerationPilotAuthority)[];

function isBoundedText(value: unknown, maximum: number): value is string {
	return (
		typeof value === "string" && value.length > 0 && value.length <= maximum
	);
}

function isPositiveRevision(value: unknown): value is number {
	return (
		Number.isSafeInteger(value) &&
		(value as number) > 0 &&
		(value as number) <= MAX_REVISION
	);
}

function isValidAuthorityIdentity(
	value: unknown,
): value is SalesRequestGenerationPilotAuthority {
	if (!value || typeof value !== "object") return false;
	const authority = value as Record<string, unknown>;
	return (
		isBoundedText(authority.scope, MAX_AUTHORITY_TEXT_LENGTH) &&
		isBoundedText(authority.configurationRevision, MAX_AUTHORITY_TEXT_LENGTH) &&
		isBoundedText(authority.provider, MAX_AUTHORITY_TEXT_LENGTH) &&
		isBoundedText(authority.model, MAX_AUTHORITY_TEXT_LENGTH) &&
		isBoundedText(authority.promptVersion, MAX_AUTHORITY_TEXT_LENGTH) &&
		Number.isSafeInteger(authority.schemaVersion) &&
		(authority.schemaVersion as number) > 0 &&
		(authority.schemaVersion as number) <= MAX_SCHEMA_VERSION &&
		isPositiveRevision(authority.pilotSettingsRevision) &&
		isPositiveRevision(authority.providerBenchmarkApprovalRevision)
	);
}

function isValidCurrentAuthority(
	value: unknown,
): value is SalesRequestPilotCurrentAuthority {
	if (!isValidAuthorityIdentity(value)) return false;
	const authority = value as Record<string, unknown>;
	return (
		SHA256_DIGEST.test(
			typeof authority.authorityDigest === "string"
				? authority.authorityDigest
				: "",
		) &&
		isValidPolicyVersion(authority.thresholdPolicyVersion) &&
		SHA256_DIGEST.test(
			typeof authority.thresholdPolicyDigest === "string"
				? authority.thresholdPolicyDigest
				: "",
		)
	);
}

function parseUtcDate(value: unknown): number | null {
	if (typeof value !== "string" || !UTC_DATE.test(value)) return null;
	const parsed = new Date(`${value}T00:00:00.000Z`);
	if (!Number.isFinite(parsed.getTime())) return null;
	return parsed.toISOString().slice(0, 10) === value ? parsed.getTime() : null;
}

function parseUtcDateTime(value: unknown): number | null {
	if (typeof value !== "string" || !ISO_UTC_DATE_TIME.test(value)) return null;
	const parsed = Date.parse(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function isValidReviewer(value: unknown): value is number {
	return Number.isSafeInteger(value) && (value as number) > 0;
}

function isValidPolicyVersion(value: unknown): value is string {
	return (
		isBoundedText(value, MAX_POLICY_VERSION_LENGTH) && VERSION_TOKEN.test(value)
	);
}

function sameAuthorityIdentity(
	left: SalesRequestGenerationPilotAuthority,
	right: SalesRequestGenerationPilotAuthority,
) {
	return authorityIdentityFields.every((field) => left[field] === right[field]);
}

function addBlocker(
	blockers: Set<SalesRequestPilotAdvancementBlocker>,
	blocker: SalesRequestPilotAdvancementBlocker,
) {
	blockers.add(blocker);
}

function orderedBlockers(
	blockers: ReadonlySet<SalesRequestPilotAdvancementBlocker>,
) {
	return SALES_REQUEST_PILOT_ADVANCEMENT_BLOCKERS.filter((blocker) =>
		blockers.has(blocker),
	);
}

function evaluation(
	blockers: ReadonlySet<SalesRequestPilotAdvancementBlocker>,
): SalesRequestPilotAdvancementEvaluation {
	const stableBlockers = orderedBlockers(blockers);
	return {
		eligible: stableBlockers.length === 0,
		blockers: stableBlockers,
	};
}

/**
 * Evaluate the two-period gate without reading or mutating persistence.
 *
 * Period end is exclusive. The input order is significant: callers must pass
 * the older period first so a reordered pair cannot accidentally look like a
 * consecutive sequence. Any invalid, missing, failed, or authority-drifting
 * period returns an ineligible result and therefore resets the sequence.
 */
export function evaluateSalesRequestPilotAdvancement(
	input: SalesRequestPilotAdvancementInput | null | undefined,
): SalesRequestPilotAdvancementEvaluation {
	const blockers = new Set<SalesRequestPilotAdvancementBlocker>();

	if (input?.currentAuthority == null) {
		addBlocker(blockers, "current-authority-unavailable");
	} else if (!isValidCurrentAuthority(input.currentAuthority)) {
		addBlocker(blockers, "current-authority-invalid");
	}

	const periodDecisions = input?.periodDecisions;
	if (!Array.isArray(periodDecisions)) {
		addBlocker(blockers, "period-decisions-missing");
		return evaluation(blockers);
	}
	if (
		periodDecisions.length !==
		SALES_REQUEST_PILOT_ADVANCEMENT_MAX_PERIOD_DECISIONS
	) {
		addBlocker(blockers, "exactly-two-periods-required");
		return evaluation(blockers);
	}

	const [first, second] = periodDecisions;
	const periodTimes = periodDecisions.map((period) => ({
		start: parseUtcDate(period?.periodStart),
		end: parseUtcDate(period?.periodEnd),
		reviewedAt: parseUtcDateTime(period?.reviewedAt),
	}));
	const firstTimes = periodTimes[0];
	const secondTimes = periodTimes[1];

	for (const period of periodDecisions) {
		if (!period || typeof period !== "object") {
			addBlocker(blockers, "invalid-period-decision");
			continue;
		}
		if (
			parseUtcDate(period.periodStart) === null ||
			parseUtcDate(period.periodEnd) === null
		) {
			addBlocker(blockers, "period-window-invalid");
		}
		if (!isValidAuthorityIdentity(period.authority)) {
			addBlocker(blockers, "authority-identity-invalid");
		}
		if (!SHA256_DIGEST.test(period.authorityDigest)) {
			addBlocker(blockers, "authority-digest-invalid");
		}
		if (!SHA256_DIGEST.test(period.evidenceDigest)) {
			addBlocker(blockers, "evidence-digest-invalid");
		}
		if (period.decision !== "pass" && period.decision !== "fail") {
			addBlocker(blockers, "invalid-period-decision");
		}
		if (!isValidReviewer(period.reviewerUserId)) {
			addBlocker(blockers, "reviewer-invalid");
		}
		if (parseUtcDateTime(period.reviewedAt) === null) {
			addBlocker(blockers, "reviewed-at-invalid");
		}
		if (!isValidPolicyVersion(period.thresholdPolicyVersion)) {
			addBlocker(blockers, "threshold-policy-invalid");
		}
		if (!SHA256_DIGEST.test(period.thresholdPolicyDigest)) {
			addBlocker(blockers, "threshold-policy-digest-invalid");
		}
	}

	if (!firstTimes || !secondTimes) {
		addBlocker(blockers, "invalid-period-decision");
	} else {
		const periodLength =
			SALES_REQUEST_GENERATION_PILOT_REVIEW_PERIOD_DAYS * DAY_MS;
		if (
			firstTimes.start === null ||
			firstTimes.end === null ||
			secondTimes.start === null ||
			secondTimes.end === null ||
			firstTimes.end - firstTimes.start !== periodLength ||
			secondTimes.end - secondTimes.start !== periodLength
		) {
			addBlocker(blockers, "period-window-invalid");
		}
		if (
			firstTimes.start !== null &&
			secondTimes.start !== null &&
			firstTimes.start >= secondTimes.start
		) {
			addBlocker(blockers, "periods-not-ascending");
		}
		if (
			firstTimes.end !== null &&
			secondTimes.start !== null &&
			firstTimes.end !== secondTimes.start
		) {
			addBlocker(blockers, "periods-not-adjacent");
		}
		if (
			(firstTimes.reviewedAt !== null &&
				firstTimes.end !== null &&
				firstTimes.reviewedAt < firstTimes.end) ||
			(secondTimes.reviewedAt !== null &&
				secondTimes.end !== null &&
				secondTimes.reviewedAt < secondTimes.end)
		) {
			addBlocker(blockers, "review-before-period-end");
		}
	}

	if (first?.decision === "fail" || second?.decision === "fail") {
		addBlocker(blockers, "period-failed");
	}

	const currentAuthority = input?.currentAuthority;
	if (isValidCurrentAuthority(currentAuthority)) {
		for (const period of periodDecisions) {
			if (!period || typeof period !== "object") continue;
			if (
				isValidAuthorityIdentity(period.authority) &&
				!sameAuthorityIdentity(period.authority, currentAuthority)
			) {
				addBlocker(blockers, "authority-identity-mismatch");
			}
			if (
				typeof period.authorityDigest === "string" &&
				period.authorityDigest !== currentAuthority.authorityDigest
			) {
				addBlocker(blockers, "authority-digest-mismatch");
			}
			if (
				typeof period.thresholdPolicyVersion === "string" &&
				period.thresholdPolicyVersion !==
					currentAuthority.thresholdPolicyVersion
			) {
				addBlocker(blockers, "threshold-policy-mismatch");
			}
			if (
				typeof period.thresholdPolicyDigest === "string" &&
				period.thresholdPolicyDigest !== currentAuthority.thresholdPolicyDigest
			) {
				addBlocker(blockers, "threshold-policy-digest-mismatch");
			}
		}
	}
	if (first && second) {
		if (
			isValidAuthorityIdentity(first.authority) &&
			isValidAuthorityIdentity(second.authority) &&
			!sameAuthorityIdentity(first.authority, second.authority)
		) {
			addBlocker(blockers, "authority-identity-mismatch");
		}
		if (
			typeof first.authorityDigest === "string" &&
			typeof second.authorityDigest === "string" &&
			first.authorityDigest !== second.authorityDigest
		) {
			addBlocker(blockers, "authority-digest-mismatch");
		}
		if (
			typeof first.thresholdPolicyVersion === "string" &&
			typeof second.thresholdPolicyVersion === "string" &&
			first.thresholdPolicyVersion !== second.thresholdPolicyVersion
		) {
			addBlocker(blockers, "threshold-policy-mismatch");
		}
		if (
			typeof first.thresholdPolicyDigest === "string" &&
			typeof second.thresholdPolicyDigest === "string" &&
			first.thresholdPolicyDigest !== second.thresholdPolicyDigest
		) {
			addBlocker(blockers, "threshold-policy-digest-mismatch");
		}
	}

	return evaluation(blockers);
}

export const evaluateConsecutiveSalesRequestPilotPeriods =
	evaluateSalesRequestPilotAdvancement;
