"use client";
import { SearchFilter } from "@gnd/ui/search-filter";
import { OpenJobSheet } from "./open-contractor-jobs-sheet";
import { jobFilterParams } from "@/hooks/use-contractor-jobs-filter-params";
import { _trpc } from "@/components/static-trpc";
import { useQueryStates } from "nuqs";
import { Env } from "./env";
import { SubmitButton } from "@gnd/ui/submit-button";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { ButtonGroup } from "@gnd/ui/composite";
import { Button } from "@gnd/ui/button";
import { useJobsKpi } from "@/hooks/use-jobs-kpi";
import { Layers, PenTool } from "lucide-react";
import { Badge } from "@gnd/ui/badge";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { NotificationJobInput } from "@notifications/schemas";

export function JobHeader({}) {
    const [filters, setFilters] = useQueryStates(jobFilterParams);
    const { mutate: _testActivity, isPending } = useMutation(
        useTRPC().jobs.testActivity.mutationOptions({
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
                    <Layers className="mr-2 h-4 w-4" />
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
                    <PenTool className="mr-2 h-4 w-4" />
                    <span>Custom Jobs</span>
                    <Badge variant="secondary" className="px-1">
                        {totalCustomJobs}
                    </Badge>
                </Button>
            </ButtonGroup>
            <SearchFilter
                filterSchema={jobFilterParams}
                placeholder="Search Jobs..."
                trpcRoute={_trpc.filters.job}
                {...{ filters, setFilters }}
            />
            <div className="flex-1"></div>
            <OpenJobSheet />
            <Env isDev>
                <SubmitButton
                    onClick={(e) => testActivity()}
                    isSubmitting={isPending}
                >
                    Activity Test
                </SubmitButton>
            </Env>
        </div>
    );
}

