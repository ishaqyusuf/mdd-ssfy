import { _qc, _trpc } from "@/components/static-trpc";
import { useBuilderModelInstallsContext } from "@/hooks/use-model-install-config";
import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { useJobParams } from "@/hooks/use-contractor-jobs-params";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { RouterOutputs } from "@api/trpc/routers/_app";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@gnd/ui/alert-dialog";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { InputGroup, Item } from "@gnd/ui/namespace";
import { Sortable, SortableDragHandle, SortableItem } from "@gnd/ui/sortable";
import { SubmitButton } from "@gnd/ui/submit-button";
import NumberFlow from "@number-flow/react";
import { useMutation } from "@tanstack/react-query";
import { DollarSign, GripVertical, RefreshCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";

type InstallTaskRow =
    RouterOutputs["community"]["getModelInstallTasksByBuilderTask"]["tasks"][number];

export function InstallConfiguration() {
    const { tasks, params } = useBuilderModelInstallsContext();
    const { setParams } = useCommunityInstallCostParams();
    const { setParams: setJobParams } = useJobParams();
    const notification = useNotificationTrigger();
    const [orderedTasks, setOrderedTasks] = useState<InstallTaskRow[]>(tasks);
    const matchesRequestTask =
        !!params.requestBuilderTaskId &&
        params.selectedBuilderTaskId === params.requestBuilderTaskId;
    const canNotifyContractor =
        matchesRequestTask && !!params.contractorId && !!params.jobId;
    const hasConfiguredQty = tasks?.some((task) => Number(task.qty || 0) > 0);

    const handleNotifyContractor = async () => {
        if (!params.contractorId || !params.jobId) return;
        await notification.jobTaskConfigured({
            contractorId: params.contractorId,
            jobId: params.jobId,
        });
        await setParams({
            requestBuilderTaskId: null,
            jobId: null,
        });
        toast.success("Contractor notified: job task is ready.");
    };

    useEffect(() => {
        setOrderedTasks(tasks);
    }, [tasks]);

    const { mutate: reorderInstallCosts, isPending: isReordering } =
        useMutation(
            _trpc.community.reorderBuilderTaskInstallCosts.mutationOptions({
                onSuccess() {
                    _qc.invalidateQueries({
                        queryKey:
                            _trpc.community.getModelInstallTasksByBuilderTask.queryKey(
                                {
                                    builderTaskId: params.selectedBuilderTaskId!,
                                    modelId: params.editCommunityModelInstallCostId!,
                                },
                            ),
                    });
                },
                meta: {
                    toastTitle: {
                        error: "Unable to save install cost order",
                        loading: "Saving order...",
                        success: "Install cost order updated",
                    },
                },
            }),
        );

    if (orderedTasks?.length === 0) return <EmptyState />;
    return (
        <>
            {canNotifyContractor ? (
                <div className="mb-3 flex justify-end gap-2">
                    {hasConfiguredQty ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                if (!params.jobId) return;
                                setJobParams({
                                    openJobId: params.jobId,
                                });
                            }}
                        >
                            Open Job
                        </Button>
                    ) : null}
                    <Button
                        onClick={handleNotifyContractor}
                        disabled={notification.isActionPending}
                    >
                        {notification.isActionPending
                            ? "Notifying..."
                            : "Notify Contractor"}
                    </Button>
                </div>
            ) : null}
            <Sortable
                value={orderedTasks.map((task) => ({
                    ...task,
                    id: task.builderTaskInstallCostId!,
                }))}
                onValueChange={(nextTasks) => {
                    setOrderedTasks(
                        nextTasks.map(({ id: _id, ...task }) => task),
                    );
                    if (!params.selectedBuilderTaskId) return;
                    reorderInstallCosts({
                        builderTaskId: params.selectedBuilderTaskId,
                        builderTaskInstallCostIds: nextTasks.map(
                            (task) => task.builderTaskInstallCostId!,
                        ),
                    });
                }}
            >
                <Item.Group className="gap-3">
                    {orderedTasks?.map((task) => (
                        <SortableItem
                            key={task.builderTaskInstallCostId}
                            value={task.builderTaskInstallCostId!}
                            asChild
                        >
                            <div>
                                <Line
                                    task={task}
                                    isReordering={isReordering}
                                />
                            </div>
                        </SortableItem>
                    ))}
                </Item.Group>
            </Sortable>
        </>
    );
}

