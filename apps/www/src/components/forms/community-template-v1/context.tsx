"use client";

import { createContext, useContext, useMemo } from "react";
import { UseFormReturn, useForm } from "react-hook-form";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery, useMutation } from "@gnd/ui/tanstack";
import { _qc, _trpc } from "@/components/static-trpc";
import { HomeTemplateDesign } from "@/types/community";
import { useAuth } from "@/hooks/use-auth";
import { transformCommunityTemplate } from "@/lib/community/community-template";

export interface DesignTemplateForm extends HomeTemplateDesign {
    ctx: {
        print;
    };
}

interface CommunityTemplateV1ContextValue {
    form: UseFormReturn<DesignTemplateForm>;
    suggestions: Record<string, string[]>;
    templateData: {
        slug: string;
        id: number;
        modelName: string;
        meta: any;
        version?: string;
        pivotModelCostId?: number;
    };
    isSaving: boolean;
    save: () => void;
}

const CommunityTemplateV1Context =
    createContext<CommunityTemplateV1ContextValue | undefined>(undefined);

export function useCommunityTemplateV1() {
    const ctx = useContext(CommunityTemplateV1Context);
    if (!ctx) {
        throw new Error(
            "useCommunityTemplateV1 must be used within CommunityTemplateV1Provider",
        );
    }
    return ctx;
}

interface ProviderProps {
    slug: string;
    children: React.ReactNode;
}

export function CommunityTemplateV1Provider({ slug, children }: ProviderProps) {
    const trpc = useTRPC();
    const auth = useAuth();

    const { data: templateData } = useSuspenseQuery(
        trpc.community.getCommunityTemplateLegacy.queryOptions({ slug }),
    );

    const { data: suggestions } = useSuspenseQuery(
        trpc.community.getDesignKeySuggestions.queryOptions(),
    );

    const design = useMemo(() => {
        if (templateData?.meta?.design) {
            return transformCommunityTemplate(templateData.meta.design);
        }
        return {};
    }, [templateData]);

    const form = useForm<DesignTemplateForm>({
        defaultValues: {
            ...(design || {}),
        },
    });

    const { mutate: saveTemplate, isPending: isSaving } = useMutation(
        _trpc.community.saveCommunityModelLegacy.mutationOptions({
            onSuccess() {
                _qc.invalidateQueries({
                    queryKey: _trpc.print.modelTemplate.queryKey({}),
                });
                _qc.invalidateQueries({
                    queryKey:
                        trpc.community.getCommunityTemplateLegacy.queryKey({
                            slug,
                        }),
                });
            },
            meta: {
                toastTitle: {
                    error: "Unable to save",
                    loading: "Saving...",
                    success: "Saved successfully!",
                },
            },
        }),
    );

    const save = () => {
        saveTemplate({
            meta: {
                ...((templateData?.meta || {}) as any),
                design: form.getValues(),
            },
            slug: templateData.slug,
            authorId: auth.id,
        });
    };

    const value: CommunityTemplateV1ContextValue = {
        form,
        suggestions: suggestions || {},
        templateData: templateData as any,
        isSaving,
        save,
    };

    return (
        <CommunityTemplateV1Context.Provider value={value}>
            {children}
        </CommunityTemplateV1Context.Provider>
    );
}
