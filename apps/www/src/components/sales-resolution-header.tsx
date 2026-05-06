import type { PageFilterData } from "@api/type";
import { SalesResoltionSearchFilter } from "./sales-resolution-search-filter";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function SalesResolutionHeader({ initialFilterList }: Props) {
	return (
		<div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-between">
			<div className="min-w-0 flex-1">
				<SalesResoltionSearchFilter initialFilterList={initialFilterList} />
			</div>
			<div
				className="flex min-w-0 items-center justify-start md:justify-end"
				id="resolutionHeaderActions"
			/>
		</div>
	);
}