function Line({
    task,
    isReordering,
}: {
    task: InstallTaskRow;
    isReordering?: boolean;
}) {
    const [status, setStatus] = useState(task.status);
    const [maxQty, setMaxQty] = useState(task?.qty || "");
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const { modelId, setBuilderTaskInstallCosts, selectedBuilderTask, data } =
        useBuilderModelInstallsContext();
    const { mutate, isPending, isError } = useMutation(
        _trpc.community.updateCommunityModelInstallTask.mutationOptions({
            onSuccess(data, variables, onMutateResult, context) {
                setBuilderTaskInstallCosts((prev) => ({
                    ...prev,
                    [String(data.id)]: {
                        qty: (variables as any)?.qty || 0,
                        cost: task.installCostModel?.unitCost || 0,
                        total: +(
                            ((variables as any)?.qty || 0) *
                            (task.installCostModel?.unitCost || 0)
                        ).toFixed(2),
                    },
                }));
            },
            meta: {
                toastTitle: {
                    error: "Unable to complete",
                    loading: "Processing...",
                    success: "Done!.",
                },
            },
        }),
    );
    const { mutate: deleteCost, isPending: isDeleting } = useMutation(
        _trpc.community.deleteCommunityModelInstallCost.mutationOptions({
            onSuccess() {
                _qc.invalidateQueries({
                    queryKey:
                        _trpc.community.getModelInstallTasksByBuilderTask.queryKey(
                            {
                                builderTaskId: task.builderTaskId,
                                modelId: modelId!,
                            },
                        ),
                });
                setShowDeleteDialog(false);
                toast.success("Install cost removed.");
            },
            meta: {
                toastTitle: {
                    error: "Unable to delete",
                    loading: "Deleting...",
                    success: "Deleted!",
                },
            },
        }),
    );
    const handleUpdate = useDebouncedCallback(({ maxQty, status }) => {
        if (!maxQty) maxQty = null;
        const formData = {
            qty: maxQty,
            status,
            id: task.id,
            builderTaskId: task.builderTaskId,
            builderTaskInstallCostId: task.builderTaskInstallCostId,
            communityModelId: modelId,
            installCostModelId: task.installCostModelId,
        };
        // console.log(formData);
        // return;
        mutate(formData);
        // console.log({ v });
        // const scoreData = scores?.[scoreKey];
        // // console.log(v, scoreData, scores, scoreKey, student);
        // // return;
        // mutate({
        //     ...scoreData,
        //     studentId: student?.id,
        //     studentTermId: student?.termId,
        //     obtained: v || null,
        //     departmentId,
        // });
    }, 800);
    return (
        <Item
            key={task.id}
            variant="outline"
            className={cn(
                "gap-3 border-l-2 bg-background p-4",
                isError ? "border-l-destructive" : "border-l-primary/30",
            )}
        >
            <Item.Content className="min-w-0 gap-3">
                <Item.Header className="items-start gap-3">
                    <SortableDragHandle
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground"
                        disabled={isReordering}
                        onClick={(event) => {
                            event.stopPropagation();
                        }}
                    >
                        <GripVertical className="size-4" />
                    </SortableDragHandle>
                    <div className="min-w-0 flex-1">
                        <Item.Title className="w-full truncate">
                            {task.installCostModel?.title}
                        </Item.Title>
                        <Item.Description>
                            ${task.installCostModel?.unitCost}
                            {task.installCostModel?.unit
                                ? ` / ${task.installCostModel?.unit}`
                                : ""}
                        </Item.Description>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => {
                                const newStatus =
                                    status === "active"
                                        ? "inactive"
                                        : "active";
                                setStatus(newStatus);
                                handleUpdate({
                                    maxQty,
                                    status: newStatus,
                                });
                            }}
                            variant={
                                status === "active" ? "default" : "secondary"
                            }
                            size="sm"
                            className="min-w-20"
                        >
                            {status}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setShowDeleteDialog(true)}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                </Item.Header>

                <Item.Footer className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <div className="grid gap-1">
                        <span className="text-muted-foreground text-[11px] uppercase tracking-wide">
                            Max Qty
                        </span>
                        <InputGroup>
                            <InputGroup.Input
                                value={maxQty}
                                className="w-full sm:w-24"
                                onChange={(e) => {
                                    const value = Number(e.target.value) || "";
                                    setMaxQty(value);
                                    handleUpdate({
                                        maxQty: value,
                                        status,
                                    });
                                }}
                                type="number"
                            />
                        </InputGroup>
                    </div>
                    <div className="flex items-end justify-between gap-3 sm:justify-end">
                        <div className="grid gap-1 text-left sm:text-right">
                            <span className="text-muted-foreground text-[11px] uppercase tracking-wide">
                                Est.
                            </span>
                            <NumberFlow
                                prefix="$"
                                className={cn(
                                    "text-sm font-semibold",
                                    !!task.installCostModel?.unitCost &&
                                        "font-medium",
                                )}
                                value={
                                    task.installCostModel?.unitCost
                                        ? +(
                                              (Number(maxQty) || 0) *
                                              task.installCostModel.unitCost
                                          ).toFixed(2)
                                        : 0
                                }
                            />
                        </div>
                        <SubmitButton
                            className={cn(
                                "opacity-0",
                                (isError || isPending) && "opacity-100",
                            )}
                            isSubmitting={isPending}
                            onClick={() => {
                                handleUpdate({
                                    maxQty,
                                    status,
                                });
                            }}
                            type="button"
                            size="xs"
                            variant={!isError ? "default" : "destructive"}
                        >
                            <RefreshCcw className="size-3" />
                        </SubmitButton>
                    </div>
                </Item.Footer>
            </Item.Content>
            <AlertDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete Install Cost
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Deleting this cost will remove{" "}
                            <strong>{task.installCostModel?.title}</strong>{" "}
                            from all{" "}
                            <strong>{selectedBuilderTask?.taskName}</strong>{" "}
                            across <strong>{data?.builderName}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isDeleting}
                            onClick={(e) => {
                                e.preventDefault();
                                deleteCost({
                                    builderTaskInstallCostId:
                                        task.builderTaskInstallCostId,
                                });
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Item>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-full m-6 rounded-xl bg-muted/5 border-2 border-dashed border-border/60">
            <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                <DollarSign size={32} />
            </div>
            <h3 className="text-lg font-bold text-foreground">
                No Install Cost Items
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs mt-2 mb-6 leading-relaxed">
                There are no costs associated with this task yet. Add from the
                library or create a new one.
            </p>
            {/* <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-sm hover:bg-primary/90 flex items-center gap-2 transition-all">
                Add or Create Cost <ArrowRight size={16} />
            </button> */}
        </div>
    );
}
