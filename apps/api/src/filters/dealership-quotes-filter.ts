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
	return uniqueList(
		sortList(
			values
				.map((value) => value?.trim())
				.filter(Boolean)
				.map((value) => ({ label: value!, value: value! })),
			"value",
		),
		"value",
	);
}

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
	] satisfies FilterData[];
}
