import { useTRPC } from "@/trpc/client";
import { BuilderFormSchema } from "@community/schema";
import { SubmitButton } from "@gnd/ui/submit-button";
import { useMutation } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";
import { _qc } from "./static-trpc";
import { useBuilderParams } from "@/hooks/use-builder-params";

export function BuilderFormAction() {
    const form = useFormContext<BuilderFormSchema>();
    const { setParams, openBuilderId } = useBuilderParams();
    const { mutate: saveBuilder, isPending } = useMutation(
        useTRPC().community.saveBuilder.mutationOptions({
            onSuccess(data, variables, onMutateResult, context) {
                if (variables) {
                    _qc.invalidateQueries({
                        queryKey: useTRPC().community.getBuilderForm.queryKey({
                            builderId: variables.id!,
                        }),
                    });
                    if (openBuilderId < 0 || !openBuilderId)
                        setParams({ builderId: data.id });
                }
            },
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
                        // console.log("Form submitted with data:", data);
                        saveBuilder(data);
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

