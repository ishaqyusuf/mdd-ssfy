const TERMINAL_SALE_STATUSES = new Set([
	"complete",
	"completed",
	"delivered",
	"fulfilled",
]);
const CANCELLED_SALE_STATUSES = new Set(["cancelled", "canceled"]);

export type SalesTaxRecognitionEvidence = {
	recognizedAt: Date;
	source: "DELIVERY" | "PICKUP" | "ORDER_STATUS";
	sourceId: string | number;
};

export type SalesTaxRecognitionEvidenceInput = {
	orderId: number;
	status: string | null | undefined;
	dispatchCompletedPercentage: number | null | undefined;
	deliveredAt: Date | null | undefined;
	pickup: { id: number; pickupAt: Date | null; deletedAt?: Date | null } | null;
	deliveries: Array<{
		id: number;
		deliveryMode?: string | null;
		deliveredAt: Date | null;
	}>;
};

export function resolveSalesTaxRecognitionEvidence(
	input: SalesTaxRecognitionEvidenceInput,
):
	| { status: "eligible"; evidence: SalesTaxRecognitionEvidence }
	| {
			status: "ineligible";
			reason: "cancelled" | "not_fulfilled" | "missing_tax_point";
	  } {
	const status = String(input.status ?? "")
		.trim()
		.toLowerCase();
	if (CANCELLED_SALE_STATUSES.has(status)) {
		return { status: "ineligible", reason: "cancelled" };
	}
	if (
		Number(input.dispatchCompletedPercentage ?? 0) < 100 &&
		!TERMINAL_SALE_STATUSES.has(status)
	) {
		return { status: "ineligible", reason: "not_fulfilled" };
	}

	const candidates: SalesTaxRecognitionEvidence[] = input.deliveries.flatMap(
		(delivery) =>
			delivery.deliveredAt
				? [
						{
							recognizedAt: delivery.deliveredAt,
							source:
								delivery.deliveryMode === "pickup" ? "PICKUP" : "DELIVERY",
							sourceId: delivery.id,
						} satisfies SalesTaxRecognitionEvidence,
					]
				: [],
	);
	if (input.pickup?.pickupAt && !input.pickup.deletedAt) {
		candidates.push({
			recognizedAt: input.pickup.pickupAt,
			source: "PICKUP",
			sourceId: input.pickup.id,
		});
	}
	if (input.deliveredAt) {
		candidates.push({
			recognizedAt: input.deliveredAt,
			source: "ORDER_STATUS",
			sourceId: input.orderId,
		});
	}

	const evidence = candidates.sort(
		(left, right) => right.recognizedAt.getTime() - left.recognizedAt.getTime(),
	)[0];
	return evidence
		? { status: "eligible", evidence }
		: { status: "ineligible", reason: "missing_tax_point" };
}
