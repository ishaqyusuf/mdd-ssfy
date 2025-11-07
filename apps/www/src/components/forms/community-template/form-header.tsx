"use client";
import { _trpc } from "@/components/static-trpc";
import { useCommunityModelStore } from "@/store/community-model";
import { extractCommunityFormValueData } from "@community/utils/template-form";
import { Button, buttonVariants } from "@gnd/ui/button";
import { useMutation } from "@gnd/ui/tanstack";
import { useTemplateSchemaContext } from "./context";
import { useDebugToast } from "@/hooks/use-debug-console";
import { useAuth } from "@/hooks/use-auth";
import { openLink } from "@/lib/open-link";
import { ModelTemplateSetting } from "@/components/model-template-setting";
import Link from "next/link";
import { cn } from "@gnd/ui/cn";
import Btn from "@/components/_v1/btn";

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
        })
    );
    useDebugToast("Error", error);
    const onSubmit = () => {
        const data = extractCommunityFormValueData(Object.values(store.blocks));
        mutate({
            ...data,
            modelId: ctx.communityTemplate.id!,
            authorName: auth?.name,
        });
    };

    return (
        <div className="flex gap-4 justify-end">
            <div className="flex-1"></div>
            <Button
                onClick={(e) => {
                    openLink(
                        "api/download/model-template",
                        {
                            preview: true,
                            // slugs: [item.id].join(","),
                            slugs: "",
                            templateSlug: ctx?.modelSlug,
                        },
                        true
                    );
                }}
            >
                Preview
            </Button>
            <Btn onClick={onSubmit} isLoading={isPending} type="button">
                Save
            </Btn>
            <Link
                className={cn(
                    buttonVariants({
                        variant: "destructive",
                    })
                )}
                href={`/community/model-template/${ctx?.modelSlug}`}
            >
                V1
            </Link>
            <ModelTemplateSetting
                id={ctx?.communityTemplate?.id!}
                defaultValues={{
                    version: ctx?.communityTemplate?.version,
                }}
                slug={ctx?.modelSlug}
            />
        </div>
    );
}

