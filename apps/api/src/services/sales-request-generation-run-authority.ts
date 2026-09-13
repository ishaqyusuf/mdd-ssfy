import { timingSafeEqual } from "node:crypto";
import type { NewSalesFormSeed } from "@gnd/sales/sales-form-core";
import { SALES_REQUEST_PROMPT_VERSION } from "@gnd/sales/sales-form/request-generation";
import { createSalesRequestSeedDigest } from "./sales-request-telemetry";

export type SalesRequestGenerationRunAuthorityDatabase = {
	salesRequestGenerationRun: {
		findMany: (args: {
			where: {
				generationId: string;
				actorUserId: number;
				deletedAt: null;
				retentionUntil: { gt: Date };
			};
			select: {
				generationId: true;
				actorUserId: true;
				scope: true;
				configurationRevision: true;
				provider: true;
				model: true;
				promptVersion: true;
				schemaVersion: true;
				seedDigest: true;
				consumedSalesId: true;
				status: true;
				hasText: true;
				completedAt: true;
				retentionUntil: true;
			};
			take: 2;
		}) => Promise<SalesRequestGenerationRunAuthorityRow[]>;
	};
};

type RevisionValue = Date | string | null;

export type SalesRequestGenerationRunAuthorityRow = {
	generationId: string;
	actorUserId: number | null;
	scope: string;
	configurationRevision: string;
	provider: string;
	model: string;
	promptVersion: string | null;
	schemaVersion: number | null;
	seedDigest: string | null;
	consumedSalesId: number | null;
	status: string;
	hasText: boolean;
	completedAt: RevisionValue;
	retentionUntil: RevisionValue;
};

export type SalesRequestGenerationRunClaim = {
	source: "pasted-text";
	generationId: string;
	configurationScope: string;
	configurationRevision: string;
	provider: string;
	model: string;
	seed: NewSalesFormSeed;
};

export type SalesRequestGenerationRunAuthorityIssueCode =
	| "actor-invalid"
	| "generation-id-invalid"
	| "generation-not-found"
	| "generation-ambiguous"
	| "generation-unavailable"
	| "generation-identity-stale"
	| "generation-prompt-stale"
	| "generation-schema-stale"
	| "generation-seed-binding-invalid"
	| "generation-seed-binding-mismatch";

export type SalesRequestGenerationRunAuthorityResult =
	| {
			ok: true;
			issues: [];
			authority: {
				generationId: string;
				configurationScope: string;
				configurationRevision: string;
				provider: string;
				model: string;
				seedDigest: string;
				consumedSalesId: number | null;
				unsupportedFactCount: number;
				customValueCount: number;
				unpricedItemCount: 0;
			};
	  }
	| {
			ok: false;
			issues: Array<{ code: SalesRequestGenerationRunAuthorityIssueCode }>;
			authority: null;
	  };

function issue(code: SalesRequestGenerationRunAuthorityIssueCode) {
	return { code } as const;
}

function positiveInteger(value: unknown): value is number {
	return Number.isSafeInteger(value) && Number(value) > 0;
}

function uuid(value: unknown): value is string {
	return (
		typeof value === "string" &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			value,
		)
	);
}

function validDigest(value: unknown): value is string {
	return typeof value === "string" && /^h1:[a-f0-9]{64}$/.test(value);
}

function timestamp(value: RevisionValue) {
	const parsed = value instanceof Date ? value : value ? new Date(value) : null;
	return parsed && Number.isFinite(parsed.getTime()) ? parsed.getTime() : null;
}

