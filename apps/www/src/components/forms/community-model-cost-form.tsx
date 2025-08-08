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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { TCell } from "../(clean-code)/data-table/table-cells";
import { CustomModalPortal } from "../modals/custom-modal";
import { DialogFooter } from "@gnd/ui/dialog";
import { SubmitButton } from "../submit-button";
import FormInput from "../common/controls/form-input";
import { useDebugPrint } from "@/hooks/use-debug-print";
import { sum } from "@gnd/utils";
import Money from "../_v1/money";
import { toast } from "@gnd/ui/use-toast";
import { Button } from "@gnd/ui/button";
import { FormDebugBtn } from "../form-debug-btn";
import FormDate from "../common/controls/form-date";
import { revalidatePathAction } from "@/actions/revalidate-path";
import { useQueryState } from "nuqs";

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
    useEffect(() => {
        if (!model) return;
        if (editModelCostId == -1) {
            form.reset({
                startDate: null,
                id: null,
                endDate: null,
                costs: Object.fromEntries(
                    model?.builderTasks?.map((t) => [t.uid, ""]),
                ),
                tax: Object.fromEntries(
                    model?.builderTasks?.map((t) => [t.uid, ""]),
                ),
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

