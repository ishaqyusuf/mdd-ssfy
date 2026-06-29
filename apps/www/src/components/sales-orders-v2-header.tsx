"use client";

import { useAuth } from "@/hooks/use-auth";
import { salesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import {
	SearchFilterProvider,
	useSearchFilterContext,
} from "@/hooks/use-search-filter";
import { cn } from "@/lib/utils";
import { useSalesOrdersStore } from "@/store/sales-orders";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { CreateSalesBtn } from "./create-sales-btn";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";
import { SalesOrdersV2ColumnVisibility } from "./sales-orders-v2-column-visibility";
import { SalesTabs } from "./sales-tabs";

export function SalesOrdersV2Header() {
	return (
		<div className="flex flex-col gap-4 xl:flex-row xl:items-center">
			<div className="min-w-0 flex-1">
				<SearchFilterProvider
					args={[
						{
							filterSchema: salesOrdersV2FilterParams,
						},
					]}
				>
					<SalesOrdersV2SearchFilterContent />
				</SearchFilterProvider>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<SalesOrdersV2ColumnVisibility />
				<CreateSalesBtn />
			</div>
		</div>
	);
}

function SalesOrdersV2SearchFilterContent() {
	const auth = useAuth();
	const trpc = useTRPC();
	const { shouldFetch } = useSearchFilterContext();
	const isTableScrolled = useSalesOrdersStore((state) => state.isTableScrolled);
	const { data: trpcFilterData, isFetching } = useQuery({
		enabled: shouldFetch,
		...trpc.filters.salesOrders.queryOptions({
			salesManager: auth?.can?.viewSalesManager,
		}),
	});

	return (
		<SearchFilterTRPC
			placeholder="Search order number, customer, phone, address, or P.O..."
			filterList={trpcFilterData}
			loading={shouldFetch && isFetching}
			afterSearch={<SalesOrdersV2InlineTabs visible={isTableScrolled} />}
			pageTabs={null}
		/>
	);
}

function SalesOrdersV2InlineTabs({ visible }: { visible: boolean }) {
	return (
		<div
			aria-hidden={!visible}
			className={cn(
				"min-w-0 flex-1 overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-out lg:flex-none",
				visible
					? "max-w-full translate-y-0 opacity-100 lg:max-w-[520px]"
					: "pointer-events-none max-w-0 -translate-y-1 opacity-0",
			)}
		>
			<SalesTabs portal={false} compact />
		</div>
	);
}
