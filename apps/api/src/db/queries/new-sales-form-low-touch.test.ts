import { describe, expect, test } from "bun:test";
import { runLowTouchSerializableTransaction } from "./new-sales-form";

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
		const consumption = source.indexOf(
			"consumeSalesRequestGenerationRun(",
			firstSalesWrite,
		);
		const audit = source.indexOf("tx.salesHistory.create({", consumption);
		const transactionEnd = source.indexOf(
			"const canonical = await getNewSalesForm",
			transactionStart,
		);

		expect(transactionStart).toBeGreaterThan(-1);
		expect(authority).toBeGreaterThan(transactionStart);
		expect(draftRecheck).toBeGreaterThan(transactionStart);
		expect(draftRecheck).toBeLessThan(authority);
		expect(firstSalesWrite).toBeGreaterThan(authority);
		expect(consumption).toBeGreaterThan(firstSalesWrite);
		expect(audit).toBeGreaterThan(consumption);
		expect(transactionEnd).toBeGreaterThan(audit);
		expect(source).toContain('isolationLevel: "Serializable"');
		expect(source.slice(authority, consumption)).toContain(
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
			"configurationScope: lowTouchAuthority.configurationScope",
		);
		expect(source).toContain("_idempotentReplay: _idempotentReplay");
		expect(source).toContain(
			"return lowTouch ? runLowTouchSerializableTransaction(operation) : operation()",
		);
	});
});
