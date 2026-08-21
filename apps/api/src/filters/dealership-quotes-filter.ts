import type { DealerPortalSalesListSchema } from "@api/schemas/dealer";
import type { TRPCContext } from "@api/trpc/init";
import type { PageFilterData } from "@api/type";
import { optionFilter } from "@api/utils/filter";
import {
	dealershipPaymentStateOptions,
	toDealershipFilterOptions,
	withDealershipDeliveryColors,
	withDealershipStatusColors,
} from "./dealership-filter-options";

type FilterKey = keyof DealerPortalSalesListSchema;
type FilterData = PageFilterData<FilterKey>;

const searchFilter = {
	label: "Search",
	type: "input",
	value: "q",
} satisfies PageFilterData<"q">;

export async function getDealershipQuotesFilter(
	ctx: TRPCContext,
	dealerId: number,
) {
	const quotes = await ctx.db.salesOrders.findMany({
		where: {
			dealerAuthId: dealerId,
			deletedAt: null,
			type: "quote",
		},
		select: {
			orderId: true,
			status: true,
			deliveryOption: true,
			dealerSale: {
				select: {
					dealerCustomerProfile: {
						select: {
							id: true,
							title: true,
						},
					},
				},
			},
			customer: {
				select: {
					businessName: true,
					name: true,
					email: true,
					phoneNo: true,
				},
			},
			billingAddress: {
				select: {
					phoneNo: true,
				},
			},
		},
	});

	return [
		searchFilter,
		optionFilter(
			"customer.name",
			"Customer",
			toDealershipFilterOptions(
				quotes.flatMap((quote) => [
					quote.customer?.businessName,
					quote.customer?.name,
					quote.customer?.email,
				]),
			),
		),
		optionFilter(
			"phone",
			"Phone",
			toDealershipFilterOptions(
				quotes.flatMap((quote) => [
					quote.customer?.phoneNo,
					quote.billingAddress?.phoneNo,
				]),
			),
		),
		optionFilter(
			"orderNo",
			"Quote #",
			toDealershipFilterOptions(quotes.map((quote) => quote.orderId)),
		),
		optionFilter(
			"status",
			"Status",
			withDealershipStatusColors(
				toDealershipFilterOptions(
					quotes.map((quote) => quote.status || "open"),
				),
			),
		),
		optionFilter(
			"deliveryOption",
			"Delivery",
			withDealershipDeliveryColors(
				toDealershipFilterOptions(
					quotes.map((quote) => quote.deliveryOption),
				),
			),
		),
		optionFilter(
			"customerProfileId",
			"Sales Profile",
			toDealershipFilterOptions(
				quotes.map((quote) =>
					quote.dealerSale?.dealerCustomerProfile
						? `${quote.dealerSale.dealerCustomerProfile.id}:${quote.dealerSale.dealerCustomerProfile.title}`
						: null,
				),
			).map((option) => {
				const [id, ...labelParts] = option.value.split(":");
				return {
					label: labelParts.join(":") || option.label,
					value: id || option.value,
				};
			}),
		),
		optionFilter("amountDue", "Payment", dealershipPaymentStateOptions),
	] satisfies FilterData[];
}
