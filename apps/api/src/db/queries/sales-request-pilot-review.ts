import type {
	SalesRequestPilotCurrentAuthority,
	SalesRequestPilotPeriodDecision,
} from "@api/services/sales-request-pilot-advancement";
import { evaluateSalesRequestPilotThresholds } from "@api/services/sales-request-pilot-evidence";
import {
	type SalesRequestPilotEvidenceSignoff,
	salesRequestPilotEvidenceSignoffSchema,
} from "@api/services/sales-request-pilot-evidence-signoff";
import {
	type SalesRequestPilotReviewEvidenceRecord,
	createSalesRequestPilotAuthorityDigest,
	createSalesRequestPilotEvidenceDigest,
	createSalesRequestPilotReviewPolicyDigest,
	parseSalesRequestPilotReviewEvidenceRecord,
} from "@api/services/sales-request-pilot-review";
import {
	type SalesRequestPilotThresholdPolicy,
	salesRequestPilotThresholdPolicySchema,
} from "@gnd/settings";
import { z } from "zod";

type StoredReview = {
	periodStart: Date;
	periodEnd: Date;
	decision: string;
	authority: unknown;
	authorityDigest: string;
	evidence: unknown;
	evidenceDigest: string;
	thresholdPolicy: unknown;
	thresholdPolicyDigest: string;
	thresholdPolicyVersion: string;
	signoff: unknown;
	reviewerUserId: number;
	reviewedAt: Date;
};

const digestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const authoritySchema = z
	.object({
		scope: z.string().min(1).max(256),
		configurationRevision: z.string().min(1).max(256),
		provider: z.string().min(1).max(256),
		model: z.string().min(1).max(256),
		promptVersion: z.string().min(1).max(256),
		schemaVersion: z.number().int().positive().max(10_000),
		pilotSettingsRevision: z.number().int().positive(),
		providerBenchmarkApprovalRevision: z.number().int().positive(),
	})
	.strict();
const storedReviewSchema = z
	.object({
		periodStart: z.date(),
		periodEnd: z.date(),
		decision: z.enum(["pass", "fail"]),
		authority: authoritySchema,
		authorityDigest: digestSchema,
		evidence: z.unknown(),
		evidenceDigest: digestSchema,
		thresholdPolicy: z.unknown(),
		thresholdPolicyDigest: digestSchema,
		thresholdPolicyVersion: z
			.string()
			.regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/),
		reviewerUserId: z.number().int().positive(),
		reviewedAt: z.date(),
		signoff: z.unknown(),
	})
	.strict();

export type SalesRequestPilotReviewDatabase = {
	salesRequestPilotReviewDecision: {
		create: (args: { data: Record<string, unknown> }) => Promise<StoredReview>;
		findMany: (args: Record<string, unknown>) => Promise<StoredReview[]>;
	};
};

export async function recordSalesRequestPilotReviewDecision(
	db: SalesRequestPilotReviewDatabase,
	input: {
		settingId: number;
		periodStart: Date;
		periodEnd: Date;
		decision: "pass" | "fail";
		authority: SalesRequestPilotCurrentAuthority;
		evidence: SalesRequestPilotReviewEvidenceRecord;
		evidenceDigest: string;
		thresholdPolicy: SalesRequestPilotThresholdPolicy;
		signoff: SalesRequestPilotEvidenceSignoff;
	},
) {
	if (!Number.isSafeInteger(input.settingId) || input.settingId <= 0) {
		throw new Error("A valid sales settings ID is required");
	}
	const periodStartMs = input.periodStart.getTime();
	const periodEndMs = input.periodEnd.getTime();
	if (
		!Number.isFinite(periodStartMs) ||
		!Number.isFinite(periodEndMs) ||
		input.periodStart.toISOString().slice(11) !== "00:00:00.000Z" ||
		input.periodEnd.toISOString().slice(11) !== "00:00:00.000Z" ||
		periodEndMs - periodStartMs !== 7 * 24 * 60 * 60 * 1_000
	) {
		throw new Error(
			"Pilot review period must be one exact seven-day UTC window",
		);
	}
	const {
		authorityDigest,
		thresholdPolicyDigest,
		thresholdPolicyVersion,
		...authority
	} = input.authority;
	const parsedAuthority = authoritySchema.parse(authority);
	const evidence = parseSalesRequestPilotReviewEvidenceRecord(input.evidence);
	const thresholdPolicy = salesRequestPilotThresholdPolicySchema.parse(
		input.thresholdPolicy,
	);
	const signoff = salesRequestPilotEvidenceSignoffSchema.parse(input.signoff);
	const expectedEvidenceDigest =
		createSalesRequestPilotEvidenceDigest(evidence);
	const thresholdEvaluation = evaluateSalesRequestPilotThresholds(
		evidence.evidence,
		{ thresholds: thresholdPolicy, signoff },
	);
	if (
		authorityDigest !==
			createSalesRequestPilotAuthorityDigest(parsedAuthority) ||
		input.evidenceDigest !== expectedEvidenceDigest ||
		thresholdPolicyDigest !==
			createSalesRequestPilotReviewPolicyDigest({
				provider: parsedAuthority.provider,
				model: parsedAuthority.model,
				thresholds: thresholdPolicy,
			}) ||
		thresholdPolicyVersion !== thresholdPolicy.policyVersion ||
		signoff.evidenceDigest !== expectedEvidenceDigest ||
		!signoff.authorityMatched ||
		!signoff.benchmarkPassed ||
		new Date(signoff.reviewedAt).getTime() < input.periodEnd.getTime() ||
		evidence.periodStart !== input.periodStart.toISOString().slice(0, 10) ||
		evidence.periodEnd !== input.periodEnd.toISOString().slice(0, 10) ||
		thresholdEvaluation.status === "not-evaluable" ||
		thresholdEvaluation.status !== input.decision
	) {
		throw new Error("Pilot review evidence failed integrity checks");
	}
	return db.salesRequestPilotReviewDecision.create({
		data: {
			settingId: input.settingId,
			periodStart: input.periodStart,
			periodEnd: input.periodEnd,
			decision: input.decision,
			authority: parsedAuthority,
			authorityDigest,
			evidence,
			evidenceDigest: input.evidenceDigest,
			thresholdPolicy,
			thresholdPolicyDigest,
			thresholdPolicyVersion,
			signoff,
			reviewerUserId: signoff.reviewerUserId,
			reviewedAt: new Date(signoff.reviewedAt),
		},
	});
}

