import { useState } from "react";
import { getSalesItemAssignments } from "@/actions/get-sales-item-assignments";
import { DataSkeleton } from "@/components/data-skeleton";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { timeout } from "@/lib/timeout";
import { createContextFactory } from "@/utils/context-factory";
import { skeletonListData } from "@/utils/format";
import { UserPlus } from "lucide-react";
import { useAsyncMemo } from "use-async-memo";

import { Button } from "@gnd/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Icons } from "@gnd/ui/icons";

import { AccessBased } from "./access-based";
import { ProgressItem } from "./item-progress-bar";
import { ProductionAssignmentForm } from "./production-assignment-form";
import { ProductionAssignmentRow } from "./production-assignment-row";
import { useProductionItem } from "./production-tab";

export const {
    Provider: ProductionItemAssignmentsProvider,
    useContext: useProductionAssignments,
} = createContextFactory(function () {
    const ctx = useProductionItem();
    const { queryCtx, item } = ctx;
    const data = useAsyncMemo(async () => {
        await timeout(100);
        const result = await getSalesItemAssignments(
            item.controlUid,
            item.itemId,
            item.doorId,
            queryCtx.assignedTo,
        );
        return result;
    }, [item.controlUid, queryCtx.refreshTok]);
    return {
        data,
        item,
    };
});
export function ProductionItemAssignments() {
    return (
        <ProductionItemAssignmentsProvider args={[]}>
            <Content />
        </ProductionItemAssignmentsProvider>
    );
}
export function Content() {
    const ctx = useProductionAssignments();
    const { data, item } = ctx;
    const [open, setOpen] = useState(
        item?.analytics?.stats?.prodAssigned?.qty == 0,
    );
    return (
        <DataSkeletonProvider value={{ loading: !data?.uid } as any}>
            {/* <ProgressItem
                label="Assignment Status"
                completed={item?.assigned?.qty}
                total={item?.qty?.qty}
            /> */}
            <div className="mt-4 space-y-3 px-6">
                <Collapsible open={open} onOpenChange={setOpen}>
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Assignments</h4>
                        <AccessBased>
                            <CollapsibleTrigger asChild>
                                <DataSkeleton className="h-8">
                                    <Button
                                        disabled={
                                            !item?.analytics?.assignment
                                                ?.pending?.qty
                                        }
                                        onClick={(e) => setOpen(!open)}
                                        size="sm"
                                        variant="outline"
                                        className="mt-2 w-full"
                                    >
                                        {open ? (
                                            <>
                                                <Icons.Close className="mr-2 h-4 w-4" />
                                                Close
                                            </>
                                        ) : (
                                            <>
                                                <Icons.Add className="mr-2 h-4 w-4" />
                                                New Assignment
                                            </>
                                        )}
                                    </Button>
                                </DataSkeleton>
                            </CollapsibleTrigger>
                        </AccessBased>
                    </div>
                    <CollapsibleContent>
                        <ProductionAssignmentForm
                            closeForm={(e) => {
                                setOpen(false);
                            }}
                        />
                    </CollapsibleContent>
                </Collapsible>
                {data?.uid && !data?.assignments?.length ? (
                    <EmptyAssignment></EmptyAssignment>
                ) : (
                    <></>
                )}
                {skeletonListData(data?.assignments, 1)?.map(
                    (assignment, i) => (
                        <DataSkeleton className="min-h-36" key={i}>
                            <ProductionAssignmentRow index={i} />
                        </DataSkeleton>
                    ),
                )}
                <DataSkeleton className="hidden">
                    {!!data?.assignments?.length || (
                        <p className="py-2 text-center text-sm text-muted-foreground">
                            No assignments yet
                        </p>
                    )}
                </DataSkeleton>
            </div>
        </DataSkeletonProvider>
    );
}

function EmptyAssignment() {
    return (
        <div className="flex h-36 items-center justify-center">
            <div className="flex flex-col items-center">
                <Icons.Transactions2 className="mb-4" />
                <div className="mb-6 space-y-2 text-center">
                    <h2 className="text-lg font-medium">No Assignment</h2>
                    <p className="text-sm text-[#606060]">
                        {"There are no assignments on this item"}
                    </p>
                </div>
            </div>
        </div>
    );
}
