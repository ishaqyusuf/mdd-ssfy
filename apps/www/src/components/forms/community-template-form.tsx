import { useZodForm } from "@/hooks/use-zod-form";
import { Form } from "@gnd/ui/form";
import { z } from "zod";
import { CustomModalPortal } from "../modals/custom-modal";
import { DialogFooter } from "@gnd/ui/dialog";
import { SubmitButton } from "../submit-button";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { communityTemplateFormSchema } from "@api/schemas/community";
import FormInput from "../common/controls/form-input";

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
    async function onSubmit({}) {}
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <FormInput
                    label="Model Name"
                    control={form.control}
                    name="modelName"
                />

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

