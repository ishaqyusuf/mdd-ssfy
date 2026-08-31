import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
	DispatchPackingCommandError,
	assertPackingManifestRevision,
	canMaterializeLegacyPackingItem,
	combineInventoryPackingRequests,
	commandFingerprint,
	isPackingCommandReplay,
} from "./dispatch-packing-command";

const command = {
	dispatchId: 41,
	requestId: "pack-request-0001",
	expectedManifestRevision: "revision-0000000001",
	replaceExisting: false,
	items: [
		{
			salesItemId: 9,
			itemUid: "door-9",
			title: "Door",
			qty: { lh: 2, rh: 3 },
			note: "verified",
		},
	],
};

describe("dispatch packing command guards", () => {
	test("keeps legacy packing, inventory picking, and guarded reports inside one transaction", () => {
		const source = readFileSync(
			new URL("./dispatch-packing-command.ts", import.meta.url),
			"utf8",
		);
		const transaction = source.slice(
			source.indexOf("export async function confirmDispatchPacking"),
			source.indexOf("export async function resetDispatchPacking"),
		);
		expect(transaction).toContain("return db.$transaction(");
		expect(transaction).toContain("packDispatchItemsAction(tx");
		expect(transaction).toContain(
			"prepareAndPickDispatchInventoryInTransaction(",
		);
		expect(transaction).toContain("submitPackingReportInTransaction(");
		expect(transaction).not.toContain("prepareAndPickDispatchInventory(");
	});

	test("fingerprints byte-equivalent intent independently of item ordering", () => {
		const second = {
			...command,
			items: [
				{ salesItemId: 10, itemUid: "stock", qty: { qty: 1 } },
				...command.items,
			],
		};
		const reordered = { ...second, items: [...second.items].reverse() };
		expect(commandFingerprint(second)).toBe(commandFingerprint(reordered));
		expect(commandFingerprint({ ...command, replaceExisting: true })).not.toBe(
			commandFingerprint(command),
		);
	});

	test("accepts same-content replay and rejects request-id content reuse", () => {
		const fingerprint = commandFingerprint(command);
		const meta = {
			mobilePackingCommands: [
				{
					requestId: command.requestId,
					fingerprint,
					completedAt: "2026-08-23T10:00:00.000Z",
				},
			],
		};
		expect(isPackingCommandReplay(meta, command.requestId, fingerprint)).toBe(
			true,
		);
		expect(() =>
			isPackingCommandReplay(meta, command.requestId, "different"),
		).toThrow(DispatchPackingCommandError);
	});

	test("rejects stale revision before command mutation", () => {
		try {
			assertPackingManifestRevision("current", "stale");
			throw new Error("Expected a stale manifest error.");
		} catch (error) {
			expect(error).toBeInstanceOf(DispatchPackingCommandError);
			expect((error as DispatchPackingCommandError).message).toContain(
				"Refresh before confirming",
			);
			expect((error as DispatchPackingCommandError).manifestRevision).toBe(
				"current",
			);
		}
		expect(() => assertPackingManifestRevision("same", "same")).not.toThrow();
	});

	test("combines repeated presentation rows for one inventory sales item", () => {
		expect(
			combineInventoryPackingRequests([
				{ salesItemId: 9, itemUid: "size-a", qty: { qty: 2 } },
				{ salesItemId: 9, itemUid: "size-b", qty: { qty: 1 } },
				{ salesItemId: 10, itemUid: "handled", qty: { lh: 1, rh: 2 } },
			]),
		).toEqual([
			{ salesItemId: 9, qty: 3, lhQty: 0, rhQty: 0 },
			{ salesItemId: 10, qty: 0, lhQty: 1, rhQty: 2 },
		]);
	});

	test("materializes legacy shipping items when production is absent or false", () => {
		expect(
			canMaterializeLegacyPackingItem({ itemConfig: { shipping: true } }),
		).toBe(true);
		expect(
			canMaterializeLegacyPackingItem({
				itemConfig: { shipping: true, production: false },
			}),
		).toBe(true);
		expect(
			canMaterializeLegacyPackingItem({
				itemConfig: { shipping: true, production: true },
			}),
		).toBe(false);
	});

	test("revision ignores benign timestamp-only derived-state writes", () => {
		const source = readFileSync(
			new URL("./dispatch-packing-command.ts", import.meta.url),
			"utf8",
		);
		const revision = source.slice(
			source.indexOf("export async function getDispatchPackingCommandRevision"),
			source.indexOf("function findSaleItem"),
		);
		expect(revision).not.toContain("updatedAt: true");
	});
});
