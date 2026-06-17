"use client";

import type { PageFilterData } from "@api/type";
import { buttonVariants } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import dynamic from "next/dynamic";
import Link from "next/link";

import { salesAccountingFilterParams } from "@/hooks/use-sales-accounting-filter-params";
import { useTRPC } from "@/trpc/client";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";
import { SalesReportMenu } from "./sales-report-menu";
import { SalesAccountingColumnVisibility } from "./tables-2/sales-accounting/column-visibility";

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
	return (
		<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
			<SearchFilter
				filterSchema={salesAccountingFilterParams}
				placeholder="Search Sales Accountings..."
				trpcRoute={trpc.filters.salesAccounting}
				initialFilterList={initialFilterList}
			/>
			<div className="flex flex-wrap items-center gap-2 md:justify-end">
				<SalesAccountingColumnVisibility />
				<SalesAccountingExport />
				<SalesReportMenu />
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
		</div>
	);
}
