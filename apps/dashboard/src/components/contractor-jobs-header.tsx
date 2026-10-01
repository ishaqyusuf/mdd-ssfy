"use client";

import { useJobFilterParams } from "@/hooks/use-contractor-jobs-filter-params";
import { JOBS_SHOW_OPTIONS, JobShowRecordOptions } from "@community/constants";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { jobFilterParams } from "@/hooks/use-contractor-jobs-filter-params";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@api/type";
import { JobSettingsSheet } from "./job-settings-sheet";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";
import { OpenJobSheet } from "./open-contractor-jobs-sheet";
import { ContractorJobsColumnVisibility } from "./tables-2/contractor-jobs/column-visibility";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function JobHeader({ initialFilterList }: Props) {
	const trpc = useTRPC();
	const { filters, setFilters } = useJobFilterParams();
	return (
		<div className="flex min-w-0 flex-col gap-4">
			<SearchFilter
				filterSchema={jobFilterParams}
				placeholder="Search jobs…"
				trpcRoute={trpc.filters.job}
				initialFilterList={initialFilterList}
				toolbarActions={
					<div className="flex flex-wrap items-center gap-2">
						<ContractorJobsColumnVisibility />
						<JobSettingsSheet />
						<OpenJobSheet label="New job" variant="default" />
					</div>
				}
			/>
			<Tabs
				value={filters.show || "all"}
				onValueChange={(show: (typeof JOBS_SHOW_OPTIONS)[number]) =>
					setFilters({ show: show === "all" ? null : show })
				}
			>
				<TabsList
					aria-label="Job views"
					className="h-auto max-w-full flex-wrap justify-start"
				>
					{JOBS_SHOW_OPTIONS.map((show) => (
						<TabsTrigger key={show} value={show}>
							{JobShowRecordOptions[show]}
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>
		</div>
	);
}
