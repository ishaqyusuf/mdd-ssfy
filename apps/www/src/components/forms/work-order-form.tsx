import { useZodForm } from "@/hooks/use-zod-form";
import { Form } from "@gnd/ui/form";
import { CustomModalPortal } from "../modals/custom-modal";
import { DialogFooter } from "@gnd/ui/dialog";
import { SubmitButton } from "../submit-button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { createCommunityModelCostSchema } from "@api/schemas/community";
import FormInput from "../common/controls/form-input";
import { FormCombobox } from "../common/controls/form-combobox";
import { z } from "zod";
import { useCommunityBuildersList } from "@/hooks/use-community-lists";
import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";
import { toast } from "@gnd/ui/use-toast";
import { workOrderFormSchema } from "@api/db/queries/work-order";
import { useEffect, useMemo, useState } from "react";
import { debugToast } from "@/hooks/use-debug-console";
import FormSelect from "../common/controls/form-select";
import { labelValueOptions } from "@gnd/utils";
import FormDate from "../common/controls/form-date";
import { FormDebugBtn } from "../form-debug-btn";

interface Props {
    data?;
}
// const schema = z.object({
//     projectId: z.number(),
//     builderId: z.number()
// })
export function WorkOrderForm({ data }: Props) {
    const form = useZodForm(workOrderFormSchema, {
        defaultValues: data || {},
    });
    useEffect(() => {
        if (data) form.reset(data);
    }, [data]);
    const trpc = useTRPC();
    const qc = useQueryClient();
    const { data: projectList } = useQuery(
        trpc.community.workOrder.projectsList.queryOptions(),
    );
    const [block, lot, projectName, id] = form.watch([
        "block",
        "lot",
        "projectName",
        "id",
    ]);
    const [findHomeOwnerUid, setFindHomeOwnerUid] = useState(null);
    const { data: homeOwner } = useQuery(
        trpc.community.workOrder.findHomeOwner.queryOptions(
            {
                block,
                lot,
                projectName,
            },
            {
                enabled: !!findHomeOwnerUid && !id,
            },
        ),
    );
    useEffect(() => {
        if (!homeOwner) return;
        Object.entries(homeOwner as any).map(([k, v]) => {
            form.setValue(k as any, v);
        });
    }, [homeOwner]);

    const project = useMemo(() => {
        return projectList?.find((p) => p?.title === projectName);
    }, [projectName, projectList]);
    // const
    // const units = useMemo(() => {},[projectList,])
    const { setParams } = useCommunityModelCostParams();
    const saveTemplateMutate = useMutation(
        trpc.community.workOrder.saveWorkOrderForm.mutationOptions({
            onSuccess(data, variables, context) {
                qc.invalidateQueries({
                    //  queryKey: trpc..queryKey()
                });
                setParams(null);
                toast({
                    title: "Saved",
                });
            },
            onError(error, variables, context) {
                debugToast("Work order", error);
            },
        }),
    );
    const { options: buildersOptions } = useCommunityBuildersList(true);

    async function onSubmit(formData: z.infer<typeof workOrderFormSchema>) {
        saveTemplateMutate.mutate({
            ...formData,
        });
    }
    return (
        <Form {...form}>
            <div
                className="grid grid-cols-2 gap-4
                "
            >
                <FormCombobox
                    control={form.control}
                    name="projectName"
                    label="Project"
                    // transformSelectionValue={(data) => Number(data.id)}

                    comboProps={{
                        onSelect(item) {
                            form.setValue("lot", null);
                            form.setValue("block", null);
                            form.setValue("meta.lotBlock", null);
                            debugToast("Selected Project", item);
                        },
                        items: projectList?.map((a) => ({
                            label: a.title,
                            id: a.title,
                            disabled: !a.active,
                        })),
                    }}
                />
                <FormCombobox
                    control={form.control}
                    name="meta.lotBlock"
                    label="Unit"
                    // transformSelectionValue={(data) => Number(data.id)}
                    comboProps={{
                        onSelect(item) {
                            form.setValue("lot", item?.data?.lot);
                            form.setValue("block", item?.data?.block);
                            form.setValue(
                                "meta.lotBlock",
                                item?.data?.lotBlock,
                            );
                            debugToast("Selected Project", item);
                        },
                        disabled: !project?.active,
                        items: project?.homes?.map((a) => ({
                            label: a.lotBlock,
                            id: a.lotBlock,
                            data: a,
                        })),
                    }}
                />
                <FormInput
                    label="Supervisor"
                    control={form.control}
                    name="supervisor"
                    className="col-span-2"
                />
                <FormDate
                    control={form.control}
                    name="requestDate"
                    label="Request Date"
                />
                <FormSelect
                    control={form.control}
                    name="status"
                    label="Status"
                    options={labelValueOptions([
                        "Pending",
                        "Scheduled",
                        "Incomplete",
                        "Completed",
                    ])}
                />
                <FormInput
                    label="Home Owner"
                    control={form.control}
                    name="homeOwner"
                    className=""
                />
                <FormInput
                    label="Home/Cell"
                    control={form.control}
                    name="homePhone"
                    className=""
                />
                <FormDate
                    control={form.control}
                    name="scheduleDate"
                    placeholder="Schedule Date"
                    label="Schedule Date"
                />
                <FormSelect
                    control={form.control}
                    name="scheduleTime"
                    label="Schedule Time"
                    options={labelValueOptions(["8AM To 12PM", "1PM To 4PM"])}
                />
                <FormInput
                    label="Home Address"
                    control={form.control}
                    name="homeAddress"
                    className="col-span-2"
                />
                <FormInput
                    label="Work Description"
                    control={form.control}
                    name="description"
                    type="textarea"
                    className="col-span-2"
                />
            </div>

            {/* <span>{projectId}</span> */}
            <CustomModalPortal>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <DialogFooter className="">
                        <FormDebugBtn />
                        <SubmitButton
                            isSubmitting={saveTemplateMutate.isPending}
                        >
                            Save
                        </SubmitButton>
                    </DialogFooter>
                </form>
            </CustomModalPortal>
        </Form>
    );
}

