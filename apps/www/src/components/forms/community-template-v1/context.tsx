"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { UseFormReturn, useForm } from "react-hook-form";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery, useMutation, useQuery } from "@gnd/ui/tanstack";
import { _qc, _trpc } from "@/components/static-trpc";
import { HomeTemplateDesign } from "@/types/community";
import { useAuth } from "@/hooks/use-auth";
import { transformCommunityTemplate } from "@/lib/community/community-template";

const TEMPLATE_V1_AUTOCOMPLETE_COOKIE = "template_v1_autocomplete_enabled";
const TEMPLATE_V1_AUTOCOMPLETE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

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
    autocompleteEnabled: boolean;
    setAutocompleteEnabled: (enabled: boolean) => void;
    importDesignFromTemplate: (template: {
        modelName: string;
        meta: any;
    }) => void;
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
    const [autocompleteEnabled, setAutocompleteEnabledState] = useState(() => {
        if (typeof document === "undefined") return true;
        const cookieValue = document.cookie
            .split("; ")
            .find((cookie) =>
                cookie.startsWith(`${TEMPLATE_V1_AUTOCOMPLETE_COOKIE}=`),
            )
            ?.split("=")[1];

        return cookieValue === "false" ? false : true;
    });

    const { data: templateData } = useSuspenseQuery(
        trpc.community.getCommunityTemplateLegacy.queryOptions(
            { slug },
            {
                staleTime: 1000 * 60 * 10,
            },
        ),
    );

    const { data: suggestions } = useQuery(
        trpc.community.getDesignKeySuggestions.queryOptions(undefined, {
            enabled: autocompleteEnabled,
            staleTime: 1000 * 60 * 30,
            gcTime: 1000 * 60 * 60,
        }),
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
                _qc.invalidateQueries({
                    queryKey: trpc.community.getCommunityTemplateHistory.queryKey({
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

    const importDesignFromTemplate = (template: {
        modelName: string;
        meta: any;
    }) => {
        const importedDesign = transformCommunityTemplate(template?.meta?.design || {});
        const currentCtx = form.getValues("ctx");
        form.reset({
            ...(importedDesign as any),
            ctx: currentCtx,
        });
    };

    const setAutocompleteEnabled = (enabled: boolean) => {
        setAutocompleteEnabledState(enabled);
        document.cookie = `${TEMPLATE_V1_AUTOCOMPLETE_COOKIE}=${enabled}; path=/; max-age=${TEMPLATE_V1_AUTOCOMPLETE_COOKIE_MAX_AGE}; SameSite=Lax`;
    };

    const value: CommunityTemplateV1ContextValue = useMemo(
        () => ({
            form,
            suggestions: suggestions || {},
            templateData: templateData as any,
            isSaving,
            autocompleteEnabled,
            setAutocompleteEnabled,
            importDesignFromTemplate,
            save,
        }),
        [
            form,
            suggestions,
            templateData,
            isSaving,
            autocompleteEnabled,
            importDesignFromTemplate,
        ],
    );

    return (
        <CommunityTemplateV1Context.Provider value={value}>
            {children}
        </CommunityTemplateV1Context.Provider>
    );
}