function toPeriodDecision(row: StoredReview): SalesRequestPilotPeriodDecision {
	const parsed = storedReviewSchema.parse(row);
	const evidence = parseSalesRequestPilotReviewEvidenceRecord(row.evidence);
	const thresholdPolicy = salesRequestPilotThresholdPolicySchema.parse(
		row.thresholdPolicy,
	);
	const signoff = salesRequestPilotEvidenceSignoffSchema.parse(row.signoff);
	const authorityDigest = createSalesRequestPilotAuthorityDigest(
		parsed.authority,
	);
	const evidenceDigest = createSalesRequestPilotEvidenceDigest(evidence);
	const thresholdPolicyDigest = createSalesRequestPilotReviewPolicyDigest({
		provider: parsed.authority.provider,
		model: parsed.authority.model,
		thresholds: thresholdPolicy,
	});
	const thresholdEvaluation = evaluateSalesRequestPilotThresholds(
		evidence.evidence,
		{ thresholds: thresholdPolicy, signoff },
	);
	if (
		parsed.authorityDigest !== authorityDigest ||
		parsed.evidenceDigest !== evidenceDigest ||
		parsed.thresholdPolicyDigest !== thresholdPolicyDigest ||
		parsed.thresholdPolicyVersion !== thresholdPolicy.policyVersion ||
		signoff.evidenceDigest !== evidenceDigest ||
		signoff.reviewerUserId !== parsed.reviewerUserId ||
		signoff.reviewedAt !== parsed.reviewedAt.toISOString() ||
		!signoff.authorityMatched ||
		!signoff.benchmarkPassed ||
		parsed.reviewedAt.getTime() < parsed.periodEnd.getTime() ||
		evidence.periodStart !== parsed.periodStart.toISOString().slice(0, 10) ||
		evidence.periodEnd !== parsed.periodEnd.toISOString().slice(0, 10) ||
		thresholdEvaluation.status === "not-evaluable" ||
		thresholdEvaluation.status !== parsed.decision
	) {
		throw new Error("Persisted pilot review evidence failed integrity checks");
	}
	return {
		periodStart: parsed.periodStart.toISOString().slice(0, 10),
		periodEnd: parsed.periodEnd.toISOString().slice(0, 10),
		decision: parsed.decision,
		authority: parsed.authority,
		authorityDigest: parsed.authorityDigest,
		evidenceDigest: parsed.evidenceDigest,
		thresholdPolicyDigest: parsed.thresholdPolicyDigest,
		thresholdPolicyVersion: parsed.thresholdPolicyVersion,
		reviewerUserId: parsed.reviewerUserId,
		reviewedAt: parsed.reviewedAt.toISOString(),
	};
}

export async function getLatestSalesRequestPilotReviewDecisions(
	db: SalesRequestPilotReviewDatabase,
	settingId: number,
) {
	if (!Number.isSafeInteger(settingId) || settingId <= 0) {
		throw new Error("A valid sales settings ID is required");
	}
	const rows = await db.salesRequestPilotReviewDecision.findMany({
		where: { settingId },
		orderBy: { periodStart: "desc" },
		take: 2,
		select: {
			periodStart: true,
			periodEnd: true,
			decision: true,
			authority: true,
			authorityDigest: true,
			evidence: true,
			evidenceDigest: true,
			thresholdPolicy: true,
			thresholdPolicyDigest: true,
			thresholdPolicyVersion: true,
			signoff: true,
			reviewerUserId: true,
			reviewedAt: true,
		},
	});
	return rows.reverse().map(toPeriodDecision);
}
