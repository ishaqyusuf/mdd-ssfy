import type { DealerPortalCustomersListSchema } from "@api/schemas/dealer";
import type { TRPCContext } from "@api/trpc/init";
import type { PageFilterData } from "@api/type";
import { optionFilter } from "@api/utils/filter";
import { toDealershipFilterOptions } from "./dealership-filter-options";

type FilterKey = keyof DealerPortalCustomersListSchema;
type FilterData = PageFilterData<FilterKey>;

const searchFilter = {
	label: "Search",
	type: "input",
	value: "q",
} satisfies PageFilterData<"q">;

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
			toDealershipFilterOptions(
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
			toDealershipFilterOptions(customers.map((customer) => customer.phoneNo)),
		),
		optionFilter(
			"profile",
			"Sales Profile",
			toDealershipFilterOptions(
				customers.map((customer) => customer.profile?.title),
			),
		),
	] satisfies FilterData[];
}
