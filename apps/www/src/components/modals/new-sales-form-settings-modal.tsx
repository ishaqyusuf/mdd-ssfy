"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { useTRPC } from "@/trpc/client";
import { toast } from "@gnd/ui/use-toast";
import { Trash2 } from "lucide-react";
import { Button } from "@gnd/ui/button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@gnd/ui/accordion";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Form } from "@gnd/ui/form";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Sortable, SortableItem } from "@gnd/ui/sortable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import Modal from "@/components/common/modal";
import { _modal } from "@/components/common/modal/provider";
import { Icons } from "@/components/_v1/icons";
import { FormCheckbox } from "@gnd/ui/controls/form-checkbox";
import { FormSelect } from "@gnd/ui/controls/form-select";
import { FormInput } from "@gnd/ui/controls/form-input";
import {
    useCustomerProfilesQuery,
    useCustomerTaxProfilesQuery,
    useNewSalesFormStepRoutingQuery,
} from "@/components/forms/new-sales-form/api";

type SettingsFormValues = {
    data: {
        sectionKeys: Array<{ uid: string }>;
        setting: {
            data: {
                route: Record<
                    string,
                    {
                        routeSequence: Array<{ uid: string }>;
                        externalRouteSequence: Array<{ uid: string }>;
                        config: {
                            noHandle: boolean;
                            hasSwing: boolean;
                            addonQty: boolean;
                            production: boolean;
                            shipping: boolean;
                            shelfLineItems: boolean;
                        };
                    }
                >;
                ccc: number | string | null;
                taxCode: string | null;
                customerProfileId: string | null;
            };
        };
        newStepTitle: string;
    };
};

