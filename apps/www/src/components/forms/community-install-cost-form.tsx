import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import Portal from "@gnd/ui/custom/portal";
import { DialogFooter } from "@gnd/ui/dialog";
import { Form } from "@gnd/ui/form";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useEffect, useMemo } from "react";
import { FormDebugBtn } from "../form-debug-btn";
import { CustomModalPortal } from "../modals/custom-modal";
import { SubmitButton } from "../submit-button";
import { DataTable as CommunityInstallCostFormTasksTable } from "../tables-2/community-install-cost-form-tasks/data-table";
import {
    type CommunityInstallCostFormValues,
    communityInstallCostFormTasksSchema,
} from "../tables-2/community-install-cost-form-tasks/schema";

interface Props {
    model: RouterOutputs["community"]["communityInstallCostForm"];
}

export function CommunityInstallCostForm({ model }: Props) {
    const trpc = useTRPC();
    const { setParams, openToSide } = useCommunityInstallCostParams();

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
        communityInstallCostFormTasksSchema,
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
        form.reset({
            // projectId: model?.projectId,
            pivotId: model?.pivotId,
            communityModelId: model?.communityModelId,
            meta: model?.meta,
            installCost: model?.installCost,
            // costIndex: model?.costIndex,
        });
    }, [form, model]);
    const onSubmit = async (formData: CommunityInstallCostFormValues) => {
        const installCost = Object.fromEntries(
            Object.entries(formData?.installCost || {})?.filter(
                ([a, b]) => !!b,
            ),
        );
        const pivotMeta = (model?.meta?.pivot || {}) as Record<string, unknown>;
        const meta = {
            communityModel: {
                ...(model?.meta?.communityModel || {}),
                installCosts: [installCost],
            },
            pivot: {
                ...pivotMeta,
                installCost,
            },
        };

        save.mutate({
            // ...formData,
            pivotId: model?.pivotId,
            communityModelId: model?.communityModelId,
            meta,
        });
    };
    const installCostValues = form.watch("installCost");
    const activeTaskUids = useMemo(
        () =>
            new Set(
                Object.entries(installCostValues || {})
                    .filter(([, value]) => Number(value) > 0)
                    .map(([uid]) => uid),
            ),
        [installCostValues],
    );
    const taskRows =
        model?.config?.list?.map((task, index) => ({
            uid: String(task.uid ?? task.id ?? task.title ?? index),
            title: task.title ?? null,
            cost: task.cost ?? null,
            defaultQty: task.defaultQty ?? null,
        })) || [];

    const Actions = (
        <>
            <div className="text-xl font-semibold">
                {/* <Money value={total} /> */}
            </div>

            <FormDebugBtn />
            <form onSubmit={form.handleSubmit(onSubmit, (e) => {})}>
                <SubmitButton isSubmitting={save.isPending}>Save</SubmitButton>
            </form>
        </>
    );
    return (
        <Form {...form}>
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <CommunityInstallCostFormTasksTable
                        activeTaskUids={activeTaskUids}
                        control={form.control}
                        data={taskRows}
                    />
                </div>
                {openToSide ? (
                    <Portal nodeId={"install-cost-sidebar-footer"}>
                        {Actions}
                    </Portal>
                ) : (
                    <CustomModalPortal>
                        <DialogFooter className="flex items-center justify-end gap-4">
                            {Actions}
                        </DialogFooter>
                    </CustomModalPortal>
                )}
            </div>
        </Form>
    );
}
