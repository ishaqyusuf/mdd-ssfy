import { getCommissionPayments } from "@/actions/get-comission-payments";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";

type Props = {
    query?: SearchParamsType;
};
export async function CommissionPaymentsWidget({ query }: Props) {
    const { data, meta } = await getCommissionPayments({
        ...query,
    });
}
