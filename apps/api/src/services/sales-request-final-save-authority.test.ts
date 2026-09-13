import { describe, expect, test } from "bun:test";
import type { SalesRequestLowTouchFinalSaveClaim } from "@api/schemas/new-sales-form";
import type { SalesRequestFinalSaveCandidate } from "@gnd/sales/sales-form/request-generation";
import {
	type SalesRequestFinalSaveAuthorityDependencies,
	resolveSalesRequestFinalSaveAuthority,
} from "./sales-request-final-save-authority";

const revision = "a".repeat(64);
const seedDigest = `h1:${"b".repeat(64)}`;

function candidate(
	patch: Partial<SalesRequestFinalSaveCandidate> = {},
): SalesRequestFinalSaveCandidate {
	return {
		type: "order",
		salesId: null,
		slug: null,
		form: {
			customerId: 10,
			customerProfileId: 20,
			billingAddressId: 30,
			shippingAddressId: 31,
			taxCode: "TAX",
			deliveryOption: "pickup",
		},
		lineItems: [
			{
				uid: "line-1",
				qty: 1,
				unitPrice: 100,
				lineTotal: 100,
				formSteps: [
					{
						stepId: 1,
						prodUid: "exterior",
						meta: {
							selectedComponents: [
								{
									id: 101,
									uid: "exterior",
									basePrice: 50,
									salesPrice: 100,
								},
							],
						},
					},
				],
			},
		],
		extraCosts: [],
		summary: {
			taxRate: 7,
			subTotal: 100,
			taxTotal: 7,
			grandTotal: 107,
			discount: 0,
			discountPct: 0,
			percentDiscountValue: 0,
			delivery: 0,
		},
		...patch,
	};
}

const claim: SalesRequestLowTouchFinalSaveClaim = {
	source: "pasted-text",
	generationId: "11111111-1111-4111-8111-111111111111",
	configurationScope: "sales-settings:7",
	configurationRevision: revision,
	provider: "openai",
	model: "gpt-5-mini",
	seed: {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "line-1",
				qty: 1,
				formSteps: [{ stepId: 1, prodUid: "exterior" }],
			},
		],
		unresolved: [],
	},
};

function dependencies(input?: {
	benchmarkCurrent?: boolean;
	consumedSalesId?: number | null;
	permissionOk?: boolean;
}) {
	const seenDb: unknown[] = [];
	const dbAware =
		<TArgs extends { db: unknown }, TResult>(result: TResult) =>
		async (args: TArgs) => {
			seenDb.push(args.db);
			return result;
		};
	const values = {
		getPilotAccess: dbAware({
			featureEnabled: true,
			pilotEnabled: true,
			eligible: true,
			cohortMember: true,
			reviewer: false,
			settingsRevision: 1,
			surface: "order" as const,
			reason: "eligible" as const,
		}),
		getConfigurationContext: async (db: unknown) => {
			seenDb.push(db);
			return {
				settingId: 7,
				scope: "sales-settings:7",
				revision,
				configuration: {
					schemaVersion: 1,
					routes: [],
					steps: [],
					visibilityByComponentUid: {},
				},
				configurationJson: "{}",
				serviceVocabularyRevision: "services",
			};
		},
		getAISettings: async (db: unknown) => {
			seenDb.push(db);
			return {
				settingId: 7,
				source: "persisted" as const,
				selection: { provider: "openai" as const, model: "gpt-5-mini" },
			};
		},
		getBenchmarkApproval: async (db: unknown) => {
			seenDb.push(db);
			return {
				settingId: 7,
				approval: { approved: true },
				approved: true,
				source: "persisted" as const,
			};
		},
		isBenchmarkCurrent: () => input?.benchmarkCurrent ?? true,
		resolveGenerationRun: dbAware({
			ok: true as const,
			issues: [] as [],
			authority: {
				generationId: claim.generationId,
				configurationScope: claim.configurationScope,
				configurationRevision: claim.configurationRevision,
				provider: claim.provider,
				model: claim.model,
				seedDigest,
				consumedSalesId: input?.consumedSalesId ?? null,
				unsupportedFactCount: 0,
				customValueCount: 0,
				unpricedItemCount: 0 as const,
			},
		}),
		resolveCommercial: dbAware({
			ok: true as const,
			issues: [] as [],
			authority: {
				schemaVersion: 1 as const,
				customerId: 10,
				customerProfileId: 20,
				billingAddressId: 30,
				shippingAddressId: 31,
				customerTaxProfileId: 40,
				taxCode: "TAX",
				coefficient: 1,
				taxPercentage: 7,
				revision: "ca1:commercial",
			},
		}),
		resolvePermission: dbAware(
			input?.permissionOk === false
				? {
						ok: false as const,
						issues: [{ code: "permission-denied" as const }],
						authority: null,
					}
				: {
						ok: true as const,
						issues: [] as [],
						authority: {
							schemaVersion: 1 as const,
							actorUserId: 42,
							surface: "order" as const,
							allowed: true as const,
							grant: "editOrders" as const,
							revision: "pa1:permission",
						},
					},
		),
		resolveStock: dbAware({
			ok: true as const,
			issues: [] as [],
			authority: {
				schemaVersion: 1 as const,
				revision: "sa1:stock",
				requirements: [],
			},
		}),
	} as unknown as SalesRequestFinalSaveAuthorityDependencies;
	return { values, seenDb };
}

function database(ids = [7]) {
	return {
		settings: { findMany: async () => ids.map((id) => ({ id })) },
	} as Parameters<typeof resolveSalesRequestFinalSaveAuthority>[0]["db"];
}

