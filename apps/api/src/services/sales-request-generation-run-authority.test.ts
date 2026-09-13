import { describe, expect, test } from "bun:test";
import { SALES_REQUEST_PROMPT_VERSION } from "@gnd/sales/sales-form/request-generation";
import {
	type SalesRequestGenerationRunAuthorityDatabase,
	type SalesRequestGenerationRunAuthorityRow,
	resolveSalesRequestGenerationRunAuthority,
} from "./sales-request-generation-run-authority";

const generationId = "4d4c4345-b152-4b83-9b45-21138fbf22f3";
const digest = `h1:${"a".repeat(64)}`;
const claim = {
	source: "pasted-text" as const,
	generationId,
	configurationScope: "sales-settings:1",
	configurationRevision: "revision-1",
	provider: "openai",
	model: "gpt-5-mini",
	seed: {
		schemaVersion: 2 as const,
		lineItems: [
			{
				uid: "line-1",
				qty: 1,
				formSteps: [{ stepId: 1, componentUid: "door-1" }],
			},
		],
		unresolved: [],
	},
};

function row(
	patch: Partial<SalesRequestGenerationRunAuthorityRow> = {},
): SalesRequestGenerationRunAuthorityRow {
	return {
		generationId,
		actorUserId: 7,
		scope: claim.configurationScope,
		configurationRevision: claim.configurationRevision,
		provider: claim.provider,
		model: claim.model,
		promptVersion: SALES_REQUEST_PROMPT_VERSION,
		schemaVersion: claim.seed.schemaVersion,
		seedDigest: digest,
		consumedSalesId: null,
		status: "succeeded",
		hasText: true,
		completedAt: new Date("2026-09-13T12:00:00.000Z"),
		retentionUntil: new Date("2026-12-12T12:00:00.000Z"),
		...patch,
	};
}

function database(
	rows: SalesRequestGenerationRunAuthorityRow[],
	onRead?: (args: unknown) => void,
): SalesRequestGenerationRunAuthorityDatabase {
	return {
		salesRequestGenerationRun: {
			findMany: async (args) => {
				onRead?.(args);
				return rows;
			},
		},
	};
}

const resolve = (
	rows: SalesRequestGenerationRunAuthorityRow[],
	patch: Partial<
		Parameters<typeof resolveSalesRequestGenerationRunAuthority>[0]
	> = {},
) =>
	resolveSalesRequestGenerationRunAuthority({
		db: database(rows),
		actorUserId: 7,
		claim,
		now: new Date("2026-09-13T13:00:00.000Z"),
		createSeedDigest: () => digest,
		...patch,
	});

describe("Sales Request generation-run authority", () => {
	test("replays exact retained metadata without exposing request or provider data", async () => {
		let query: unknown;
		const result = await resolveSalesRequestGenerationRunAuthority({
			db: database([row()], (args) => {
				query = args;
			}),
			actorUserId: 7,
			claim,
			now: new Date("2026-09-13T13:00:00.000Z"),
			createSeedDigest: () => digest,
		});

		expect(result).toEqual({
			ok: true,
			issues: [],
			authority: {
				generationId,
				configurationScope: claim.configurationScope,
				configurationRevision: claim.configurationRevision,
				provider: claim.provider,
				model: claim.model,
				seedDigest: digest,
				consumedSalesId: null,
				unsupportedFactCount: 0,
				customValueCount: 0,
				unpricedItemCount: 0,
			},
		});
		expect(query).toMatchObject({
			where: {
				generationId,
				actorUserId: 7,
				deletedAt: null,
				retentionUntil: { gt: new Date("2026-09-13T13:00:00.000Z") },
			},
			take: 2,
		});
		expect(JSON.stringify(result)).not.toContain("request");
		expect(JSON.stringify(result)).not.toContain("response");
	});

	test("rejects invalid identity without reading telemetry", async () => {
		let reads = 0;
		const result = await resolveSalesRequestGenerationRunAuthority({
			db: database([], () => {
				reads += 1;
			}),
			actorUserId: 0,
			claim: { ...claim, generationId: "not-a-uuid" },
			createSeedDigest: () => digest,
		});
		expect(result).toEqual({
			ok: false,
			issues: [{ code: "actor-invalid" }],
			authority: null,
		});
		expect(reads).toBe(0);
	});

	test("rejects missing and ambiguous retained runs", async () => {
		expect(await resolve([])).toEqual({
			ok: false,
			issues: [{ code: "generation-not-found" }],
			authority: null,
		});
		expect(await resolve([row(), row()])).toEqual({
			ok: false,
			issues: [{ code: "generation-ambiguous" }],
			authority: null,
		});
	});

	test("rejects incomplete, invalid-consumption, and malformed binding state", async () => {
		const result = await resolve([
			row({
				status: "started",
				hasText: false,
				completedAt: null,
				seedDigest: "private seed content",
				consumedSalesId: -1,
			}),
		]);
		expect(result).toEqual({
			ok: false,
			issues: [
				{ code: "generation-unavailable" },
				{ code: "generation-seed-binding-mismatch" },
			],
			authority: null,
		});
	});

	test("post-validates returned retention evidence instead of trusting query filtering", async () => {
		const result = await resolve([
			row({ retentionUntil: new Date("2026-09-13T12:59:59.000Z") }),
		]);
		expect(result).toEqual({
			ok: false,
			issues: [{ code: "generation-unavailable" }],
			authority: null,
		});
	});

	test("rejects stale generation identity, prompt, and schema in deterministic order", async () => {
		const result = await resolve([
			row({
				actorUserId: 8,
				scope: "other-scope",
				configurationRevision: "other-revision",
				provider: "anthropic",
				model: "claude-sonnet-4-5",
				promptVersion: "old-prompt",
				schemaVersion: 1,
			}),
		]);
		expect(result).toEqual({
			ok: false,
			issues: [
				{ code: "generation-identity-stale" },
				{ code: "generation-prompt-stale" },
				{ code: "generation-schema-stale" },
			],
			authority: null,
		});
	});

	test("rejects seed changes and digest failures", async () => {
		expect(
			await resolve([row()], {
				createSeedDigest: () => `h1:${"b".repeat(64)}`,
			}),
		).toEqual({
			ok: false,
			issues: [{ code: "generation-seed-binding-mismatch" }],
			authority: null,
		});
		expect(
			await resolve([row()], {
				createSeedDigest: () => {
					throw new Error("secret unavailable");
				},
			}),
		).toEqual({
			ok: false,
			issues: [{ code: "generation-seed-binding-invalid" }],
			authority: null,
		});
	});

	test("derives unsupported and custom counts only from the strict claimed seed", async () => {
		const customClaim = structuredClone(claim);
		customClaim.seed.unresolved.push({
			lineUid: "line-1",
			status: "unsupported",
			reason: "Unsupported request",
		});
		customClaim.seed.lineItems[0]?.formSteps.push({
			stepId: 2,
			value: "Custom jamb",
		});
		const result = await resolveSalesRequestGenerationRunAuthority({
			db: database([row()]),
			actorUserId: 7,
			claim: customClaim,
			createSeedDigest: () => digest,
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.authority.unsupportedFactCount).toBe(1);
			expect(result.authority.customValueCount).toBe(1);
		}
	});
});