function sameDigest(left: string, right: string) {
	if (!validDigest(left) || !validDigest(right)) return false;
	return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function customValueCount(seed: NewSalesFormSeed) {
	return seed.lineItems.reduce(
		(total, line) =>
			total + line.formSteps.filter((step) => "value" in step).length,
		0,
	);
}

/**
 * Resolve the retained metadata-only generation evidence for final-save
 * preflight. The seed is supplied by the strict ephemeral claim and is only used
 * to replay the server-keyed HMAC; it is never read from or written to telemetry.
 */
export async function resolveSalesRequestGenerationRunAuthority(input: {
	db: SalesRequestGenerationRunAuthorityDatabase;
	actorUserId: number;
	claim: SalesRequestGenerationRunClaim;
	now?: Date;
	createSeedDigest?: typeof createSalesRequestSeedDigest;
}): Promise<SalesRequestGenerationRunAuthorityResult> {
	if (!positiveInteger(input.actorUserId)) {
		return { ok: false, issues: [issue("actor-invalid")], authority: null };
	}
	if (!uuid(input.claim.generationId)) {
		return {
			ok: false,
			issues: [issue("generation-id-invalid")],
			authority: null,
		};
	}
	const now = input.now ?? new Date();
	const rows = await input.db.salesRequestGenerationRun.findMany({
		where: {
			generationId: input.claim.generationId,
			actorUserId: input.actorUserId,
			deletedAt: null,
			retentionUntil: { gt: now },
		},
		select: {
			generationId: true,
			actorUserId: true,
			scope: true,
			configurationRevision: true,
			provider: true,
			model: true,
			promptVersion: true,
			schemaVersion: true,
			seedDigest: true,
			consumedSalesId: true,
			status: true,
			hasText: true,
			completedAt: true,
			retentionUntil: true,
		},
		take: 2,
	});
	if (rows.length === 0) {
		return {
			ok: false,
			issues: [issue("generation-not-found")],
			authority: null,
		};
	}
	if (rows.length !== 1) {
		return {
			ok: false,
			issues: [issue("generation-ambiguous")],
			authority: null,
		};
	}

	const row = rows[0];
	if (!row) {
		return {
			ok: false,
			issues: [issue("generation-not-found")],
			authority: null,
		};
	}
	const issues: Array<{ code: SalesRequestGenerationRunAuthorityIssueCode }> =
		[];
	if (
		row.status !== "succeeded" ||
		row.hasText !== true ||
		timestamp(row.completedAt) == null ||
		(timestamp(row.retentionUntil) ?? 0) <= now.getTime() ||
		!validDigest(row.seedDigest) ||
		(row.consumedSalesId != null && !positiveInteger(row.consumedSalesId))
	) {
		issues.push(issue("generation-unavailable"));
	}
	if (
		row.generationId !== input.claim.generationId ||
		row.actorUserId !== input.actorUserId ||
		row.scope !== input.claim.configurationScope ||
		row.configurationRevision !== input.claim.configurationRevision ||
		row.provider !== input.claim.provider ||
		row.model !== input.claim.model
	) {
		issues.push(issue("generation-identity-stale"));
	}
	if (row.promptVersion !== SALES_REQUEST_PROMPT_VERSION) {
		issues.push(issue("generation-prompt-stale"));
	}
	if (row.schemaVersion !== input.claim.seed.schemaVersion) {
		issues.push(issue("generation-schema-stale"));
	}

	let replayedDigest: string | null = null;
	try {
		replayedDigest = (input.createSeedDigest ?? createSalesRequestSeedDigest)({
			seed: input.claim.seed,
			generationId: input.claim.generationId,
			configurationScope: input.claim.configurationScope,
			configurationRevision: input.claim.configurationRevision,
		});
		if (!validDigest(replayedDigest)) {
			issues.push(issue("generation-seed-binding-invalid"));
		} else if (
			!validDigest(row.seedDigest) ||
			!sameDigest(row.seedDigest, replayedDigest)
		) {
			issues.push(issue("generation-seed-binding-mismatch"));
		}
	} catch {
		issues.push(issue("generation-seed-binding-invalid"));
	}

	if (issues.length > 0 || !replayedDigest || !validDigest(replayedDigest)) {
		return { ok: false, issues, authority: null };
	}
	return {
		ok: true,
		issues: [],
		authority: {
			generationId: row.generationId,
			configurationScope: row.scope,
			configurationRevision: row.configurationRevision,
			provider: row.provider,
			model: row.model,
			seedDigest: replayedDigest,
			consumedSalesId: row.consumedSalesId,
			unsupportedFactCount: input.claim.seed.unresolved.length,
			customValueCount: customValueCount(input.claim.seed),
			// Structural AI output is intentionally price-free. The native candidate
			// price checks in final-save preflight are the authoritative proof.
			unpricedItemCount: 0,
		},
	};
}
