import { createHash } from "node:crypto";
import type {
	SalesRequestPilotReviewPolicy,
	SalesRequestPilotThresholdPolicy,
} from "@gnd/settings";
import { z } from "zod";
import type { SalesRequestPilotCurrentAuthority } from "./sales-request-pilot-advancement";
import {
	type SalesRequestPilotEvidence,
	salesRequestPilotEvidenceSchema,
} from "./sales-request-pilot-evidence";
import {
	type SalesRequestPilotEvidenceSignoff,
	type SalesRequestPilotEvidenceSignoffValues,
	salesRequestPilotEvidenceSignoffSchema,
	salesRequestPilotEvidenceSignoffValuesSchema,
} from "./sales-request-pilot-evidence-signoff";
import type { SalesRequestGenerationPilotAuthority } from "./sales-request-telemetry";

export const salesRequestPilotReviewSignoffInputSchema =
	salesRequestPilotEvidenceSignoffValuesSchema;

export const salesRequestPilotReviewDecisionInputSchema = z
	.object({
		periodStart: z.string().date(),
		decision: z.enum(["pass", "fail"]),
		signoff: salesRequestPilotReviewSignoffInputSchema,
	})
	.strict();

const salesRequestPilotReviewEvidenceRecordSchema = z
	.object({
		schemaVersion: z.literal(1),
		periodStart: z.string().date(),
		periodEnd: z.string().date(),
		evidence: salesRequestPilotEvidenceSchema,
	})
	.strict();

export type SalesRequestPilotReviewEvidenceRecord = Readonly<{
	schemaVersion: 1;
	periodStart: string;
	periodEnd: string;
	evidence: SalesRequestPilotEvidence;
}>;

function stableJson(value: unknown): string {
	if (value instanceof Date) return JSON.stringify(value.toISOString());
	if (value === undefined) return "undefined";
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
	const object = value as Record<string, unknown>;
	return `{${Object.keys(object)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`)
		.join(",")}}`;
}

function digest(value: unknown) {
	return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

export function createSalesRequestPilotReviewPolicyDigest(input: {
	provider: string;
	model: string;
	thresholds: SalesRequestPilotThresholdPolicy;
}) {
	return digest(input);
}

export function isSalesRequestPilotReviewPolicyCurrent(
	policy: SalesRequestPilotReviewPolicy | null | undefined,
	selection: { provider: string; model: string },
) {
	return Boolean(
		policy &&
			policy.provider === selection.provider &&
			policy.model === selection.model &&
			policy.digest ===
				createSalesRequestPilotReviewPolicyDigest({
					provider: policy.provider,
					model: policy.model,
					thresholds: policy.thresholds,
				}),
	);
}

export function createSalesRequestPilotAuthority(
	authority: SalesRequestGenerationPilotAuthority,
	policy: SalesRequestPilotReviewPolicy,
): SalesRequestPilotCurrentAuthority {
	return {
		...authority,
		authorityDigest: createSalesRequestPilotAuthorityDigest(authority),
		thresholdPolicyVersion: policy.thresholds.policyVersion,
		thresholdPolicyDigest: policy.digest,
	};
}

export function createSalesRequestPilotAuthorityDigest(
	authority: SalesRequestGenerationPilotAuthority,
) {
	return digest(authority);
}

export function createSalesRequestPilotEvidenceDigest(input: unknown) {
	return digest(input);
}

function containsForbiddenEvidenceKey(value: unknown): boolean {
	if (!value || typeof value !== "object") return false;
	if (Array.isArray(value)) return value.some(containsForbiddenEvidenceKey);
	return Object.entries(value as Record<string, unknown>).some(
		([key, nested]) =>
			/requestText|providerResponse|providerBody|email|phone|image|credential|seed/i.test(
				key,
			) || containsForbiddenEvidenceKey(nested),
	);
}

export function createSalesRequestPilotReviewEvidenceRecord(input: {
	periodStart: string;
	periodEnd: string;
	evidence: SalesRequestPilotEvidence;
}): SalesRequestPilotReviewEvidenceRecord {
	const record = salesRequestPilotReviewEvidenceRecordSchema.parse({
		schemaVersion: 1 as const,
		periodStart: z.string().date().parse(input.periodStart),
		periodEnd: z.string().date().parse(input.periodEnd),
		evidence: structuredClone(input.evidence),
	}) as SalesRequestPilotReviewEvidenceRecord;
	if (containsForbiddenEvidenceKey(record)) {
		throw new Error(
			"Pilot review evidence contains disallowed customer content",
		);
	}
	return record;
}

export function parseSalesRequestPilotReviewEvidenceRecord(value: unknown) {
	const record = salesRequestPilotReviewEvidenceRecordSchema.parse(
		value,
	) as SalesRequestPilotReviewEvidenceRecord;
	if (containsForbiddenEvidenceKey(record)) {
		throw new Error(
			"Pilot review evidence contains disallowed customer content",
		);
	}
	return record;
}

export function createSalesRequestPilotEvidenceSignoff(input: {
	reviewerUserId: number;
	reviewedAt: Date;
	evidenceDigest: string;
	authorityMatched: boolean;
	values: SalesRequestPilotEvidenceSignoffValues;
}): SalesRequestPilotEvidenceSignoff {
	const reviewedAt = new Date(
		Math.floor(input.reviewedAt.getTime() / 1_000) * 1_000,
	);
	return salesRequestPilotEvidenceSignoffSchema.parse({
		status: "verified",
		reviewerUserId: input.reviewerUserId,
		reviewedAt: reviewedAt.toISOString(),
		evidenceDigest: input.evidenceDigest,
		authorityMatched: input.authorityMatched,
		benchmarkPassed: true,
		...salesRequestPilotReviewSignoffInputSchema.parse(input.values),
	});
}
