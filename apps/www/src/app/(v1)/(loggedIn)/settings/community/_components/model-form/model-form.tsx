"use client";

import { useEffect, useTransition } from "react";
import { _revalidate } from "@/app/(v1)/_actions/_revalidate";
import { getHomeTemplateSuggestions } from "@/app/(v1)/_actions/community/home-template-suggestion";
import Btn from "@/components/_v1/btn";
import PageHeader from "@/components/_v1/page-header";
import ImportModelTemplateSheet from "@/components/_v1/sheets/import-model-template-sheet";
import { useModal } from "@/components/common/modal/provider";
import { useDataPage } from "@/lib/data-page-context";
import { removeEmptyValues } from "@/lib/utils";
import { useAppSelector } from "@/store";
import { loadStaticList } from "@/store/slicers";
import { HomeTemplateDesign, IHomeTemplate } from "@/types/community";
import { useForm, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import {
    GetCommunityTemplate,
    saveCommunityTemplateDesign,
    saveHomeTemplateDesign,
} from "../home-template";
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
    const [isSaving, startTransition] = useTransition();
    useEffect(() => {
        loadStaticList(
            "templateFormSuggestion",
            suggestions,
            getHomeTemplateSuggestions,
        );
    }, []);
    async function save() {
        startTransition(async () => {
            const _meta = {
                ...((data?.meta || {}) as any),
                design: form.getValues(),
            };
            await (
                community ? saveCommunityTemplateDesign : saveHomeTemplateDesign
            )(data.slug, _meta);
            toast.success("Saved successfully!");
            _revalidate("communityTemplate");
        });
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
                            onClick={() => {
                                modal.openSheet(
                                    <TemplateHistoryModal data={data} />,
                                );
                            }}
                            size="sm"
                        >
                            History
                        </Button>
                        <ImportModelTemplateSheet
                            data={data}
                            form={form as any}
                        />
                        <Btn size="sm" isLoading={isSaving} onClick={save}>
                            Save
                        </Btn>
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
                <TabsTrigger value="exterior">Exterior Frame</TabsTrigger>
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
