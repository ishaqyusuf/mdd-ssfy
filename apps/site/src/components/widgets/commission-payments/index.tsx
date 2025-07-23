import { getCommissionPayments } from "@/actions/get-comission-payments";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { EmptyState, NoResults } from "./empty-states";
import { CommissionPaymentsTable } from "./table";

type Props = {
    query?: SearchParamsType;
};
export async function CommissionPaymentsWidget({ query = {} }: Props) {
    const { data, meta } = await getCommissionPayments({
        ...query,
    });

    if (!data?.length) {
        if (Object.values(query).some((value) => value !== null)) {
            return <NoResults />;
        }

        return <EmptyState />;
    }
    return <CommissionPaymentsTable data={data} />;
}
