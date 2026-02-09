import { _trpc } from "@/components/static-trpc";
import { useBuilderModelInstallsContext } from "@/hooks/use-model-install-config";
import { useZodForm } from "@/hooks/use-zod-form";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { InputGroup, Item, Table } from "@gnd/ui/composite";
import { Icons } from "@gnd/ui/icons";
import { SubmitButton } from "@gnd/ui/submit-button";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, DollarSign, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { useDebouncedCallback } from "use-debounce";
import z from "zod";

export function InstallConfiguration() {
    const { tasks, installCosts } = useBuilderModelInstallsContext();

    if (tasks?.length === 0) return <EmptyState />;
    return (
        <>
            <div className="h-screen">
                <Table>
                    <Table.Header className="bg-muted hover:bg-muted uppercase">
                        <Table.Row>
                            <Table.Head>Install Cost Item</Table.Head>
                            <Table.Head>Status</Table.Head>
                            <Table.Head>Max Qty</Table.Head>
                            <Table.Head>Estimate</Table.Head>
                            <Table.Head></Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {tasks?.map((task) => (
                            <Line task={task} key={task.id} />
                        ))}
                    </Table.Body>
                </Table>
            </div>
        </>
    );
}

function Line({
    task,
}: {
    task: RouterOutputs["community"]["getModelInstallTasksByBuilderTask"]["tasks"][number];
}) {
    const [status, setStatus] = useState(task.status);
    const [maxQty, setMaxQty] = useState(task?.qty || "");
    const { modelId } = useBuilderModelInstallsContext();
    // const values = form.watch();
    const { mutate, isPending, isError } = useMutation(
        _trpc.community.updateCommunityModelInstallTask.mutationOptions({
            onSuccess(data, variables, onMutateResult, context) {
                console.log({
                    data,
                });
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
        <Table.Row className={cn("hover:bg-transparent")} key={task.id}>
            <Table.Cell
                className={cn("border-l-2", isError && "border-destructive")}
            >
                <Item.Title>{task.installCostModel?.title}</Item.Title>
                <Item.Description>
                    ${task.installCostModel?.unitCost}
                    {task.installCostModel?.unit
                        ? `per ${task.installCostModel?.unit}`
                        : ""}
                </Item.Description>
            </Table.Cell>
            <Table.Cell>
                <Button
                    onClick={(e) => {
                        const newStatus =
                            status === "active" ? "inactive" : "active";
                        setStatus(newStatus);
                        handleUpdate({
                            maxQty,
                            status: newStatus,
                        });
                    }}
                    variant={status === "active" ? "default" : "secondary"}
                    size="sm"
                    className="w-16"
                >
                    {status}
                </Button>
            </Table.Cell>
            <Table.Cell>
                <InputGroup>
                    <InputGroup.Input
                        value={maxQty}
                        className="w-12"
                        // {...field}
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
                    {/* <InputGroup.Addon>$</InputGroup.Addon> */}
                </InputGroup>
                {/* {installCosts?.find(
                                        (cost) =>
                                            cost.builderTaskId === task.id,
                                    )?.qty || 0} */}
            </Table.Cell>
            <Table.Cell>
                $
                {task.installCostModel?.unitCost &&
                    (
                        (Number(maxQty) || 0) * task.installCostModel.unitCost
                    ).toFixed(2)}
            </Table.Cell>
            <Table.Cell>
                <>
                    <SubmitButton
                        className={cn(
                            "opacity-0",
                            (isError || isPending) && "opacity-100",
                        )}
                        isSubmitting={isPending}
                        onClick={(e) => {
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
                </>
            </Table.Cell>
        </Table.Row>
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

