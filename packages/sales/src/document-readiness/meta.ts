import { createHash } from "node:crypto";
import type { Prisma } from "@gnd/db";
import {
	SALES_DOCUMENT_READINESS_VALIDATOR_VERSION,
	type SalesDocumentReadinessEvaluation,
	type SalesDocumentReadinessMeta,
} from "./types";

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function stableValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stableValue);
	if (!value || typeof value !== "object") return value;
	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, child]) => [key, stableValue(child)]),
	);
}

export function buildSalesDocumentReadinessSignature(
	evaluation: SalesDocumentReadinessEvaluation,
) {
	return createHash("sha256")
		.update(
			JSON.stringify(
				stableValue({
					validatorVersion: evaluation.validatorVersion,
					status: evaluation.status,
					financial: evaluation.financial,
					findings: evaluation.findings,
					operations: evaluation.operations,
				}),
			),
		)
		.digest("hex");
}

export function readSalesDocumentReadinessMeta(
	meta: unknown,
): SalesDocumentReadinessMeta | null {
	const value = record(meta).salesDocumentReadiness;
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const readiness = value as Partial<SalesDocumentReadinessMeta>;
	if (
		readiness.validatorVersion !== SALES_DOCUMENT_READINESS_VALIDATOR_VERSION ||
		!readiness.status ||
		!readiness.signature ||
		!readiness.validatedSourceUpdatedAt
	) {
		return null;
	}
	return readiness as SalesDocumentReadinessMeta;
}

export function mergeSalesDocumentReadinessMeta(
	meta: unknown,
	readiness: SalesDocumentReadinessMeta,
): Prisma.InputJsonValue {
	return {
		...record(meta),
		salesDocumentReadiness: readiness,
	} as Prisma.InputJsonValue;
}

export function clearSalesDocumentReadinessMeta(
	meta: unknown,
): Prisma.InputJsonValue {
	const current = record(meta);
	const { salesDocumentReadiness: _readiness, ...remaining } = current;
	return remaining as Prisma.InputJsonValue;
}

