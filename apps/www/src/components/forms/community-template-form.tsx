import { useZodForm } from "@/hooks/use-zod-form";
import { Form } from "@gnd/ui/form";
import { CustomModalPortal } from "../modals/custom-modal";
import { DialogFooter } from "@gnd/ui/dialog";
import { SubmitButton } from "../submit-button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { communityTemplateFormSchema } from "@api/schemas/community";
import FormInput from "../common/controls/form-input";
import { useMemo } from "react";
import { FormCombobox } from "../common/controls/form-combobox";
import { z } from "zod";

interface Props {
    data;
}
// const schema = z.object({
//     projectId: z.number(),
//     builderId: z.number()
// })
export function CommunityTemplateForm({ data }: Props) {
    const form = useZodForm(communityTemplateFormSchema, {
        defaultValues: {
            modelName: "",
            id: undefined,
            projectId: null,
        },
    });
    const trpc = useTRPC();
    const qc = useQueryClient();
    const saveTemplateMutate = useMutation(
        trpc.community.saveCommunityTemplateData.mutationOptions({
            onSuccess(data, variables, context) {
                qc.invalidateQueries({
                    //  queryKey: trpc..queryKey()
                });
            },
        }),
    );
    const { data: projects } = useQuery(
        trpc.community.projectsList.queryOptions(null, {
            enabled: true,
        }),
    );
    const projectList = projects?.map((project) => ({
        label: project.title,
        id: String(project.id),
        data: project,
    }));
    async function onSubmit(
        formData: z.infer<typeof communityTemplateFormSchema>,
    ) {
        // console.log(formData);
        formData.projectName = projectList.find(
            (p) => formData.projectId === +p.id,
        )?.label;
        saveTemplateMutate.mutate({
            ...formData,
        });
    }
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <FormInput
                    label="Model Name"
                    control={form.control}
                    name="modelName"
                />
                <FormCombobox
                    control={form.control}
                    name="projectId"
                    label="Project"
                    transformSelectionValue={(data) => Number(data.id)}
                    comboProps={{
                        items: projectList,
                    }}
                />
                {/* <span>{projectId}</span> */}
                <CustomModalPortal>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <DialogFooter className="">
                            <SubmitButton
                                isSubmitting={saveTemplateMutate.isPending}
                            >
                                Save
                            </SubmitButton>
                        </DialogFooter>
                    </form>
                </CustomModalPortal>
            </form>
        </Form>
    );
}

