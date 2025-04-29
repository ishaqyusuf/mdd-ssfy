import { DataSkeleton } from "@/components/data-skeleton";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";

import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Icons } from "@gnd/ui/icons";

import { DispatchProvider, useDispatch } from "./context";
import { DispatchFooter } from "./dispatch-footer";
import { DispatchForm } from "./dispatch-form";
import { DispatchList } from "./dispatch-list";
import { DispatchProgressChart } from "./dispatch-progress-chart";

export function DispatchTab({}) {
    return (
        <DispatchProvider args={[]}>
            <Content />
            <DispatchFooter />
        </DispatchProvider>
    );
}
function Content() {
    const { data, openForm, setOpenForm, ctx } = useDispatch();
    return (
        <DataSkeletonProvider value={{ loading: !data?.id } as any}>
            <div className="space-y-6">
                {openForm || (
                    <DispatchProgressChart data={data?.progress || {}} />
                )}
                <Collapsible open={openForm} onOpenChange={setOpenForm}>
                    <div
                        className={cn(
                            "flex items-center justify-between",
                            openForm && "hidden",
                        )}
                    >
                        <h3 className="text-lg font-medium">Dispatches</h3>
                        <CollapsibleTrigger asChild>
                            <DataSkeleton className="h-8">
                                <Button
                                    disabled={
                                        false
                                        // !item?.analytics?.assignment?.pending?.qty
                                    }
                                    onClick={(e) => setOpenForm(!openForm)}
                                    className="mt-2 w-full"
                                >
                                    {openForm ? (
                                        <>
                                            <Icons.Close className="mr-2 h-4 w-4" />
                                            Close
                                        </>
                                    ) : (
                                        <>
                                            <Icons.Add className="mr-2 h-4 w-4" />
                                            Create Disaptch
                                        </>
                                    )}
                                </Button>
                            </DataSkeleton>
                        </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="py-6">
                        <DispatchForm />
                        {/* <ProductionAssignmentForm
                        closeForm={(e) => {
                            setOpen(false);
                        }}
                    /> */}
                    </CollapsibleContent>
                </Collapsible>
                <DispatchList />
                {openForm || <></>}
            </div>
        </DataSkeletonProvider>
    );
}
