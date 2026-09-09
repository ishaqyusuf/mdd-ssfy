import { expect, test } from "bun:test";
import { productionReceiptAuditJson, receiptEvidenceFingerprint, changedReceiptRows } from "./production-inbound-audit";

test("receipt evidence serializes dates and preserves zero and null for reversal", () => {
	expect(productionReceiptAuditJson({ before: { qty: 0, deletedAt: null }, after: { receivedAt: new Date("2026-09-08T00:00:00Z") } })).toEqual({
		before: { qty: 0, deletedAt: null }, after: { receivedAt: "2026-09-08T00:00:00.000Z" },
	});
});

test("oversized receipt evidence is refused rather than silently truncated", () => {
	expect(() => productionReceiptAuditJson({ text: "x".repeat(1_000_001) })).toThrow("too large");
});

test("JSON key ordering and serialized dates do not invalidate unchanged receipt evidence", () => {
	expect(receiptEvidenceFingerprint({ qty: 1, updatedAt: new Date("2026-09-08") })).toBe(receiptEvidenceFingerprint({ updatedAt: "2026-09-08T00:00:00.000Z", qty: 1 }));
	expect(changedReceiptRows([{ id: 1, qty: 1 }], [{ id: 1, qty: 1 }, { id: 2, qty: 3 }])).toEqual([{ before: undefined, after: { id: 2, qty: 3 } }]);
});