function useNewSalesFormSettingsContext() {
    const stepRoutingQuery = useNewSalesFormStepRoutingQuery({}, true);
    const routeData = stepRoutingQuery.data;
    const customerProfilesQuery = useCustomerProfilesQuery(true);
    const customerTaxProfilesQuery = useCustomerTaxProfilesQuery(true);
    const queryClient = useQueryClient();
    const form = useForm<SettingsFormValues>({
        defaultValues: {
            data: {
                sectionKeys: [],
                setting: {
                    data: {
                        route: {},
                        ccc: 3.5,
                        taxCode: null,
                        customerProfileId: null,
                    },
                },
                newStepTitle: "",
            },
        },
    });

    const sectionArray = useFieldArray({
        control: form.control,
        name: "data.sectionKeys",
        keyName: "_id",
    });

    const rootComponents = routeData?.rootComponents ?? [];
    const rootComponentsByUid = useMemo(() => {
        const entries = (rootComponents || []).map((component) => [
            component.uid,
            component,
        ]);
        return Object.fromEntries(entries);
    }, [rootComponents]);

    const [steps, setSteps] = useState<any[]>([]);
    const trpc = useTRPC();

    useEffect(() => {
        if (!routeData) return;
        const settingsMeta = (routeData as any)?.settingsMeta || {};
        const nestedSettingsMeta =
            settingsMeta && typeof settingsMeta.data === "object"
                ? settingsMeta.data
                : {};
        const composedRouter = routeData.composedRouter || {};
        const routeBySection: SettingsFormValues["data"]["setting"]["data"]["route"] =
            {};
        for (const [sectionUid, routeDef] of Object.entries(composedRouter)) {
            const routeObj = routeDef as any;
            routeBySection[sectionUid] = {
                routeSequence: (routeObj.routeSequence || []).map((s: any) => ({
                    uid: String(s.uid || ""),
                })),
                externalRouteSequence: Array.isArray(
                    routeObj.externalRouteSequence,
                )
                    ? routeObj.externalRouteSequence
                    : [],
                config: {
                    noHandle: !!routeObj.config?.noHandle,
                    hasSwing: !!routeObj.config?.hasSwing,
                    addonQty: !!routeObj.config?.addonQty,
                    production: !!routeObj.config?.production,
                    shipping: !!routeObj.config?.shipping,
                    shelfLineItems: !!routeObj.config?.shelfLineItems,
                },
            };
        }

        form.reset({
            data: {
                sectionKeys: Object.keys(routeBySection).map((uid) => ({
                    uid,
                })),
                setting: {
                    data: {
                        route: routeBySection,
                        ccc: Number(
                            settingsMeta?.ccc ??
                                nestedSettingsMeta?.ccc ??
                                3.5,
                        ),
                        taxCode:
                            (settingsMeta?.taxCode as string | null) ??
                            (nestedSettingsMeta?.taxCode as string | null) ??
                            "none",
                        customerProfileId:
                            String(
                                settingsMeta?.customerProfileId ??
                                    nestedSettingsMeta?.customerProfileId ??
                                    "none",
                            ) || "none",
                    },
                },
                newStepTitle: "",
            },
        });

        const selectableSteps = Object.values(routeData.stepsByUid || {})
            .filter((step: any) => !!step?.title)
            .filter((step: any) => !String(step.title).includes("--"))
            .filter((step: any) => step.uid !== routeData.rootStepUid)
            .map((step: any) => ({
                uid: step.uid,
                title: String(step.title || step.uid).toUpperCase(),
            }));
        setSteps(selectableSteps);
    }, [form, routeData]);

    const createStep = useMutation(
        trpc.sales.createStep.mutationOptions({
            onSuccess: (data) => {
                toast({
                    title: "New step created",
                    variant: "success",
                });
                setSteps((current) => [
                    ...current,
                    {
                        uid: (data as any)?.uid,
                        title: String(
                            (data as any)?.title || (data as any)?.uid || "",
                        ).toUpperCase(),
                    },
                ]);
                form.setValue("data.newStepTitle", "");
                void stepRoutingQuery.refetch();
            },
        }),
    );
    const saveSetting = useMutation(
        trpc.settings.updateSetting.mutationOptions({
            onSuccess: async () => {
                await queryClient.invalidateQueries({
                    queryKey: trpc.newSalesForm.getStepRouting.queryKey({}),
                });
                toast({
                    title: "Settings saved",
                    variant: "success",
                });
                _modal.close();
            },
        }),
    );

    function createSection(uid: string) {
        form.setValue(`data.setting.data.route.${uid}`, {
            routeSequence: [{ uid: "" }],
            externalRouteSequence: [],
            config: {
                noHandle: false,
                hasSwing: false,
                addonQty: false,
                production: false,
                shipping: false,
                shelfLineItems: false,
            },
        });
        sectionArray.append({
            uid,
        });
    }

    async function save() {
        const data = form.getValues();
        const rawMeta = data.data?.setting?.data;
        if (!rawMeta) {
            toast({
                title: "Nothing to save",
                variant: "destructive",
            });
            return;
        }
        const meta = {
            ...rawMeta,
            ccc:
                rawMeta.ccc == null || rawMeta.ccc === ""
                    ? null
                    : Number(rawMeta.ccc),
            taxCode:
                !rawMeta.taxCode || rawMeta.taxCode === "none"
                    ? null
                    : rawMeta.taxCode,
            customerProfileId:
                !rawMeta.customerProfileId ||
                rawMeta.customerProfileId === "none"
                    ? null
                    : Number(rawMeta.customerProfileId),
        };

        await saveSetting.mutateAsync({
            type: "sales-settings",
            meta,
            updateType: "full",
        });
    }

        return {
        isLoading: stepRoutingQuery.isPending,
        routeData,
        customerProfiles: customerProfilesQuery.data || [],
        taxProfiles: customerTaxProfilesQuery.data || [],
        rootComponentsByUid,
        form,
        sectionArray,
        steps,
        createStep,
        createSection,
        saveSetting,
        save,
    };
}

type SettingsCtx = ReturnType<typeof useNewSalesFormSettingsContext>;
const Context = createContext<SettingsCtx | null>(null);

function useSettings() {
    const ctx = useContext(Context);
    if (!ctx) throw new Error("useSettings must be used within provider");
    return ctx;
}

