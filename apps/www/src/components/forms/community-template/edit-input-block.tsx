import { _qc, _trpc } from "@/components/static-trpc";
import { useZodForm } from "@/hooks/use-zod-form";
import { saveCommunityInputSchema } from "@community/community-template-schemas";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { Form } from "@gnd/ui/form";
import { useMutation } from "@tanstack/react-query";
import { Suspense } from "react";
import { useSchemaBlockContext, useTemplateBlocksContext } from "./context";
import { FormInput } from "@gnd/ui/controls/form-input";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@gnd/ui/use-toast";

interface Props {
    uid: string;
}
export function EditInputBlock(props: Props) {
    // return <Suspense fallback={<Skeletons.Card/>}>
    //     <BlockForm {{...props}}/>
    // </Suspense>
    // }
    // function BlockForm(props: Props)
    // {
    const ctx = useTemplateBlocksContext();
    const b = useSchemaBlockContext();
    const input = ctx.blockInputs.find((a) => a.uid == props.uid);
    const form = useZodForm(saveCommunityInputSchema, {
        defaultValues: {
            title: input.inv?.name,
            blockId: b.blockId,
        },
    });
    const { mutate, isPending } = useMutation(
        _trpc.inventories.saveCommunityInput.mutationOptions({
            onSuccess() {
                _qc.invalidateQueries({
                    queryKey: _trpc.community.getCommunitySchema.queryKey({}),
                });
            },
        }),
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
    return (
        <div className="w-[300px] p-2">
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

