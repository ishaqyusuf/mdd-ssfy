import { salesOrderListProjectionVersion } from "./order-list-read-model";
import { SALES_PIPELINE_CONTRACT_VERSION, isSalesPipelineFulfillmentCompleted, type SalesPipelineSnapshot } from "./sales-pipeline";

type FulfillmentProjection = {
	state: string;
	version: number;
	pipelineContractVersion: string | null;
	pipelineRevision: string | null;
	pipelineFulfillmentApplicability: string | null;
	pipelineFulfillmentState: string | null;
};

export function isTrustedDispatchFulfillmentProjection(projection: FulfillmentProjection | null | undefined) {
	return Boolean(projection && projection.state === "ready" &&
		projection.version === salesOrderListProjectionVersion() &&
		projection.pipelineContractVersion === SALES_PIPELINE_CONTRACT_VERSION &&
		projection.pipelineRevision && projection.pipelineFulfillmentApplicability &&
		projection.pipelineFulfillmentState);
}

/** Adjust the existing projection-backed order counts using freshly resolved evidence. */
export function dispatchFulfillmentCountAdjustment(
	order: { type: string | null; deletedAt: Date | null; listProjection: FulfillmentProjection | null } | undefined,
	fulfillment: Pick<SalesPipelineSnapshot["fulfillment"], "applicability" | "state">,
) {
	if (!order || order.deletedAt || order.type !== "order") return { all: 0, completed: 0 };
	const projection = order.listProjection;
	// Match the existing aggregate predicate exactly, even if revision is unavailable.
	const wasCounted = Boolean(projection && projection.state === "ready" &&
		projection.version === salesOrderListProjectionVersion() &&
		projection.pipelineContractVersion === SALES_PIPELINE_CONTRACT_VERSION &&
		projection.pipelineFulfillmentApplicability === "required");
	const isCounted = fulfillment.applicability === "required";
	return {
		all: Number(isCounted) - Number(wasCounted),
		completed: Number(isCounted && isSalesPipelineFulfillmentCompleted(fulfillment.state)) -
			Number(wasCounted && isSalesPipelineFulfillmentCompleted(projection?.pipelineFulfillmentState)),
	};
}
