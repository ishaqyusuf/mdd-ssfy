"use client";

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
	return (
		<div className="flex justify-between gap-4">
			<SearchFilter
				filterSchema={jobFilterParams}
				placeholder="Search Jobs..."
				trpcRoute={trpc.filters.job}
				initialFilterList={initialFilterList}
			/>
			<div className="flex-1" />
			<ContractorJobsColumnVisibility />
			<JobSettingsSheet />
			<OpenJobSheet />
		</div>
	);
}
