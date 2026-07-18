"use client";

import { jobFilterParams } from "@/hooks/use-contractor-jobs-filter-params";
import { useJobsKpi } from "@/hooks/use-jobs-kpi";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@api/type";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ButtonGroup } from "@gnd/ui/namespace";
import { SubmitButton } from "@gnd/ui/submit-button";
import type { NotificationJobInput } from "@notifications/schemas";
import { useMutation } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { Env } from "./env";
import { JobSettingsSheet } from "./job-settings-sheet";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";
import { OpenJobSheet } from "./open-contractor-jobs-sheet";
import { ContractorJobsColumnVisibility } from "./tables-2/contractor-jobs/column-visibility";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function JobHeader({ initialFilterList }: Props) {
	const trpc = useTRPC();
	const [filters, setFilters] = useQueryStates(jobFilterParams);
	const { mutate: _testActivity, isPending } = useMutation(
		trpc.jobs.testActivity.mutationOptions({
			onError(error, variables, onMutateResult, context) {
				console.log({
					error,
				});
			},
		}),
	);
	const testActivity = () => {
		// _testActivity();
		trigger.trigger({
			taskName: "notification",
			payload: {
				channel: "sales_dispatch_assigned",
				author: {
					id: 1,
					role: "employee",
				},
				recipients: [
					{
						ids: [1],
						role: "employee",
					},
				],
				payload: {
					dispatchId: 1,
					orderNo: "ORD-001",
					deliveryMode: "delivery",
					dueDate: new Date(),
					driverId: 1,
				},
			} as NotificationJobInput,
		});
	};
	const trigger = useTaskTrigger({
		silent: true,
		onStarted() {
			// setOpened(false);
			// form.reset(defaultValues);
		},
	});
	const { totalCustomJobs, totalJobs } = useJobsKpi();
	const showingCustom = filters.show === "custom";
	return (
		<div className="flex justify-between gap-4">
			<ButtonGroup>
				<Button
					variant={showingCustom ? "outline" : "default"}
					onClick={(e) => {
						setFilters({
							show: null,
						});
					}}
				>
					<Icons.Layers className="mr-2 h-4 w-4" />
					<span>All Jobs</span>
					<Badge variant="secondary" className="px-1">
						{totalJobs}
					</Badge>
				</Button>
				<ButtonGroup.Separator />
				<Button
					variant={showingCustom ? "default" : "outline"}
					onClick={(e) => {
						setFilters({
							show: "custom",
						});
					}}
					// size="sm"
				>
					<Icons.PenTool className="mr-2 h-4 w-4" />
					<span>Custom Jobs</span>
					<Badge variant="secondary" className="px-1">
						{totalCustomJobs}
					</Badge>
				</Button>
			</ButtonGroup>
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
			<Env isDev>
				<SubmitButton onClick={(e) => testActivity()} isSubmitting={isPending}>
					Activity Test
				</SubmitButton>
			</Env>
		</div>
	);
}
