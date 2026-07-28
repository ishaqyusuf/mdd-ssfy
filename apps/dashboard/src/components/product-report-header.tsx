import type { PageFilterData } from "@api/type";
import { ProductReportSearchFilter } from "./product-report-search-filter";
import {
	SalesStatisticsColumnVisibility,
	SalesStatisticsViewToggle,
} from "./tables-2/sales-statistics/column-visibility";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function ProductReportHeader({ initialFilterList }: Props) {
	return (
		<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
			<ProductReportSearchFilter initialFilterList={initialFilterList} />
			<div className="flex flex-wrap items-center gap-2 md:justify-end">
				<SalesStatisticsViewToggle />
				<SalesStatisticsColumnVisibility />
			</div>
			{/* <Button asChild size="sm">
                <Link href="/sales-book/create-order">
                    <Icons.Add className="mr-2 size-4" />
                    <span>New</span>
                </Link>
            </Button> */}
		</div>
	);
}
