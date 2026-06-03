"use client";

import { useAuth } from "@/hooks/use-auth";
import { salesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import {
	SearchFilterProvider,
	useSearchFilterContext,
} from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@gnd/ui/tanstack";
import Link from "next/link";
import { CreateSalesBtn } from "./create-sales-btn";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";
import { SalesOrdersV2ColumnVisibility } from "./sales-orders-v2-column-visibility";

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
				<Button asChild size="sm" variant="outline">
					<Link href="/sales-book/orders">
						<Icons.ArrowUpRight className="mr-2 size-4" />
						<span className="hidden lg:inline">Legacy</span>
					</Link>
				</Button>
				<CreateSalesBtn />
			</div>
		</div>
	);
}

function SalesOrdersV2SearchFilterContent() {
	const auth = useAuth();
	const trpc = useTRPC();
	const { shouldFetch } = useSearchFilterContext();
	const { data: trpcFilterData } = useQuery({
		enabled: shouldFetch,
		...trpc.filters.salesOrdersV2.queryOptions({
			salesManager: auth?.can?.viewSalesManager,
		}),
	});

	return (
		<SearchFilterTRPC
			placeholder="Search order number, customer, phone, address, or P.O..."
			filterList={trpcFilterData}
		/>
	);
}
