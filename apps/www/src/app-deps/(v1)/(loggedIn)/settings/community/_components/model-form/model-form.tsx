"use client";

import { useEffect } from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import { _revalidate } from "@/app-deps/(v1)/_actions/_revalidate";

import Btn from "@/components/_v1/btn";
import PageHeader from "@/components/_v1/page-header";
import ImportModelTemplateSheet from "@/components/_v1/sheets/import-model-template-sheet";
import { useModal } from "@/components/common/modal/provider";
import { useDataPage } from "@/lib/data-page-context";
import { useAppSelector } from "@/store";
import { loadStaticList } from "@/store/slicers";
import { HomeTemplateDesign } from "@/types/community";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button, buttonVariants } from "@gnd/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { GetCommunityTemplate, saveHomeTemplateDesign } from "../home-template";
import {
    BifoldDoorForm,
    DecoForm,
    DoubleDoorForm,
    ExteriorFrame,
    GarageDoorForm,
    InteriorDoorForm,
    LockHardwareForm,
} from "./model-sections";
import TemplateHistoryModal from "./version-history-modal";
import Link from "next/link";
import { cn } from "@gnd/ui/cn";
import { ModelTemplateSetting } from "@/components/model-template-setting";
import { openLink } from "@/lib/open-link";
import { _qc, _trpc } from "@/components/static-trpc";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Eye, History } from "lucide-react";

interface Props {
    data: GetCommunityTemplate;
    title?;
}
export interface ModelFormProps {
    data?: GetCommunityTemplate;
    form: any; //UseFormReturn<DesignTemplateForm, any, undefined>;
}
export interface DesignTemplateForm extends HomeTemplateDesign {
    ctx: {
        print;
    };
}
export default function ModelForm({ data, title = "Edit Model" }: Props) {
    const {
        data: { community },
    } = useDataPage();
    const form = useForm<DesignTemplateForm>({
        defaultValues: {
            ...(data?.meta?.design || {}),
        },
    });
    const suggestions = useAppSelector((s) => s.slicers.templateFormSuggestion);
    // const [isSaving, startTransition] = useTransition();
    const { mutate: saveTemplate, isPending: isSaving } = useMutation(
        _trpc.community.saveCommunityModelLegacy.mutationOptions({
            onSuccess(data, variables, onMutateResult, context) {
                _qc.invalidateQueries({
                    queryKey: _trpc.print.modelTemplate.queryKey({}),
                });
            },
            onError(error, variables, onMutateResult, context) {},
            meta: {
                toastTitle: {
                    error: "Unable to complete",
                    loading: "Processing...",
                    success: "Done!.",
                },
            },
        }),
    );
    const auth = useAuth();
    async function save() {
        saveTemplate({
            meta: {
                ...((data?.meta || {}) as any),
                design: form.getValues(),
            },
            slug: data.slug,
            authorId: auth.id,
        });
        // startTransition(async () => {
        //     const _meta = {
        //         ...((data?.meta || {}) as any),
        //         design: form.getValues(),
        //     };
        //     console.log(_meta.design);
        //     await (community
        //         ? saveCommunityTemplateDesign
        //         : saveHomeTemplateDesign)(data.slug, _meta);
        //     toast.success("Saved successfully!");
        //     _revalidate("communityTemplate");
        //     _qc.invalidateQueries({
        //         queryKey: _trpc.print.modelTemplate.queryKey({}),
        //     });
        // });
    }
    const modal = useModal();
    return (
        <div id="unitModelForm">
            <PageHeader
                title={title}
                subtitle={``}
                Action={() => (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                openLink(
                                    "p/model-template",
                                    {
                                        version: "v1",
                                        preview: true,
                                        // slugs: [item.id].join(","),
                                        // homeIds: "",
                                        templateSlug: data?.slug,
                                    },
                                    true,
                                );
                            }}
                        >
                            <Eye className="size-4" />
                            Preview
                        </Button>
                        <Link
                            className={cn(
                                buttonVariants({
                                    variant: "outline",
                                    size: "sm",
                                }),
                            )}
                            href={`/community/model-template/${data?.slug}`}
                        >
                            V2
                        </Link>
                        <Button
                            variant="outline"
                            onClick={() => {
                                modal.openSheet(
                                    <TemplateHistoryModal data={data} />,
                                );
                            }}
                            size="sm"
                        >
                            <History className="size-4" />
                            History
                        </Button>
                        <ImportModelTemplateSheet
                            data={data}
                            form={form as any}
                        />
                        <Btn size="sm" isLoading={isSaving} onClick={save}>
                            Save
                        </Btn>

                        <ModelTemplateSetting
                            pivotModelCostId={data?.pivotModelCostId}
                            id={data?.id!}
                            defaultValues={{
                                version: data?.version,
                            }}
                            slug={data?.slug}
                        />
                    </>
                )}
            />
            <UnitTemplateTabs form={form} />
        </div>
    );
}

export function UnitTemplateTabs({ form }) {
    return (
        <Tabs defaultValue="interior" className="space-y-4 ">
            <TabsList>
                <TabsTrigger value="exterior">Exterior Door</TabsTrigger>
                <TabsTrigger value="interior">Interior Trim</TabsTrigger>
                <TabsTrigger value="lock">Lock & Hardware</TabsTrigger>
                <TabsTrigger value="deco">Deco Shutters</TabsTrigger>
            </TabsList>
            <TabsContent value="exterior" className="space-y-4">
                <ExteriorFrame form={form} />
            </TabsContent>
            <TabsContent value="interior" className="space-y-4">
                <GarageDoorForm form={form} />
                <InteriorDoorForm form={form} />
                <DoubleDoorForm form={form} />
                <BifoldDoorForm form={form} />
            </TabsContent>
            <TabsContent value="lock">
                <LockHardwareForm form={form} />
            </TabsContent>
            <TabsContent value="deco">
                <DecoForm form={form} />
            </TabsContent>
        </Tabs>
    );
}
