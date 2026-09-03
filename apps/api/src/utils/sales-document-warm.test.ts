import { afterEach, describe, expect, it, mock } from "bun:test";
import { queueSalesDocumentSnapshotWarmup } from "./sales-document-warm";

const triggerCalls: unknown[][] = [];
const triggerMock = mock(async (...args: unknown[]) => {
	triggerCalls.push(args);
	return { id: "trigger-run-1" };
});

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
	process.env.NODE_ENV = originalNodeEnv;
	triggerCalls.length = 0;
	triggerMock.mockClear();
});

describe("queueSalesDocumentSnapshotWarmup", () => {
	it("skips Trigger.dev snapshot warming in production", async () => {
		process.env.NODE_ENV = "production";
		const result = await queueSalesDocumentSnapshotWarmup({
			salesOrderId: 21438,
			mode: "invoice",
		});

		expect(result).toEqual({
			ok: true,
			skipped: true,
			reason: "sales_pdf_snapshot_artifacts_disabled",
			salesOrderId: 21438,
			mode: "invoice",
			dispatchId: null,
			templateId: "template-2",
		});
		expect(triggerCalls).toHaveLength(0);
	});

	it("triggers snapshot warming outside production", async () => {
		process.env.NODE_ENV = "test";
		const result = await queueSalesDocumentSnapshotWarmup(
			{
				salesOrderId: 21438,
				mode: "quote",
				templateId: "template-7",
				forceRegenerate: true,
			},
			triggerMock,
		);

		expect(result).toEqual({ id: "trigger-run-1" });
		expect(triggerCalls).toEqual([
			[
				"warm-sales-document-snapshot",
				{
					salesOrderId: 21438,
					mode: "quote",
					dispatchId: null,
					templateId: "template-7",
					forceRegenerate: true,
				},
			],
		]);
	});
});
