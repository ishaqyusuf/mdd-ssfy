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

export function JobHeader({}) {
    const [filters, setFilters] = useQueryStates(jobFilterParams);
    const { mutate: testActivity, isPending } = useMutation(
        useTRPC().jobs.testActivity.mutationOptions({
            onError(error, variables, onMutateResult, context) {
                console.log({
                    error,
                });
            },
        }),
    );
    return (
        <div className="flex justify-between gap-4">
            <ButtonGroup>
                <Button variant="outline" size="sm">
                    All Jobs
                </Button>
                <ButtonGroup.Separator />
                <Button
                    onClick={(e) => {
                        setFilters({
                            show: "custom",
                        });
                    }}
                    variant="outline"
                    size="sm"
                >
                    Custom Jobs
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

