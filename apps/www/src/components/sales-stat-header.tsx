import { ProductReportSearchFilter } from "./product-report-search-filter";

export function SalesStatHeader({}) {
    return (
        <div className="flex justify-between">
            <ProductReportSearchFilter />
            {/* <Button asChild size="sm">
                <Link href="/sales-book/create-order">
                    <Icons.Add className="mr-2 size-4" />
                    <span>New</span>
                </Link>
            </Button> */}
        </div>
    );
}

