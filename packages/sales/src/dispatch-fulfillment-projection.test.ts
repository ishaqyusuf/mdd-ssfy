import { expect, test } from "bun:test";
import { dispatchFulfillmentCountAdjustment, isTrustedDispatchFulfillmentProjection } from "./dispatch-fulfillment-projection";
import { salesOrderListProjectionVersion } from "./order-list-read-model";
import { SALES_PIPELINE_CONTRACT_VERSION } from "./sales-pipeline";

test("unavailable projections contribute only canonical required order fulfillment", () => {
	expect(isTrustedDispatchFulfillmentProjection(null)).toBe(false);
	expect(dispatchFulfillmentCountAdjustment({ type: "order", deletedAt: null, listProjection: null }, { applicability: "required", state: "administratively_completed" })).toEqual({ all: 1, completed: 1 });
	expect(dispatchFulfillmentCountAdjustment({ type: "quote", deletedAt: null, listProjection: null }, { applicability: "required", state: "fulfilled" })).toEqual({ all: 0, completed: 0 });
	expect(dispatchFulfillmentCountAdjustment({ type: "order", deletedAt: null, listProjection: null }, { applicability: "not_required", state: "not_required" })).toEqual({ all: 0, completed: 0 });
});

test("reopened evidence subtracts previously counted terminal state without double counting", () => {
	const projection = { state: "ready", version: salesOrderListProjectionVersion(), pipelineContractVersion: SALES_PIPELINE_CONTRACT_VERSION, pipelineRevision: null, pipelineFulfillmentApplicability: "required", pipelineFulfillmentState: "fulfilled" };
	expect(isTrustedDispatchFulfillmentProjection(projection)).toBe(false);
	expect(dispatchFulfillmentCountAdjustment({ type: "order", deletedAt: null, listProjection: projection }, { applicability: "required", state: "packing" })).toEqual({ all: 0, completed: -1 });
	expect(isTrustedDispatchFulfillmentProjection({ ...projection, pipelineRevision: "current" })).toBe(true);
});
