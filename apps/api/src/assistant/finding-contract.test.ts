import { expect, test } from "bun:test";
import { assistantOrderFinding, assistantFindingText } from "./finding-contract";

const envelope = {
	status: "success", observedAt: "2026-09-15T10:00:00.000Z",
	data: { order: { orderNo: "QA-123", type: "order", status: "pending", pipeline: { headline: { code: "in_production", label: "private SQL" } }, secret: "private credential" } },
};

test("successful native order findings retain business status without copying raw fields", () => {
	const finding = assistantOrderFinding("sales_get_order_status", envelope);
	expect(finding).toEqual({ kind: "order-status", orderNo: "QA-123", salesType: "order", status: "in_production", observedAt: envelope.observedAt });
	expect(assistantFindingText(finding!)).toBe("Order QA-123: In production.");
	expect(JSON.stringify(finding)).not.toContain("private");
	for (const status of ["failed", "denied", "requires_input", "unavailable"])
		expect(assistantOrderFinding("sales_get_order_status", { ...envelope, status })).toBeNull();
	expect(assistantOrderFinding("external_lookup", envelope)).toBeNull();
	expect(assistantOrderFinding("sales_get_order_status", { ...envelope, observedAt: "invalid" })).toBeNull();
});

test("unknown status does not become a success claim and administrative completion stays explicit", () => {
	for (const code of ["private SQL", "__proto__", "unknown"])
		expect(assistantOrderFinding("sales_get_order_status", { ...envelope, data: { order: { orderNo: "QA-123", type: "order", status: "private status", pipeline: { headline: { code } } } } })).toBeNull();
	const finding = assistantOrderFinding("sales_get_order_status", { ...envelope, data: { order: { ...envelope.data.order, pipeline: { headline: { code: "administratively_completed" } } } } });
	expect(assistantFindingText(finding!)).toBe("Order QA-123: Marked complete by your team.");
});
