import type { PageFilterData } from "@api/type";
import { ProductReportSearchFilter } from "./product-report-search-filter";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function ProductReportHeader({ initialFilterList }: Props) {
	return (
		<div className="flex justify-between">
			<ProductReportSearchFilter initialFilterList={initialFilterList} />
			{/* <Button asChild size="sm">
                <Link href="/sales-book/create-order">
                    <Icons.Add className="mr-2 size-4" />
                    <span>New</span>
                </Link>
            </Button> */}
		</div>
	);
}
