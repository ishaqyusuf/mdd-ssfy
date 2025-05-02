import { GetSalesListDta } from "@/app/(clean-code)/(sales)/_common/data-access/sales-dta";

import { EmptyState } from "./empty-state";
import { SalesRow } from "./sales-row";

type Props = {
    sales: GetSalesListDta["data"];
};

export function Sales({ sales }: Props) {
    if (!sales.length) {
        return <EmptyState />;
    }

    return (
        <ul className="bullet-none scrollbar-hide mt-4 aspect-square cursor-pointer divide-y overflow-auto pb-32">
            {sales?.map((invoice) => {
                return <SalesRow key={invoice.id} sale={invoice} />;
            })}
        </ul>
    );
}
