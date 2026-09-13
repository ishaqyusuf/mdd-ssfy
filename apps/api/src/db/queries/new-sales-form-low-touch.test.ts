import { describe, expect, test } from "bun:test";
import {
	persistSalesRequestLowTouchFinalization,
	runLowTouchSerializableTransaction,
	runNewSalesFormTransaction,
} from "./new-sales-form";

async function querySource() {
	return Bun.file(new URL("./new-sales-form.ts", import.meta.url)).text();
}

describe("New Sales Form low-touch final-save boundary", () => {
	test("resolves authority before writes and consumes the run in the same serializable transaction", async () => {
		const source = await querySource();
		const transactionStart = source.indexOf(
			"const transactionResult = await runNewSalesFormTransaction(",
		);
		const authority = source.indexOf(
			"resolveSalesRequestFinalSaveAuthority({",
			transactionStart,
		);
		const draftRecheck = source.indexOf(
			"const concurrentDraft = await",
			transactionStart,
		);
		const firstSalesWrite = source.indexOf(
			"tx.salesOrders.create({",
			authority,
		);
		const finalization = source.indexOf(
			"persistSalesRequestLowTouchFinalization({",
			firstSalesWrite,
		);
		const transactionEnd = source.indexOf(
			"const canonical = await getNewSalesForm",
			transactionStart,
		);

		expect(transactionStart).toBeGreaterThan(-1);
		expect(authority).toBeGreaterThan(transactionStart);
		expect(draftRecheck).toBeGreaterThan(transactionStart);
		expect(draftRecheck).toBeLessThan(authority);
		expect(firstSalesWrite).toBeGreaterThan(authority);
		expect(finalization).toBeGreaterThan(firstSalesWrite);
		expect(transactionEnd).toBeGreaterThan(finalization);
		expect(source).toContain('isolationLevel: "Serializable"');
		expect(source.slice(authority, finalization)).toContain(
			'authority.authority.kind === "idempotent-replay"',
		);
	});

	test("retries only bounded serializable and unique-create conflicts", async () => {
		let attempts = 0;
		const result = await runLowTouchSerializableTransaction(async () => {
			attempts += 1;
			if (attempts < 3) throw { code: "P2034" };
			return "saved";
		});
		expect(result).toBe("saved");
		expect(attempts).toBe(3);

		let ordinaryAttempts = 0;
		await expect(
			runLowTouchSerializableTransaction(async () => {
				ordinaryAttempts += 1;
				throw new Error("not retryable");
			}),
		).rejects.toThrow("not retryable");
		expect(ordinaryAttempts).toBe(1);
	});

	test("rolls back generation consumption when the low-touch audit write fails", async () => {
		const committed = { generationConsumptions: 0, audits: 0 };
		const attempts: string[] = [];
		let options: unknown;
		const db = {
			$transaction: async (
				callback: (tx: unknown) => Promise<unknown>,
				transactionOptions: unknown,
			) => {
				options = transactionOptions;
				const working = {
					...committed,
					salesHistory: {
						create: async () => {
							attempts.push("audit");
							working.audits += 1;
							throw new Error("forced late audit failure");
						},
					},
				};
				const result = await callback(working);
				committed.generationConsumptions = working.generationConsumptions;
				committed.audits = working.audits;
				return result;
			},
		};

		await expect(
			runNewSalesFormTransaction(db, true, async (tx) => {
				await persistSalesRequestLowTouchFinalization(
					{
						tx,
						actorUserId: 17,
						salesId: 91,
						authority: {
							kind: "finalize",
							settingId: 3,
							generationId: "generation-1",
							configurationScope: "sales-request",
							configurationRevision: "configuration-1",
							promptVersion: "prompt-1",
							outputSchemaVersion: 2,
							benchmarkCorpusVersion: "corpus-1",
							benchmarkPolicyVersion: "policy-1",
							provider: "deepseek",
							model: "deepseek-v4-flash",
							commercialRevision: "commercial-1",
							commercialFingerprint: "fingerprint-1",
							permissionRevision: "permission-1",
							stockRevision: "stock-1",
						},
					},
					{
						consumeGenerationRun: async (transaction, input) => {
							attempts.push("consume");
							expect(input).toEqual({
								actorUserId: 17,
								generationId: "generation-1",
								salesId: 91,
							});
							(
								transaction as unknown as typeof committed
							).generationConsumptions += 1;
						},
					},
				);
			}),
		).rejects.toThrow("forced late audit failure");
		expect(attempts).toEqual(["consume", "audit"]);
		expect(committed).toEqual({
			generationConsumptions: 0,
			audits: 0,
		});
		expect(options).toEqual({
			isolationLevel: "Serializable",
			maxWait: 5_000,
			timeout: 30_000,
		});
	});

	test("passes the detached claim only to final-save internals", async () => {
		const source = await querySource();
		const finalSaveStart = source.indexOf(
			"export async function saveFinalNewSalesForm(",
		);
		const finalSaveEnd = source.indexOf(
			"export async function saveStorefrontSalesOrder(",
			finalSaveStart,
		);
		const finalSave = source.slice(finalSaveStart, finalSaveEnd);

		expect(finalSave).toContain(
			"splitSalesRequestLowTouchFinalSaveClaim(parsed)",
		);
		expect(finalSave).toContain(
			'saveNewSalesFormInternal(\n\t\t\tctx,\n\t\t\tpayload,\n\t\t\t"Active"',
		);
		expect(finalSave).not.toContain("payload: parsed");
		expect(finalSave).not.toContain("payload: lowTouchClaim");
		expect(source).toContain(
			"configurationScope: input.authority.configurationScope",
		);
		expect(source).toContain("_idempotentReplay: _idempotentReplay");
		expect(source).toContain(
			"return lowTouch ? runLowTouchSerializableTransaction(operation) : operation()",
		);
	});
});
