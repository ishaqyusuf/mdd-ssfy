import { useZodForm } from "@/hooks/use-zod-form";
import { Form } from "@gnd/ui/form";
import { CustomModalPortal } from "../modals/custom-modal";
import { DialogFooter } from "@gnd/ui/dialog";
import { SubmitButton } from "../submit-button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { communityTemplateFormSchema } from "@api/schemas/community";
import FormInput from "../common/controls/form-input";
import { useMemo } from "react";
import { FormCombobox } from "../common/controls/form-combobox";

interface Props {
    data;
}
// const schema = z.object({
//     projectId: z.number(),
//     builderId: z.number()
// })
export function CommunityTemplateForm({ data }: Props) {
    const form = useZodForm(communityTemplateFormSchema);
    const trpc = useTRPC();
    const saveTemplateMutate = useMutation(
        trpc.community.saveCommunityTemplateData.mutationOptions({
            onSuccess(data, variables, context) {},
        }),
    );
    const {
        data: projects,
        isPending,
        error,
    } = useQuery(
        trpc.community.projectsList.queryOptions(null, {
            enabled: true,
        }),
    );
    const projectList = useMemo(() => {
        if (!projects) return [];
        console.log(projects);
        return projects.map((project) => ({
            label: project.title,
            id: String(project.id),
            data: project,
        }));
    }, [projects]);
    // useEffect(() => {
    //     console.log(projects);
    //     console.log(error);
    // }, [projects, error]);
    async function onSubmit({}) {}
    const projectId = form.watch("projectId");
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
                    <DialogFooter className="">
                        <SubmitButton
                            isSubmitting={saveTemplateMutate.isPending}
                        >
                            Save
                        </SubmitButton>
                    </DialogFooter>
                </CustomModalPortal>
            </form>
        </Form>
    );
}

