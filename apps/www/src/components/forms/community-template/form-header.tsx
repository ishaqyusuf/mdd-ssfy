"use client";
import { _trpc } from "@/components/static-trpc";
import { SubmitButton } from "@/components/submit-button";
import { useCommunityModelStore } from "@/store/community-model";
import { extractCommunityFormValueData } from "@community/utils/template-form";
import { Button } from "@gnd/ui/button";
import { useMutation } from "@gnd/ui/tanstack";
import { useTemplateSchemaContext } from "./context";
import { useDebugToast } from "@/hooks/use-debug-console";
import { useAuth } from "@/hooks/use-auth";

export function FormHeader() {
    const store = useCommunityModelStore();
    const ctx = useTemplateSchemaContext();
    const auth = useAuth();
    const { data, isPending, error, mutate } = useMutation(
        _trpc.community.saveCommunityModel.mutationOptions({
            meta: {
                toastTitle: {
                    error: "Something went wrong",
                    loading: "Saving...",
                    success: "Success",
                },
            },
            onSuccess(data, variables, context) {},
        }),
    );
    // useDebugToast("error", { data, error });
    const onSubmit = () => {
        const data = extractCommunityFormValueData(Object.values(store.blocks));
        // console.log(data);
        // console.log(store.blocks);
        mutate({
            ...data,
            modelId: ctx.communityTemplate.id!,
            authorName: auth?.name,
        });
    };

    return (
        <div className="flex justify-end">
            <SubmitButton
                onClick={onSubmit}
                isSubmitting={isPending}
                type="button"
            >
                Save
            </SubmitButton>
        </div>
    );
}

