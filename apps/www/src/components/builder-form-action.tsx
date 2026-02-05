import { useTRPC } from "@/trpc/client";
import { BuilderFormSchema } from "@community/schema";
import { SubmitButton } from "@gnd/ui/submit-button";
import { useMutation } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";

export function BuilderFormAction() {
    const form = useFormContext<BuilderFormSchema>();
    const { mutate: saveBuilder, isPending } = useMutation(
        useTRPC().community.saveBuilder.mutationOptions({
            onSuccess(data, variables, onMutateResult, context) {},
            meta: {
                toastTitle: {
                    error: "Unable to complete",
                    loading: "Processing...",
                    success: "Done!.",
                },
            },
        }),
    );
    return (
        <div>
            <form
                onSubmit={form.handleSubmit(
                    (data) => {
                        console.log("Form submitted with data:", data);
                        // saveBuilder(data);
                    },
                    (e) => {
                        console.log("Form errors:", e);
                    },
                )}
            >
                <SubmitButton
                    isSubmitting={isPending}
                    type="submit"
                    // disabled={
                    //     !form.formState.isDirty || !form.formState.isValid
                    // }
                >
                    Save Builder
                </SubmitButton>
            </form>
        </div>
    );
}

