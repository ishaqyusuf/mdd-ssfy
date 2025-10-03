"use client";
import { _trpc } from "@/components/static-trpc";
import { SubmitButton } from "@/components/submit-button";
import { useCommunityModelStore } from "@/store/community-model";
import { extractCommunityFormValueData } from "@community/utils/template-form";
import { Button } from "@gnd/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useTemplateSchemaContext } from "./context";

export function FormHeader() {
    const store = useCommunityModelStore();
    const ctx = useTemplateSchemaContext();
    const { data, isPending, mutate } = useMutation(
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
    const onSubmit = () => {
        const data = extractCommunityFormValueData(Object.values(store.blocks));
        console.log(data);
        mutate({
            ...data,
            modelId: ctx.communityTemplate.id!,
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

