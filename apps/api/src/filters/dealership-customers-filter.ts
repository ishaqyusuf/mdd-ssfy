import type { DealerPortalCustomersListSchema } from "@api/schemas/dealer";
import type { TRPCContext } from "@api/trpc/init";
import type { PageFilterData } from "@api/type";
import { sortList, uniqueList } from "@gnd/utils";

type FilterKey = keyof DealerPortalCustomersListSchema;
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

export async function getDealershipCustomersFilter(
	ctx: TRPCContext,
	dealerId: number,
) {
	const customers = await ctx.db.customers.findMany({
		where: {
			dealerOwnerId: dealerId,
			deletedAt: null,
		},
		select: {
			name: true,
			businessName: true,
			email: true,
			phoneNo: true,
			profile: {
				select: {
					title: true,
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
				customers.flatMap((customer) => [
					customer.businessName,
					customer.name,
					customer.email,
				]),
			),
		),
		optionFilter(
			"phone",
			"Phone",
			toOptions(customers.map((customer) => customer.phoneNo)),
		),
		optionFilter(
			"profile",
			"Sales Profile",
			toOptions(customers.map((customer) => customer.profile?.title)),
		),
	] satisfies FilterData[];
}
