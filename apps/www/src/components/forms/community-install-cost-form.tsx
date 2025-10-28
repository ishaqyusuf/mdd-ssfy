import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import {
    communityInstallCostFormSchema,
    communityModelCostFormSchema,
    saveCommunityModelCostSchema,
    updateInstallCostSchema,
} from "@api/db/queries/community";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { Form } from "@gnd/ui/form";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { useEffect } from "react";
import { TCell } from "../(clean-code)/data-table/table-cells";
import { CustomModalPortal } from "../modals/custom-modal";
import { DialogFooter } from "@gnd/ui/dialog";
import { SubmitButton } from "../submit-button";
import FormInput from "../common/controls/form-input";
import { sum } from "@gnd/utils";
import Money from "../_v1/money";
import { toast } from "@gnd/ui/use-toast";
import { FormDebugBtn } from "../form-debug-btn";
import FormDate from "../common/controls/form-date";
import { revalidatePathAction } from "@/actions/revalidate-path";
import { useQueryState } from "nuqs";
import Portal from "../_v1/portal";
import { Menu } from "../(clean-code)/menu";
import { deepCopy } from "@/lib/deep-copy";
import { useDebugConsole } from "@/hooks/use-debug-console";
import { useFieldArray } from "react-hook-form";
import { cn } from "@gnd/ui/cn";
import { Select } from "@gnd/ui/composite";

interface Props {
    model: RouterOutputs["community"]["communityInstallCostForm"];
}
export function CommunityInstallCostForm({ model }: Props) {
    const trpc = useTRPC();
    const { editModelCostId, setParams } = useCommunityModelCostParams();

    const qc = useQueryClient();
    const save = useMutation(
        trpc.community.updateInstallCost.mutationOptions({
            onSuccess(data, variables, context) {
                toast({
                    title: "Saved",
                    variant: "success",
                });
                revalidatePathAction("/settings/community/community-templates");
                qc.invalidateQueries({
                    queryKey:
                        trpc.community.communityInstallCostForm.queryKey(),
                });
            },
            onError(error, variables, context) {
                toast({
                    title: "Unable to complete",
                    variant: "destructive",
                });
            },
        })
    );

    const form = useZodForm(updateInstallCostSchema, {
        defaultValues: {
            // projectId: model?.projectId,
            pivotId: model?.pivotId,
            communitModelId: model?.communitModelId,
            meta: model?.meta,
            installCost: model?.installCost,
            // costIndex: model?.costIndex,
        },
    });
    // const { append, fields } = useFieldArray({
    //     control: form.control,
    //     name: "installCosts",
    //     keyName: "_id",
    // });
    // const costIndex = form.watch("costIndex");
    const onSubmit = async (formData) => {
        save.mutate({
            ...formData,
        });
    };
    // const [costs, tax] = form.watch(["costs", "tax"]);
    // const total = sum(
    //     model?.builderTasks
    //         ?.map((t) => sum([costs?.[t.uid], tax?.[t.uid]]))
    //         .flat()
    // );
    return (
        <Form {...form}>
            <form className="grid grid-cols-2 gap-4">
                {/* <Portal noDelay nodeId="installCostModalAction">
                    <Select.Root
                        value={String(costIndex)}
                        onValueChange={(e) => {
                            setParams({
                                editModelCostId: Number(e),
                            });
                        }}
                    >
                        <Select.Trigger className="h-8">
                            <Select.Value placeholder="Install Costs" />
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value="-1">New Cost</Select.Item>
                            {fields?.map((r) => (
                                <Select.Item
                                    className=""
                                    value={String(r.uid)}
                                    key={r.uid}
                                >
                                    <div className="flex gap-4">
                                        <span>{r.title}</span>
                                        <span className="font-semibold">
                                            <Money
                                                value={r?.meta?.grandTotal}
                                            />
                                        </span>
                                    </div>
                                </Select.Item>
                            ))}
                        </Select.Content>
                    </Select.Root>
                </Portal> */}
                <div className="col-span-2">
                    <Table className="table-sm w-full">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Task</TableHead>
                                <TableHead className="w-32">Def. Qty</TableHead>
                                <TableHead className="w-32">Qty</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {model?.config?.list?.map((task, ti) => (
                                <TableRow
                                    className={cn(
                                        form.getValues(
                                            `installCost.costings.${task.uid}` as any
                                        ) > 0
                                            ? "bg-teal-50"
                                            : ""
                                    )}
                                    key={ti}
                                >
                                    <TableCell>
                                        <TCell.Primary>
                                            {task?.title}
                                        </TCell.Primary>
                                        <TCell.Secondary>
                                            <Money value={task.cost} />
                                            {" per qty"}
                                        </TCell.Secondary>
                                    </TableCell>

                                    <TableCell></TableCell>
                                    <TableCell>
                                        <FormInput
                                            control={form.control}
                                            name={`installCost.costings.${task.uid}`}
                                            numericProps={{
                                                // prefix: "$",
                                                placeholder: "0",
                                                className: "h-8 w-16",
                                                type: "tel",
                                            }}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <CustomModalPortal>
                    <DialogFooter className="flex items-center justify-end gap-4">
                        <div className="text-xl font-semibold">
                            {/* <Money value={total} /> */}
                        </div>

                        <FormDebugBtn />
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            <SubmitButton isSubmitting={save.isPending}>
                                Save
                            </SubmitButton>
                        </form>
                    </DialogFooter>
                </CustomModalPortal>
            </form>
        </Form>
    );
}

