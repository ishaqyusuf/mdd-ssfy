"use client";
import { _qc, _trpc } from "@/components/static-trpc";
import { useCommunityModelStore } from "@/store/community-model";
import { extractCommunityFormValueData } from "@community/utils/template-form";
import { Button, buttonVariants } from "@gnd/ui/button";
import { useMutation } from "@gnd/ui/tanstack";
import { useTemplateSchemaContext } from "./context";
import { useAuth } from "@/hooks/use-auth";
import { openLink } from "@/lib/open-link";
import { ModelTemplateSetting } from "@/components/model-template-setting";
import Link from "next/link";
import { cn } from "@gnd/ui/cn";
import Btn from "@/components/_v1/btn";
import { InstallCostBtn } from "@/components/install-cost-btn";

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
            onSuccess(data, variables, context) {
                _qc.invalidateQueries({
                    queryKey: _trpc.print.modelTemplate.queryKey({}),
                });
            },
        }),
    );

    const onSubmit = () => {
        const data = extractCommunityFormValueData(Object.values(store.blocks));
        mutate({
            ...data,
            modelId: ctx.communityTemplate.id!,
            authorName: auth?.name,
        } as any);
    };

    return (
        <div className="flex gap-4 justify-end">
            <div className="flex-1"></div>
            <Button
                onClick={(e) => {
                    openLink(
                        "p/model-template",
                        {
                            preview: true,
                            // slugs: [item.id].join(","),
                            // slugs: "",
                            version: "v2",
                            templateSlug: ctx?.modelSlug,
                        },
                        true,
                    );
                }}
            >
                Previews
            </Button>
            <Link
                className={cn(
                    buttonVariants({
                        variant: "destructive",
                    }),
                )}
                href={`/community/community-template/${ctx?.modelSlug}/v1`}
            >
                V1
            </Link>
            <InstallCostBtn id={ctx?.communityTemplate?.id!} />
            <ModelTemplateSetting
                id={ctx?.communityTemplate?.id!}
                pivotModelCostId={ctx?.communityTemplate?.pivotModelCostId!}
                defaultValues={{
                    version: ctx?.communityTemplate?.version,
                }}
                slug={ctx?.modelSlug}
            />
            <Btn onClick={onSubmit} isLoading={isPending} type="button">
                Save
            </Btn>
        </div>
    );
}

