import { describe, expect, test } from "bun:test";
import { saveFinalNewSalesForm } from "./new-sales-form";

describe("New Sales Form low-touch final-save boundary", () => {
	test("fails closed before database, diagnostics, or persistence while preflight is unavailable", async () => {
		let databaseRead = false;
		const ctx = {
			userId: 77,
			requestId: "test-low-touch-final-save",
			get db() {
				databaseRead = true;
				throw new Error("Database must not be reached");
			},
		};

		await expect(
			saveFinalNewSalesForm(
				ctx as Parameters<typeof saveFinalNewSalesForm>[0],
				{
					type: "order",
					salesId: null,
					slug: null,
					version: "new-low-touch-boundary",
					autosave: false,
					commitIntent: "final",
					meta: { customerId: 10, customerProfileId: 2 },
					lineItems: [],
					extraCosts: [],
					summary: {
						taxRate: 0,
						subTotal: 0,
						taxTotal: 0,
						grandTotal: 0,
					},
					lowTouchClaim: {
						source: "pasted-text",
						generationId: "11111111-1111-4111-8111-111111111111",
						configurationScope: "sales-settings:7",
						configurationRevision: "configuration-revision-1",
						provider: "openai",
						model: "gpt-5-mini",
						seed: {
							schemaVersion: 2,
							lineItems: [
								{
									uid: "generated-line-1",
									qty: 1,
									formSteps: [{ stepId: 1, prodUid: "exterior" }],
								},
							],
							unresolved: [],
						},
					},
				},
			),
		).rejects.toMatchObject({
			code: "PRECONDITION_FAILED",
			message:
				"Low-touch finalization is not enabled until its commercial preflight passes.",
		});
		expect(databaseRead).toBe(false);
	});
});