function RouteSection({ uid }: { uid: string }) {
    const ctx = useSettings();
    const stepArray = useFieldArray({
        control: ctx.form.control,
        name: `data.setting.data.route.${uid}.routeSequence`,
    });

    const stepLabel = useMemo(
        () => ctx.rootComponentsByUid?.[uid]?.title ?? uid,
        [ctx.rootComponentsByUid, uid],
    );
    const stepImage = ctx.rootComponentsByUid?.[uid]?.img || null;
    const newStepTitle = ctx.form.watch("data.newStepTitle");

    return (
        <AccordionItem
            value={uid}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        >
            <AccordionTrigger className="bg-muted/30 px-4 py-3 text-left text-sm font-semibold uppercase hover:no-underline">
                <div className="flex items-center gap-3">
                    {stepImage ? (
                        <img
                            src={stepImage}
                            alt={String(stepLabel)}
                            className="size-8 rounded-md border bg-background object-cover"
                        />
                    ) : null}
                    <span className="tracking-wide">
                        {String(stepLabel).toUpperCase()}
                    </span>
                </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 p-4">
                <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        Section Config
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <FormCheckbox
                            switchInput
                            control={ctx.form.control}
                            name={`data.setting.data.route.${uid}.config.noHandle`}
                            label="Single Handle Mode"
                            description="Use when this section has no LH / RH attribute."
                        />
                        <FormCheckbox
                            switchInput
                            control={ctx.form.control}
                            name={`data.setting.data.route.${uid}.config.hasSwing`}
                            label="Swing Input"
                            description="Enable if this section should collect swing."
                        />
                        <FormCheckbox
                            switchInput
                            control={ctx.form.control}
                            name={`data.setting.data.route.${uid}.config.production`}
                            label="Activate Production"
                        />
                        <FormCheckbox
                            switchInput
                            control={ctx.form.control}
                            name={`data.setting.data.route.${uid}.config.shipping`}
                            label="Activate Shipping"
                        />
                        <FormCheckbox
                            switchInput
                            control={ctx.form.control}
                            name={`data.setting.data.route.${uid}.config.shelfLineItems`}
                            label="Shelf Items"
                        />
                    </div>
                </div>

                <div className="rounded-lg border bg-background p-3">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            Step Sequence
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 uppercase"
                            onClick={() => stepArray.append({ uid: "" })}
                        >
                            <Icons.Add className="size-4" />
                            <span>Step</span>
                        </Button>
                    </div>

                    <Sortable
                        value={stepArray.fields}
                        onMove={({ activeIndex, overIndex }) =>
                            stepArray.move(activeIndex, overIndex)
                        }
                        overlay={
                            <div className="grid grid-cols-[1fr,auto,auto] items-center gap-2">
                                <div className="h-8 w-full rounded-sm bg-primary/10" />
                                <div className="size-8 rounded-sm bg-primary/10" />
                                <div className="size-8 rounded-sm bg-primary/10" />
                            </div>
                        }
                    >
                        <div className="flex flex-col gap-2">
                            {stepArray.fields.map((field, index) => (
                                <SortableItem
                                    key={field.id}
                                    value={field.id}
                                    asTrigger
                                    className="grid grid-cols-[minmax(0,1fr),auto,auto] items-center gap-2 rounded-md border bg-card p-2"
                                >
                                    <FormSelect
                                        className="!mx-0"
                                        size="sm"
                                        name={`data.setting.data.route.${uid}.routeSequence.${index}.uid`}
                                        titleKey="title"
                                        valueKey="uid"
                                        options={ctx.steps}
                                        control={ctx.form.control}
                                    />
                                    <div className="grid size-8 place-items-center rounded-md border bg-muted/20 text-xs text-muted-foreground">
                                        ::
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="size-8"
                                        onClick={() => stepArray.remove(index)}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </SortableItem>
                            ))}
                        </div>
                    </Sortable>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <FormInput
                        name="data.newStepTitle"
                        placeholder="NEW STEP"
                        control={ctx.form.control}
                    />
                    <Button
                        type="button"
                        size="sm"
                        className="uppercase"
                        disabled={!newStepTitle || ctx.createStep.isPending}
                        onClick={() =>
                            ctx.createStep.mutate({
                                title: newStepTitle,
                            })
                        }
                    >
                        Create
                    </Button>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

export function NewSalesFormSettingsModal() {
    const value = useNewSalesFormSettingsContext();
    const rootProducts = value.routeData?.rootComponents ?? [];
    const [tab, setTab] = useState("invoice-steps");

    return (
        <Form {...value.form}>
            <Context.Provider value={value}>
                <Modal.Content size="lg" className="overflow-hidden">
                    <Modal.Header
                        title="Form Step Sequence"
                        subtitle="Configure invoice steps and default sales settings."
                    />

                    <Tabs
                        value={tab}
                        onValueChange={setTab}
                        className="min-h-0"
                    >
                        <div className="border-b px-6 pb-4">
                            <TabsList className="grid w-full max-w-md grid-cols-2">
                                <TabsTrigger value="invoice-steps">
                                    Invoice Steps
                                </TabsTrigger>
                                <TabsTrigger value="settings">
                                    Settings
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="invoice-steps" className="mt-0">
                            <ScrollArea className="-mx-6 h-[62vh] px-6">
                                <div className="flex flex-col gap-4 pb-6">
                                    {value.isLoading ? (
                                        <div className="rounded-lg border bg-muted/20 p-6 text-sm text-muted-foreground">
                                            Loading step settings...
                                        </div>
                                    ) : (
                                        <Accordion
                                            type="single"
                                            collapsible
                                            className="space-y-2"
                                        >
                                            {value.sectionArray.fields.map(
                                                (field: any) => (
                                                    <RouteSection
                                                        key={field._id}
                                                        uid={field.uid}
                                                    />
                                                ),
                                            )}
                                        </Accordion>
                                    )}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="settings" className="mt-0">
                            <ScrollArea className="-mx-6 h-[62vh] px-6">
                                <div className="space-y-4 pb-6">
                                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                                        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                                            Sales Defaults
                                        </p>
                                        <div className="grid gap-4">
                                            <FormInput
                                                control={value.form.control}
                                                name="data.setting.data.ccc"
                                                label="CCC (%)"
                                                type="number"
                                                step="0.01"
                                                placeholder="3.5"
                                            />
                                            <FormSelect
                                                control={value.form.control}
                                                name="data.setting.data.taxCode"
                                                label="Default Tax"
                                                titleKey="title"
                                                valueKey="taxCode"
                                                options={[
                                                    {
                                                        taxCode: "none",
                                                        title: "None",
                                                    },
                                                    ...(value.taxProfiles || []).map(
                                                        (tax: any) => ({
                                                            taxCode: String(
                                                                tax?.taxCode || "",
                                                            ),
                                                            title: String(
                                                                tax?.title ||
                                                                    tax?.taxCode ||
                                                                    "Tax",
                                                            ),
                                                        }),
                                                    ),
                                                ]}
                                            />
                                            <FormSelect
                                                control={value.form.control}
                                                name="data.setting.data.customerProfileId"
                                                label="Default Customer Profile"
                                                titleKey="title"
                                                valueKey="id"
                                                options={[
                                                    {
                                                        id: "none",
                                                        title: "None",
                                                    },
                                                    ...(value.customerProfiles || []).map(
                                                        (profile: any) => ({
                                                            id: String(
                                                                profile?.id || "",
                                                            ),
                                                            title: String(
                                                                profile?.title ||
                                                                    `Profile ${profile?.id || ""}`,
                                                            ),
                                                        }),
                                                    ),
                                                ]}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>

                    <div className="border-t bg-background p-4">
                        <Modal.Footer onSubmit={value.save} submitText="Save">
                            {tab === "invoice-steps" ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="gap-2 uppercase"
                                            disabled={value.isLoading}
                                        >
                                            <Icons.Add className="size-4" />
                                            <span>Section</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {rootProducts.map((stepProd) => (
                                            <DropdownMenuItem
                                                key={stepProd.uid}
                                                disabled={value.sectionArray.fields.some(
                                                    (section: any) =>
                                                        section.uid ===
                                                        stepProd.uid,
                                                )}
                                                onClick={() =>
                                                    value.createSection(
                                                        stepProd.uid,
                                                    )
                                                }
                                                className="uppercase"
                                            >
                                                {String(
                                                    stepProd.title || "",
                                                ).toUpperCase()}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : null}
                        </Modal.Footer>
                    </div>
                </Modal.Content>
            </Context.Provider>
        </Form>
    );
}

export default NewSalesFormSettingsModal;
