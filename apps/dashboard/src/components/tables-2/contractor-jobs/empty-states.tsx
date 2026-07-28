"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useJobFilterParams } from "@/hooks/use-contractor-jobs-filter-params";
import { useJobFormParams } from "@/hooks/use-job-form-params";
import type { ReactNode } from "react";

function clearFilters<T extends Record<string, unknown>>(filters: T) {
	return Object.fromEntries(
		Object.keys(filters).map((key) => [key, null]),
	) as T;
}

export function EmptyState({
	action,
	embedded,
}: {
	action?: ReactNode;
	embedded?: boolean;
}) {
	const { filters, setFilters, hasFilters } = useJobFilterParams();
	const { setParams } = useJobFormParams();

	if (!hasFilters && (action || embedded)) {
		return (
			<div className="flex items-center justify-center">
				<div className="mt-40 flex flex-col items-center">
					<div className="mb-6 space-y-2 text-center">
						<h2 className="text-lg font-medium">
							{embedded ? "No jobs" : "No contractor jobs"}
						</h2>
						<p className="text-sm text-[#606060]">
							{embedded
								? "Jobs for this project will appear here after they are submitted or assigned."
								: "Contractor jobs will appear here after they are submitted or assigned."}
						</p>
					</div>
					{action ?? null}
				</div>
			</div>
		);
	}

	return (
		<CoreEmptyState
			title={embedded ? "No jobs" : "No contractor jobs"}
			description={
				embedded
					? "Jobs for this project will appear here after they are submitted or assigned."
					: "Contractor jobs will appear here after they are submitted or assigned."
			}
			actionLabel={hasFilters ? "Clear filters" : "Create Job"}
			onAction={() => {
				if (hasFilters) {
					setFilters(clearFilters(filters));
					return;
				}

				setParams({
					step: 1,
				});
			}}
		/>
	);
}

export function NoResults() {
	const { filters, setFilters } = useJobFilterParams();

	return (
		<CoreNoResults
			onClear={() => {
				setFilters(clearFilters(filters));
			}}
		/>
	);
}
