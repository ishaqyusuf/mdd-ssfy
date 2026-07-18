import { getLoggedInProfile } from "@/actions/cache/get-loggedin-profile";
import { getCommissionsList } from "@/actions/get-commissions-list";
import type { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { DataTable } from "@/components/tables-2/sales-rep-commissions/data-table";
import type { TableSettings } from "@/utils/table-settings";
import { EmptyState, NoResults } from "./empty-states";

type Props = {
	query?: SearchParamsType;
	initialSettings?: Partial<TableSettings>;
};
export async function ComissionsWidget({ query = {}, initialSettings }: Props) {
	const profile = await getLoggedInProfile();
	const { data } = await getCommissionsList({
		...query,
		size: 5,
		"user.id": profile?.userId,
	});

	if (!data?.length) {
		if (Object.values(query).some((value) => value !== null)) {
			return <NoResults />;
		}

		return <EmptyState />;
	}
	return <DataTable data={data} initialSettings={initialSettings} />;
}
