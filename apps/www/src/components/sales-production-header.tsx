import { SalesProductionSearchFilter } from "./sales-production-search-filter";

export function SalesProductHeader({ workerMode = false }) {
    return (
        <div className="flex justify-between">
            <SalesProductionSearchFilter workerMode={workerMode} />
            <div className="flex-1"></div>
            {/* <Button asChild size="sm">
                <Link href="/sales-book/create-order">
                    <Icons.Add className="mr-2 size-4" />
                    <span>New</span>
                </Link>
            </Button> */}
        </div>
    );
}

