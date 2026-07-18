import { revalidatePathAction } from "@/actions/revalidate-path";
import { invalidatePageTabsForPathKeys } from "@/components/page-tabs";
import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";
import { useZodForm } from "@/hooks/use-zod-form";
import { deepCopy } from "@/lib/deep-copy";
import { useTRPC } from "@/trpc/client";
import {
    type SaveCommunityModelCost,
    saveCommunityModelCostSchema,
} from "@api/schemas/community";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { DialogFooter } from "@gnd/ui/dialog";
import { Form } from "@gnd/ui/form";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { sum } from "@gnd/utils";
import { useCallback, useEffect } from "react";
import { Menu } from "../(clean-code)/menu";
import Money from "../_v1/money";
import Portal from "../_v1/portal";
import FormDate from "../common/controls/form-date";
import { FormDebugBtn } from "../form-debug-btn";
import { CustomModalPortal } from "../modals/custom-modal";
import { SubmitButton } from "../submit-button";
import { DataTable as CommunityModelCostFormTasksTable } from "../tables-2/community-model-cost-form-tasks/data-table";

interface Props {
    model: RouterOutputs["community"]["communityModelCostHistory"];
}
export function CommunityModelCostForm({ model }: Props) {
    const trpc = useTRPC();
    const {
        editModelCostId,
        onClose,
        returnToUnitInvoice,
        setParams,
    } = useCommunityModelCostParams();
    const { data } = useQuery(
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
            onSuccess() {
                toast({
                    title: "Saved",
                    variant: "success",
                });
                revalidatePathAction("/settings/community/community-templates");
                qc.invalidateQueries({
                    queryKey: trpc.community.communityModelCostForm.queryKey(),
                });
                qc.invalidateQueries({
                    queryKey: trpc.community.communityModelCostHistory.queryKey(),
                });
                if (returnToUnitInvoice?.editUnitInvoiceId) {
                    qc.invalidateQueries({
                        queryKey: trpc.community.getUnitInvoices.infiniteQueryKey(),
                    });
                    qc.invalidateQueries({
                        queryKey: trpc.community.getUnitInvoiceForm.queryKey({
                            homeId: returnToUnitInvoice.editUnitInvoiceId,
                        }),
                    });
                    invalidatePageTabsForPathKeys(qc, trpc, "unitInvoices");
                    onClose();
                }
            },
            onError() {
                toast({
                    title: "Unable to complete",
                    variant: "destructive",
                });
            },
        }),
    );

    const { mutate: deleteCommunityModel } = useMutation(
        trpc.community.deleteCommunityModelCost.mutationOptions({
            onSuccess() {
                toast({
                    title: "Deleted",
                    variant: "success",
                });
                revalidatePathAction("/settings/community/community-templates");
                qc.invalidateQueries({
                    queryKey: trpc.community.communityModelCostForm.queryKey(),
                });
                if (returnToUnitInvoice?.editUnitInvoiceId) {
                    qc.invalidateQueries({
                        queryKey: trpc.community.getUnitInvoices.infiniteQueryKey(),
                    });
                    qc.invalidateQueries({
                        queryKey: trpc.community.getUnitInvoiceForm.queryKey({
                            homeId: returnToUnitInvoice.editUnitInvoiceId,
                        }),
                    });
                    invalidatePageTabsForPathKeys(qc, trpc, "unitInvoices");
                    onClose();
                    return;
                }
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
    const emptyCosts = useCallback(
        () => ({
            costs: Object.fromEntries(
                model?.builderTasks?.map((t) => [t.uid, ""]) ?? [],
            ),
            tax: Object.fromEntries(
                model?.builderTasks?.map((t) => [t.uid, ""]) ?? [],
            ),
        }),
        [model?.builderTasks],
    );
    useEffect(() => {
        if (!model) return;
        if (editModelCostId === -1) {
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
            endDate: data?.endDate ? new Date(data.endDate) : null,
            id: data?.id,
            communityModelId: model?.model?.id,
            startDate: data?.startDate ? new Date(data.startDate) : null,
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
    }, [data, editModelCostId, emptyCosts, form, model]);
    const onSubmit = async (formData: SaveCommunityModelCost) => {
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
        (model?.builderTasks ?? []).map((t) => sum([costs?.[t.uid], tax?.[t.uid]])),
    );
    const taskRows =
        model?.builderTasks?.map((task) => ({
            uid: task.uid,
            name: task.name || null,
        })) || [];

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
                            disabled={editModelCostId === -1}
                        >
                            Create Copy
                        </Menu.Item>
                        <Menu.Trash
                            action={(e) => {
                                if (editModelCostId !== -1)
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
                    <CommunityModelCostFormTasksTable
                        data={taskRows}
                        control={form.control}
                    />
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
