import { SalesResoltionSearchFilter } from "./sales-resolution-search-filter";

export function SalesResolutionHeader({}) {
    return (
        <div className="flex justify-between">
            <SalesResoltionSearchFilter />
            <div className="" id="resolutionHeaderActions"></div>
        </div>
    );
}

