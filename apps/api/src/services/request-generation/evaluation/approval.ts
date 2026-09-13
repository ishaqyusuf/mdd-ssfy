import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import type { SalesRequestAIProvider } from "@gnd/settings";
import { z } from "zod";
import type { SalesRequestEvaluationPricingSnapshot } from "./pricing";

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const approvalDigestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

const approvalScopeSchema = z
	.object({
		runId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
		caseId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
		provider: z.enum(["openai", "anthropic", "deepseek", "google"]),
		model: z.string().trim().min(1).max(160),
		settingId: z.number().int().positive(),
		configurationRevision: sha256Schema,
		promptVersion: z.string().trim().min(1).max(128),
		outputContract: z.literal("new-sales-form-seed-v2"),
		serviceVocabularyRevision: sha256Schema,
		maxOutputTokens: z.number().int().positive(),
		maxRetries: z.literal(0),
		providerTimeoutMs: z.number().int().positive(),
		pricingEffectiveAt: z.string().date(),
		pricingCurrency: z.string().regex(/^[A-Z]{3}$/),
		pricingSourceDigest: approvalDigestSchema,
		maxEstimatedCallCostMicros: z.number().int().nonnegative(),
		imageEvaluation: z.literal("deferred"),
		approvedCallLimit: z.literal(1),
	})
	.strict();

const artifactSha256Schema = z
	.object({
		configuration: sha256Schema,
		configurationSource: sha256Schema,
		factExpectations: sha256Schema,
		modelInput: sha256Schema,
		evaluationRuntimeLock: sha256Schema,
		pricingSnapshot: sha256Schema,
		pricingSource: sha256Schema,
		providerOracle: sha256Schema,
		providerRuntimeOptions: sha256Schema,
		request: sha256Schema,
		seedOracle: sha256Schema,
	})
	.strict();

export const salesRequestEvaluationApprovalPacketSchema = z
	.object({
		schemaVersion: z.literal(1),
		status: z.literal("pending-explicit-approval"),
		scope: approvalScopeSchema,
		artifactSha256: artifactSha256Schema,
		approvalDigest: approvalDigestSchema,
	})
	.strict();

export type SalesRequestEvaluationApprovalPacket = z.infer<
	typeof salesRequestEvaluationApprovalPacketSchema
>;

export type SalesRequestEvaluationApprovalArtifacts = Record<
	keyof SalesRequestEvaluationApprovalPacket["artifactSha256"],
	string
>;

function sha256(value: string) {
	return createHash("sha256").update(value).digest("hex");
}

function stableStringify(value: unknown): string {
	if (value === undefined) return "undefined";
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
	const record = value as Record<string, unknown>;
	return `{${Object.keys(record)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
		.join(",")}}`;
}

export function createSalesRequestEvaluationApprovalPacket(input: {
	runId: string;
	caseId: string;
	provider: SalesRequestAIProvider;
	model: string;
	settingId: number;
	configurationRevision: string;
	promptVersion: string;
	outputContract: "new-sales-form-seed-v2";
	serviceVocabularyRevision: string;
	maxOutputTokens: number;
	maxRetries: 0;
	providerTimeoutMs: number;
	pricingSnapshot: SalesRequestEvaluationPricingSnapshot;
	artifacts: SalesRequestEvaluationApprovalArtifacts;
}): SalesRequestEvaluationApprovalPacket {
	const unsigned = {
		schemaVersion: 1 as const,
		status: "pending-explicit-approval" as const,
		scope: {
			runId: input.runId,
			caseId: input.caseId,
			provider: input.provider,
			model: input.model,
			settingId: input.settingId,
			configurationRevision: input.configurationRevision,
			promptVersion: input.promptVersion,
			outputContract: input.outputContract,
			serviceVocabularyRevision: input.serviceVocabularyRevision,
			maxOutputTokens: input.maxOutputTokens,
			maxRetries: input.maxRetries,
			providerTimeoutMs: input.providerTimeoutMs,
			pricingEffectiveAt: input.pricingSnapshot.effectiveAt,
			pricingCurrency: input.pricingSnapshot.currency,
			pricingSourceDigest: input.pricingSnapshot.sourceDigest,
			maxEstimatedCallCostMicros:
				input.pricingSnapshot.maxEstimatedCallCostMicros,
			imageEvaluation: "deferred" as const,
			approvedCallLimit: 1 as const,
		},
		artifactSha256: Object.fromEntries(
			Object.entries(input.artifacts).map(([name, value]) => [
				name,
				sha256(value),
			]),
		) as SalesRequestEvaluationApprovalPacket["artifactSha256"],
	};
	return salesRequestEvaluationApprovalPacketSchema.parse({
		...unsigned,
		approvalDigest: `sha256:${sha256(stableStringify(unsigned))}`,
	});
}

export function assertSalesRequestEvaluationApproval(input: {
	archivedPacket: unknown;
	expectedPacket: SalesRequestEvaluationApprovalPacket;
	approvedDigest: string | undefined;
}) {
	const archived = salesRequestEvaluationApprovalPacketSchema.parse(
		input.archivedPacket,
	);
	if (!input.approvedDigest) {
		throw new Error(
			"Live evaluation requires --approved-digest from the reviewed prepare-only packet.",
		);
	}
	if (
		input.approvedDigest !== input.expectedPacket.approvalDigest ||
		archived.approvalDigest !== input.expectedPacket.approvalDigest ||
		stableStringify(archived) !== stableStringify(input.expectedPacket)
	) {
		throw new Error(
			"The live evaluation does not match the explicitly approved prepare-only packet.",
		);
	}
	return archived;
}

export function verifySalesRequestEvaluationApprovalPacket(input: {
	packet: unknown;
	approvedDigest: string;
}) {
	const packet = salesRequestEvaluationApprovalPacketSchema.parse(input.packet);
	const { approvalDigest, ...unsigned } = packet;
	const recomputed = `sha256:${sha256(stableStringify(unsigned))}`;
	if (
		input.approvedDigest !== approvalDigest ||
		recomputed !== approvalDigest
	) {
		throw new Error(
			"Benchmark evidence does not match the independently approved digest",
		);
	}
	return packet;
}

export async function consumeSalesRequestEvaluationApproval(input: {
	path: string;
	packet: SalesRequestEvaluationApprovalPacket;
	now?: Date;
}) {
	const evidence = {
		schemaVersion: 1 as const,
		runId: input.packet.scope.runId,
		caseId: input.packet.scope.caseId,
		provider: input.packet.scope.provider,
		model: input.packet.scope.model,
		approvalDigest: input.packet.approvalDigest,
		approvedCallLimit: 1 as const,
		consumedAt: (input.now ?? new Date()).toISOString(),
	};
	try {
		await writeFile(input.path, `${JSON.stringify(evidence, null, 2)}\n`, {
			flag: "wx",
		});
	} catch (error) {
		if ((error as { code?: string }).code === "EEXIST") {
			throw new Error(
				"This prepare-only approval was already consumed; prepare and approve a new packet before another paid call.",
			);
		}
		throw error;
	}
	return evidence;
}