function commercial() {
	return {
		customerId: 10,
		customerProfileId: 20,
		billingAddressId: 30,
		shippingAddressId: 31,
		taxCode: "TAX",
	};
}

describe("resolveSalesRequestFinalSaveAuthority", () => {
	test("resolves every gate against the same transaction and accepts an exact native replay", async () => {
		const tx = database();
		const fixture = dependencies();
		const actual = candidate();
		const result = await resolveSalesRequestFinalSaveAuthority({
			db: tx,
			actorUserId: 42,
			claim,
			candidate: actual,
			commercial: commercial(),
			replaySeed: async () => ({ candidate: candidate(), issues: [] }),
			dependencies: fixture.values,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("Expected authority");
		expect(result.authority).toMatchObject({
			settingId: 7,
			generationId: claim.generationId,
			configurationRevision: revision,
			provider: "openai",
			model: "gpt-5-mini",
			commercialRevision: "ca1:commercial",
			permissionRevision: "pa1:permission",
			stockRevision: "sa1:stock",
		});
		expect(fixture.seenDb.length).toBe(8);
		expect(fixture.seenDb.every((value) => value === tx)).toBe(true);
	});

	test("fails before authority reads when the claim does not use the active settings row", async () => {
		const fixture = dependencies();
		const result = await resolveSalesRequestFinalSaveAuthority({
			db: database([9, 7]),
			actorUserId: 42,
			claim: { ...claim, configurationScope: "sales-settings:9" },
			candidate: candidate(),
			commercial: commercial(),
			replaySeed: async () => ({ candidate: candidate(), issues: [] }),
			dependencies: fixture.values,
		});
		expect(result).toEqual({
			ok: false,
			issues: [{ code: "configuration-stale" }],
			authority: null,
		});
		expect(fixture.seenDb).toEqual([]);
	});

	test("fails closed on duplicate settings evidence and consumed generations", async () => {
		const duplicate = dependencies();
		expect(
			await resolveSalesRequestFinalSaveAuthority({
				db: database([7, 7]),
				actorUserId: 42,
				claim,
				candidate: candidate(),
				commercial: commercial(),
				replaySeed: async () => ({ candidate: candidate(), issues: [] }),
				dependencies: duplicate.values,
			}),
		).toMatchObject({
			ok: false,
			issues: [{ code: "settings-evidence-invalid" }],
		});

		const consumed = dependencies({ consumedSalesId: 99 });
		expect(
			await resolveSalesRequestFinalSaveAuthority({
				db: database(),
				actorUserId: 42,
				claim,
				candidate: candidate(),
				commercial: commercial(),
				replaySeed: async () => ({ candidate: candidate(), issues: [] }),
				dependencies: consumed.values,
			}),
		).toMatchObject({
			ok: false,
			issues: [
				{
					code: "generation-authority-failed",
					details: ["already-consumed"],
				},
			],
		});
	});

	test("reports permission failure without attempting replay or stock", async () => {
		const fixture = dependencies({ permissionOk: false });
		let replayed = false;
		const result = await resolveSalesRequestFinalSaveAuthority({
			db: database(),
			actorUserId: 42,
			claim,
			candidate: candidate(),
			commercial: commercial(),
			replaySeed: async () => {
				replayed = true;
				return { candidate: candidate(), issues: [] };
			},
			dependencies: fixture.values,
		});
		expect(result).toMatchObject({
			ok: false,
			issues: [
				{
					code: "permission-authority-failed",
					details: ["permission-denied"],
				},
			],
		});
		expect(replayed).toBe(false);
	});

	test("rejects native replay issues and commercial fingerprint drift", async () => {
		const blocked = dependencies();
		expect(
			await resolveSalesRequestFinalSaveAuthority({
				db: database(),
				actorUserId: 42,
				claim,
				candidate: candidate(),
				commercial: commercial(),
				replaySeed: async () => ({
					candidate: null,
					issues: ["component-not-found"],
				}),
				dependencies: blocked.values,
			}),
		).toMatchObject({
			ok: false,
			issues: [
				{ code: "seed-replay-failed", details: ["component-not-found"] },
			],
		});

		const drifted = dependencies();
		const driftedLine = candidate().lineItems[0];
		if (!driftedLine) throw new Error("Expected line fixture");
		const result = await resolveSalesRequestFinalSaveAuthority({
			db: database(),
			actorUserId: 42,
			claim,
			candidate: candidate(),
			commercial: commercial(),
			replaySeed: async () => ({
				candidate: candidate({
					lineItems: [{ ...driftedLine, lineTotal: 101 }],
				}),
				issues: [],
			}),
			dependencies: drifted.values,
		});
		expect(result).toMatchObject({
			ok: false,
			issues: [
				{
					code: "preflight-blocked",
					details: ["commercial-fingerprint-mismatch"],
				},
			],
		});
	});

	test("keeps a missing benchmark approval as an explicit preflight blocker", async () => {
		const fixture = dependencies({ benchmarkCurrent: false });
		const result = await resolveSalesRequestFinalSaveAuthority({
			db: database(),
			actorUserId: 42,
			claim,
			candidate: candidate(),
			commercial: commercial(),
			replaySeed: async () => ({ candidate: candidate(), issues: [] }),
			dependencies: fixture.values,
		});
		expect(result).toMatchObject({
			ok: false,
			issues: [
				{
					code: "preflight-blocked",
					details: ["provider-benchmark-missing"],
				},
			],
		});
	});
});
