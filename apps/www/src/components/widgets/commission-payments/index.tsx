import { getCommissionPayments } from "@/actions/get-comission-payments";
import type { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { DataTable } from "@/components/tables-2/sales-rep-commission-payments/data-table";
import type { TableSettings } from "@/utils/table-settings";
import { EmptyState, NoResults } from "./empty-states";

type Props = {
	query?: SearchParamsType;
	initialSettings?: Partial<TableSettings>;
};
export async function CommissionPaymentsWidget({
	query = {},
	initialSettings,
}: Props) {
	const { data } = await getCommissionPayments({
		...query,
		size: 5,
	});

	if (!data?.length) {
		if (Object.values(query).some((value) => value !== null)) {
			return <NoResults />;
		}

		return <EmptyState />;
	}
	return <DataTable data={data} initialSettings={initialSettings} />;
}
