import { describe, expect, it } from "bun:test";
import { FILTER_OPTION_COLORS } from "@gnd/utils/filter-option-colors";

import { toDealershipFilterOptions } from "./dealership-filter-options";
import { getDealershipOrdersFilter } from "./dealership-orders-filter";

describe("dealership filter color metadata", () => {
	it("colors status, delivery, payment, and invoice state", async () => {
		const filters = await getDealershipOrdersFilter(
			{
				db: {
					salesOrders: {
						findMany: async () => [
							{
								id: 42,
								orderId: "10001AA",
								status: "in progress",
								deliveryOption: "delivery",
								invoiceStatus: "paid",
								listProjection: {
									pipelineHeadline: "in_production",
								},
								dealerSale: null,
								customer: null,
								billingAddress: null,
							},
						],
					},
				},
			} as never,
			12,
		);

		expect(findOption(filters, "status", "processing")?.color).toBe(
			FILTER_OPTION_COLORS.amber,
		);
		expect(findOption(filters, "status", "in progress")).toBeUndefined();
		expect(findOption(filters, "deliveryOption", "delivery")?.color).toBe(
			FILTER_OPTION_COLORS.blue,
		);
		expect(findOption(filters, "paymentStatus", "paid")?.color).toBe(
			FILTER_OPTION_COLORS.emerald,
		);
		expect(findOption(filters, "invoiceStatus", "paid")?.color).toBe(
			FILTER_OPTION_COLORS.emerald,
		);
	});

	it("removes empty dynamic options before using the shared filter builder", () => {
		expect(
			toDealershipFilterOptions([null, undefined, "", "  ", "Customer A"]),
		).toEqual([{ label: "Customer A", value: "Customer A" }]);
	});
});

function findOption(
	filters: Awaited<ReturnType<typeof getDealershipOrdersFilter>>,
	key: string,
	value: string,
) {
	return filters
		.find((filter) => filter.value === key)
		?.options?.find((option) => option.value === value);
}
