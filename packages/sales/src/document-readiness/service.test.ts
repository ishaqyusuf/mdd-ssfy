import { describe, expect, it, mock } from "bun:test";
import { buildSalesDocumentReadinessSignature } from "./meta";
import { prepareSalesDocumentReadiness } from "./service";
import {
	SALES_DOCUMENT_READINESS_VALIDATOR_VERSION,
	type SalesDocumentReadinessEvaluation,
} from "./types";

describe("prepareSalesDocumentReadiness", () => {
	it("uses a current readiness attestation without loading relational rows", async () => {
		const updatedAt = new Date("2026-09-01T12:00:00.000Z");
		const evaluation: SalesDocumentReadinessEvaluation = {
			status: "ready",
			salesOrderId: 77,
			orderNo: "00077AA",
			salesType: "order",
			validatorVersion: SALES_DOCUMENT_READINESS_VALIDATOR_VERSION,
			financial: {
				saved: {
					subTotalCents: 10_000,
					taxCents: 700,
					grandTotalCents: 10_700,
					amountDueCents: 10_700,
				},
				candidate: {
					subTotalCents: 10_000,
					taxCents: 700,
					grandTotalCents: 10_700,
					amountDueCents: 10_700,
				},
				subTotalDeltaCents: 0,
				totalChanged: false,
			},
			findings: [],
			operations: [],
		};
		const findUnique = mock(async () => ({
			id: 77,
			updatedAt,
			meta: {
				salesDocumentReadiness: {
					validatorVersion: SALES_DOCUMENT_READINESS_VALIDATOR_VERSION,
					status: "ready",
					signature: buildSalesDocumentReadinessSignature(evaluation),
					validatedSourceUpdatedAt: updatedAt.toISOString(),
					validatedAt: updatedAt.toISOString(),
					evaluation,
					proposal: null,
				},
			},
		}));
		const update = mock(async () => null);
		const database = {
			salesOrders: { findUnique, update },
		} as never;

		const result = await prepareSalesDocumentReadiness(database, {
			salesOrderId: 77,
		});

		expect(result.status).toBe("ready");
		expect(result.source).toBe("attestation");
		expect(findUnique).toHaveBeenCalledTimes(1);
		expect(update).not.toHaveBeenCalled();
	});
});
