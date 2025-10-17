import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import {
    communityModelCostFormSchema,
    saveCommunityModelCostSchema,
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

interface Props {
    model: RouterOutputs["community"]["communityModelCostHistory"];
}
export function CommunityModelCostForm({ model }: Props) {
    const trpc = useTRPC();
    const { editModelCostId, setParams } = useCommunityModelCostParams();
    const { data, isPending, error } = useQuery(
        trpc.community.communityModelCostForm.queryOptions(
            {
                id: editModelCostId,
            },
            {
                enabled: editModelCostId > 0,
            },
        ),
    );

    const qc = useQueryClient();
    const save = useMutation(
        trpc.community.saveCommunityModelCostForm.mutationOptions({
            onSuccess(data, variables, context) {
                toast({
                    title: "Saved",
                    variant: "success",
                });
                revalidatePathAction("/settings/community/community-templates");
                qc.invalidateQueries({
                    queryKey: trpc.community.communityModelCostForm.queryKey(),
                });
            },
            onError(error, variables, context) {
                toast({
                    title: "Unable to complete",
                    variant: "destructive",
                });
            },
        }),
    );
    useDebugConsole({
        d: save.data,
        e: save.error,
    });
    const { mutate: deleteCommunityModel } = useMutation(
        trpc.community.deleteCommunityModelCost.mutationOptions({
            onSuccess(data, variables, context) {
                toast({
                    title: "Deleted",
                    variant: "success",
                });
                revalidatePathAction("/settings/community/community-templates");
                qc.invalidateQueries({
                    queryKey: trpc.community.communityModelCostForm.queryKey(),
                });
                setParams({
                    editModelCostId: -1,
                });
            },
        }),
    );
    const form = useZodForm(saveCommunityModelCostSchema, {
        defaultValues: {
            id: null,
            startDate: null,
            endDate: null,
            costs: {},
            tax: {},
            communityModelId: null,
        },
    });
    const emptyCosts = () => ({
        costs: Object.fromEntries(model?.builderTasks?.map((t) => [t.uid, ""])),
        tax: Object.fromEntries(model?.builderTasks?.map((t) => [t.uid, ""])),
    });
    useEffect(() => {
        console.log({ data, editModelCostId, model });
        if (!model) return;
        if (editModelCostId == -1) {
            form.reset({
                startDate: null,
                id: null,
                endDate: null,
                ...emptyCosts(),
                model: model?.model?.modelName,
                meta: {},
                communityModelId: model?.model?.id,
            });
            return;
        }
        form.reset({
            endDate: data?.endDate! as any,
            id: data?.id,
            communityModelId: model?.model?.id,
            startDate: data?.startDate! as any,
            costs: Object.fromEntries(
                model?.builderTasks?.map((t) => [
                    t.uid,
                    data?.meta?.costs?.[t.uid] || "",
                ]),
            ),
            tax: Object.fromEntries(
                model?.builderTasks?.map((t) => [
                    t.uid,
                    data?.meta?.tax?.[t.uid] || "",
                ]),
            ),
            model: model?.model?.modelName,
            meta: data?.meta || {},
            pivotId: data?.pivotId,
        });
    }, [data, editModelCostId, model]);
    const onSubmit = async (formData) => {
        // console.log(formData);
        save.mutate({
            ...formData,
            meta: data?.meta,
            costs: Object.fromEntries(
                Object.entries(formData.costs)
                    .filter(([k, v]) => String(v)?.length > 0)
                    .map(([k, v]) => [k, +v]),
            ),
            tax: Object.fromEntries(
                Object.entries(formData.tax)
                    .filter(([k, v]) => String(v)?.length > 0)
                    .map(([k, v]) => [k, +v]),
            ),
        });
    };
    const [costs, tax] = form.watch(["costs", "tax"]);
    const total = sum(
        model?.builderTasks
            ?.map((t) => sum([costs?.[t.uid], tax?.[t.uid]]))
            .flat(),
    );
    return (
        <Form {...form}>
            <form className="grid grid-cols-2 gap-4">
                <Portal nodeId={"cmcAction"}>
                    <Menu noSize>
                        <Menu.Item
                            onClick={(e) => {
                                form.reset({
                                    ...emptyCosts(),
                                });
                            }}
                            icon="clear"
                        >
                            Clear Costs
                        </Menu.Item>
                        <Menu.Item
                            onClick={(e) => {
                                const copyData = deepCopy(form.getValues());
                                copyData.id = null;
                                copyData.startDate = null;
                                copyData.endDate = null;
                                setParams({
                                    editModelCostId: -1,
                                });
                                setTimeout(() => {
                                    form.reset({
                                        ...copyData,
                                    });
                                }, 1000);
                            }}
                            icon="copy"
                            disabled={editModelCostId == -1}
                        >
                            Create Copy
                        </Menu.Item>
                        <Menu.Trash
                            action={(e) => {
                                if (editModelCostId != -1)
                                    deleteCommunityModel({
                                        modelCostId: editModelCostId,
                                    });
                            }}
                            // disabled={editModelCostId == -1}
                            // className="bg-destructive text-destructive-foreground"
                        >
                            Delete
                        </Menu.Trash>
                    </Menu>
                </Portal>
                {/* {JSON.stringify(form.)} */}
                <FormDate
                    control={form.control}
                    name="startDate"
                    label="Start Date"
                />
                <FormDate
                    control={form.control}
                    name="endDate"
                    label="End Date"
                />
                <div className="col-span-2">
                    <Table className="table-sm w-full">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Task</TableHead>
                                <TableHead className="w-32">Cost $</TableHead>
                                <TableHead className="w-32">Tax $</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {model?.builderTasks?.map((task, ti) => (
                                <TableRow key={ti}>
                                    <TableCell>
                                        <TCell.Primary>
                                            {task?.name}
                                        </TCell.Primary>
                                    </TableCell>
                                    <TableCell>
                                        <FormInput
                                            control={form.control}
                                            name={`costs.${task.uid}`}
                                            numericProps={{
                                                prefix: "$",
                                                placeholder: "$0.00",
                                                className: "h-8 w-24",
                                                type: "tel",
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <FormInput
                                            control={form.control}
                                            name={`tax.${task.uid}`}
                                            numericProps={{
                                                prefix: "$",
                                                placeholder: "$0.00",
                                                className: "h-8 w-24",
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
                            <Money value={total} />
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

