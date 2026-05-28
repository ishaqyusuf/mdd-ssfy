import type { DealerPortalSalesListSchema } from "@api/schemas/dealer";
import type { TRPCContext } from "@api/trpc/init";
import type { PageFilterData } from "@api/type";
import { sortList, uniqueList } from "@gnd/utils";

type FilterKey = keyof DealerPortalSalesListSchema;
type FilterData = PageFilterData<FilterKey>;

function optionFilter(
	value: FilterKey,
	label: string,
	options: ({ label: string; value: string } | string)[],
) {
	return {
		label,
		value,
		options: options
			.map((option) =>
				typeof option === "string" ? { label: option, value: option } : option,
			)
			.filter((option) => option.value),
		type: "checkbox",
	} satisfies FilterData;
}

const searchFilter = {
	label: "Search",
	type: "input",
	value: "q",
} satisfies PageFilterData<"q">;

function toOptions(values: Array<string | null | undefined>) {
	const options = values
		.map((value) => value?.trim())
		.filter((value): value is string => Boolean(value));

	return uniqueList(
		sortList(
			options.map((value) => ({ label: value, value })),
			"value",
		),
		"value",
	);
}

const paymentStateOptions = [
	{ label: "Balance due", value: "due" },
	{ label: "Paid", value: "paid" },
	{ label: "Credit", value: "credit" },
];

const deliveryOptionLabels: Record<string, string> = {
	pickup: "Pickup",
	delivery: "Delivery",
	ship: "Ship",
};

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
			toOptions(
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
			toOptions(
				quotes.flatMap((quote) => [
					quote.customer?.phoneNo,
					quote.billingAddress?.phoneNo,
				]),
			),
		),
		optionFilter(
			"orderNo",
			"Quote #",
			toOptions(quotes.map((quote) => quote.orderId)),
		),
		optionFilter(
			"status",
			"Status",
			toOptions(quotes.map((quote) => quote.status || "open")),
		),
		optionFilter(
			"deliveryOption",
			"Delivery",
			toOptions(quotes.map((quote) => quote.deliveryOption)).map((option) => ({
				...option,
				label: deliveryOptionLabels[option.value] || option.label,
			})),
		),
		optionFilter(
			"customerProfileId",
			"Sales Profile",
			toOptions(
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
		optionFilter("amountDue", "Payment", paymentStateOptions),
	] satisfies FilterData[];
}
