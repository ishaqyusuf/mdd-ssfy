import { SalesResoltionSearchFilter } from "./sales-resolution-search-filter";
import type { PageFilterData } from "@api/type";

type Props = {
    initialFilterList?: PageFilterData[];
};

export function SalesResolutionHeader({ initialFilterList }: Props) {
    return (
        <div className="flex justify-between">
            <SalesResoltionSearchFilter initialFilterList={initialFilterList} />
            <div className="" id="resolutionHeaderActions"></div>
        </div>
    );
}
