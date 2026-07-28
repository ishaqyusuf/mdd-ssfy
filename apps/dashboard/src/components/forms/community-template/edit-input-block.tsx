import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { saveCommunityInputSchema } from "@community/community-template-schemas";
import { Form } from "@gnd/ui/form";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { useTemplateSchemaBlock, useTemplateSchemaContext } from "./context";
import { FormInput } from "@gnd/ui/controls/form-input";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@gnd/ui/use-toast";

interface Props {
    uid: string;
}
export function EditInputBlock(props: Props) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    // return <Suspense fallback={<Skeletons.Card/>}>
    //     <BlockForm {{...props}}/>
    // </Suspense>
    // }
    // function BlockForm(props: Props)
    // {
    const ctx = useTemplateSchemaContext();
    const b = useTemplateSchemaBlock();
    const input = ctx.blockInputs.find((a) => a.uid == props.uid);
    const form = useZodForm(saveCommunityInputSchema, {
        defaultValues: {
            title: input.inv?.name,
            blockId: b.blockId,
        },
    });
    const { mutate, isPending } = useMutation(
        trpc.inventories.saveCommunityInput.mutationOptions({
            onSuccess() {
                queryClient.invalidateQueries({
                    queryKey: trpc.community.getCommunitySchema.queryKey({}),
                });
            },
        })
    );
    const submit = (data) => {
        if (!data.title) {
            toast({
                variant: "destructive",
                title: "Title is required",
            });
            return;
        }
        mutate(data);
    };
    const { mutate: deleteInventoryInput, isPending: isDeleting } = useMutation(
        trpc.community.deleteInputInventoryBlock.mutationOptions({
            onSuccess(data, variables, context) {},
            onError(error, variables, context) {},
        })
    );
    const _delete = () => {
        deleteInventoryInput({
            uid: input.inv.uid,
        });
    };
    return (
        <div className="w-[300px] p-2 grid gap-4">
            <div className="flex items-center gap-4">
                <h3 className="font-bold">Edit</h3>
                <div className="flex-1"></div>
                {/* <ConfirmBtn trash size="sm" onClick={_delete} /> */}
            </div>
            <Form {...form}>
                <form
                    className="grid gap-4"
                    onSubmit={form.handleSubmit(submit)}
                >
                    <FormInput
                        label="Title"
                        control={form.control}
                        name="title"
                    />
                    <div className="flex justify-end">
                        <SubmitButton isSubmitting={isPending}>
                            Save
                        </SubmitButton>
                    </div>
                </form>
            </Form>
        </div>
    );
}
