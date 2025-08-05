import { useZodForm } from "@/hooks/use-zod-form";
import { Form } from "@gnd/ui/form";
import { CustomModalPortal } from "../modals/custom-modal";
import { DialogFooter } from "@gnd/ui/dialog";
import { SubmitButton } from "../submit-button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import {
    communityTemplateFormSchema,
    createCommunityModelCostSchema,
} from "@api/schemas/community";
import FormInput from "../common/controls/form-input";
import { useMemo } from "react";
import { FormCombobox } from "../common/controls/form-combobox";
import { z } from "zod";
import {
    useCommunityBuildersList,
    useCommunityProjectList,
} from "@/hooks/use-community-lists";
import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";
import { toast } from "@gnd/ui/use-toast";

interface Props {}
// const schema = z.object({
//     projectId: z.number(),
//     builderId: z.number()
// })
export function CreateModelCostForm({}: Props) {
    const form = useZodForm(createCommunityModelCostSchema, {
        defaultValues: {
            modelName: "",
            builderId: null,
            builderName: "",
        },
    });
    const trpc = useTRPC();
    const qc = useQueryClient();
    const { setParams } = useCommunityModelCostParams();
    const saveTemplateMutate = useMutation(
        trpc.community.createCommunityModelCost.mutationOptions({
            onSuccess(data, variables, context) {
                qc.invalidateQueries({
                    //  queryKey: trpc..queryKey()
                });
                setParams(null);
                toast({
                    title: "Saved",
                });
            },
        }),
    );
    const { options: buildersOptions } = useCommunityBuildersList(true);

    async function onSubmit(
        formData: z.infer<typeof createCommunityModelCostSchema>,
    ) {
        formData.builderName = buildersOptions.find(
            (b) => b.data.id === formData.builderId,
        ).data.name;

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
                    name="builderId"
                    label="Builder"
                    transformSelectionValue={(data) => Number(data.id)}
                    comboProps={{
                        items: buildersOptions,
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

