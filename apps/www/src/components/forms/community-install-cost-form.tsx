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
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { useEffect } from "react";
import { TCell } from "../(clean-code)/data-table/table-cells";
import { CustomModalPortal } from "../modals/custom-modal";
import { DialogFooter } from "@gnd/ui/dialog";
import { SubmitButton } from "../submit-button";
import FormInput from "../common/controls/form-input";
import Money from "../_v1/money";
import { toast } from "@gnd/ui/use-toast";
import { FormDebugBtn } from "../form-debug-btn";
import { cn } from "@gnd/ui/cn";

import { Env } from "../env";
import { Field } from "@gnd/ui/composite";
import { Controller } from "react-hook-form";
import { Input } from "@gnd/ui/input";

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
                // revalidatePathAction("/settings/community/community-templates");
                qc.invalidateQueries({
                    queryKey:
                        trpc.community.communityInstallCostForm.queryKey(),
                });
                setParams(null);
            },
            onError(error, variables, context) {
                console.log({ error, variables, model });
                toast({
                    title: "Unable to complete",
                    variant: "destructive",
                });
            },
        }),
    );
    const form = useZodForm(
        updateInstallCostSchema.extend({
            installCost: z4.any().optional().nullable(),
        }),
        {
            defaultValues: {
                pivotId: model?.pivotId,
                communityModelId: model?.communityModelId,
                meta: model?.meta,
                installCost: model?.installCost,
            },
        },
    );
    useEffect(() => {
        console.log({ model });
        form.reset({
            // projectId: model?.projectId,
            pivotId: model?.pivotId,
            communityModelId: model?.communityModelId,
            meta: model?.meta,
            installCost: model?.installCost,
            // costIndex: model?.costIndex,
        });
    }, [model]);
    const onSubmit = async (formData) => {
        const installCost = Object.fromEntries(
            Object.entries(formData?.installCost || {})?.filter(
                ([a, b]) => !!b,
            ),
        );
        const meta = {
            communityModel: {
                ...(model?.meta?.communityModel || {}),
                installCosts: [installCost],
            },
            pivot: {
                ...(model?.meta?.pivot || {}),
                installCost,
            },
        };
        console.log({ meta, model });
        save.mutate({
            // ...formData,
            pivotId: model?.pivotId,
            communityModelId: model?.communityModelId,
            meta,
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
                                            `installCost.${task.uid}` as any,
                                        ) > 0
                                            ? "bg-teal-50"
                                            : "",
                                    )}
                                    key={ti}
                                >
                                    <TableCell>
                                        <TCell.Primary>
                                            {task?.title}
                                            <Env isDev>{task?.uid}</Env>
                                        </TCell.Primary>
                                        <TCell.Secondary>
                                            <Money value={task.cost} />
                                            {" per qty"}
                                        </TCell.Secondary>
                                    </TableCell>

                                    <TableCell></TableCell>
                                    <TableCell>
                                        <Field.Group>
                                            <Controller
                                                control={form.control}
                                                name={`installCost.${task.uid}`}
                                                render={(props) => (
                                                    <Input
                                                        placeholder="0"
                                                        className="h-8 w-16"
                                                        // type="tel"
                                                        {...props.field}
                                                        value={String(
                                                            props.field?.value
                                                                ? props.field
                                                                      ?.value
                                                                : "",
                                                        )}
                                                    />
                                                )}
                                            />
                                        </Field.Group>
                                        {/* <FormInput
                                            control={form.control}
                                            name={`installCost.${task.uid}`}
                                            numericProps={{
                                                // prefix: "$",
                                                placeholder: "0",
                                                className: "h-8 w-16",
                                                type: "tel",
                                            }}
                                        /> */}
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
                        <form
                            onSubmit={form.handleSubmit(onSubmit, (e) => {
                                console.log(e);
                            })}
                        >
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

