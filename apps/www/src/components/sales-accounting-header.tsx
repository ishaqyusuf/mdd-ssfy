"use client";

import type { PageFilterData } from "@api/type";
import { buttonVariants } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { SearchFilter } from "@gnd/ui/search-filter";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQueryStates } from "nuqs";

import { salesAccountingFilterParams } from "@/hooks/use-sales-accounting-filter-params";
import { useTRPC } from "@/trpc/client";

const SalesAccountingExport = dynamic(
	() =>
		import("./sales-accounting-export").then(
			(mod) => mod.SalesAccountingExport,
		),
	{
		ssr: false,
	},
);

type Props = {
	initialFilterList?: PageFilterData[];
};

export function SalesAccountingHeader({ initialFilterList }: Props) {
	const trpc = useTRPC();
	const [filters, setFilters] = useQueryStates(salesAccountingFilterParams);
	return (
		<div className="flex gap-4 justify-between">
			<SearchFilter
				filterSchema={salesAccountingFilterParams}
				placeholder="Search Sales Accountings..."
				trpcRoute={trpc.filters.salesAccounting}
				initialFilterList={initialFilterList}
				{...{ filters, setFilters }}
			/>
			<div className="flex-1" />
			<SalesAccountingExport />
			<Link
				href="/sales-book/accounting/resolution-center"
				className={cn(
					buttonVariants({
						size: "sm",
					}),
				)}
			>
				Resolution Center
			</Link>
		</div>
	);
}
