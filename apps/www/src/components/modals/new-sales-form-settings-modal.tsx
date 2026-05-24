"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { useTRPC } from "@/trpc/client";
import { toast } from "@gnd/ui/use-toast";
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
import { Sortable, SortableDragHandle, SortableItem } from "@gnd/ui/sortable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import Modal from "@/components/common/modal";
import { _modal } from "@/components/common/modal/provider";
import { Icons } from "@gnd/ui/icons";
import { FormCheckbox } from "@gnd/ui/controls/form-checkbox";
import { FormSelect } from "@gnd/ui/controls/form-select";
import { FormInput } from "@gnd/ui/controls/form-input";
import {
    useCustomerProfilesQuery,
    useCustomerTaxProfilesQuery,
    useNewSalesFormShelfCategoriesQuery,
    useNewSalesFormStepRoutingQuery,
} from "@/components/forms/new-sales-form/api";

type DealerShelfCategoryVisibility = {
    mode: "all" | "allowlist";
    categoryIds: number[];
};

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
                            dealerVisible: boolean;
                        };
                    }
                >;
                dealerShelfCategoryVisibility: DealerShelfCategoryVisibility;
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
    const shelfCategoriesQuery = useNewSalesFormShelfCategoriesQuery({}, true);
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
                        dealerShelfCategoryVisibility: {
                            mode: "all",
                            categoryIds: [],
                        },
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
        const rawDealerShelfVisibility =
            settingsMeta?.dealerShelfCategoryVisibility ||
            (nestedSettingsMeta as any)?.dealerShelfCategoryVisibility ||
            {};
        const dealerShelfCategoryVisibility: DealerShelfCategoryVisibility = {
            mode:
                (rawDealerShelfVisibility as any)?.mode === "allowlist"
                    ? "allowlist"
                    : "all",
            categoryIds: Array.isArray(
                (rawDealerShelfVisibility as any)?.categoryIds,
            )
                ? (rawDealerShelfVisibility as any).categoryIds
                      .map((id: unknown) => Number(id))
                      .filter((id: number) => Number.isInteger(id) && id > 0)
                : [],
        };
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
                    dealerVisible: routeObj.config?.dealerVisible !== false,
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
                        dealerShelfCategoryVisibility,
                        ccc: Number(
                            settingsMeta?.ccc ?? nestedSettingsMeta?.ccc ?? 3.5,
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
                dealerVisible: true,
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
            dealerShelfCategoryVisibility: {
                mode:
                    rawMeta.dealerShelfCategoryVisibility?.mode === "allowlist"
                        ? "allowlist"
                        : "all",
                categoryIds:
                    rawMeta.dealerShelfCategoryVisibility?.mode === "allowlist"
                        ? (
                              rawMeta.dealerShelfCategoryVisibility
                                  ?.categoryIds || []
                          )
                              .map((id) => Number(id))
                              .filter((id) => Number.isInteger(id) && id > 0)
                        : [],
            },
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
        shelfCategories: shelfCategoriesQuery.data || [],
        isShelfCategoriesLoading: shelfCategoriesQuery.isPending,
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
                        <FormCheckbox
                            switchInput
                            control={ctx.form.control}
                            name={`data.setting.data.route.${uid}.config.dealerVisible`}
                            label="Dealer Visible"
                            description="Allow dealership users to select this item type."
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
                            <Icons.add className="size-4" />
                            <span>Step</span>
                        </Button>
                    </div>

                    <Sortable
                        value={stepArray.fields}
                        onMove={({ activeIndex, overIndex }) =>
                            stepArray.move(activeIndex, overIndex)
                        }
                        overlay={
                            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
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
                                    asChild
                                >
                                    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                                        <FormSelect
                                            className="!mx-0"
                                            size="sm"
                                            name={`data.setting.data.route.${uid}.routeSequence.${index}.uid`}
                                            titleKey="title"
                                            valueKey="uid"
                                            options={ctx.steps}
                                            control={ctx.form.control}
                                        />
                                        <SortableDragHandle
                                            type="button"
                                            className="inline-flex size-8 shrink-0 self-center items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                        >
                                            <Icons.GripIcon
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </SortableDragHandle>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="size-8 shrink-0 self-center"
                                            onClick={() =>
                                                stepArray.remove(index)
                                            }
                                        >
                                            <Icons.Trash2 className="size-4" />
                                        </Button>
                                    </div>
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

function DealerShelfVisibilitySettings() {
    const ctx = useSettings();
    const visibility = ctx.form.watch(
        "data.setting.data.dealerShelfCategoryVisibility",
    ) || { mode: "all", categoryIds: [] };
    const selectedIds = visibility.categoryIds || [];
    const categories = ctx.shelfCategories || [];

    function setMode(mode: DealerShelfCategoryVisibility["mode"]) {
        ctx.form.setValue("data.setting.data.dealerShelfCategoryVisibility", {
            mode,
            categoryIds: mode === "all" ? [] : selectedIds,
        });
    }

    function toggleCategory(categoryId: number, checked: boolean) {
        const nextIds = checked
            ? Array.from(new Set([...selectedIds, categoryId]))
            : selectedIds.filter((id) => id !== categoryId);
        ctx.form.setValue(
            "data.setting.data.dealerShelfCategoryVisibility.categoryIds",
            nextIds,
        );
    }

    return (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        Dealer Shelf Visibility
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Choose which shelf categories dealerships can quote.
                    </p>
                </div>
                <div className="flex rounded-md border bg-background p-1">
                    <Button
                        type="button"
                        size="sm"
                        variant={
                            visibility.mode === "all" ? "default" : "ghost"
                        }
                        className="h-8"
                        onClick={() => setMode("all")}
                    >
                        All Categories
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={
                            visibility.mode === "allowlist"
                                ? "default"
                                : "ghost"
                        }
                        className="h-8"
                        onClick={() => setMode("allowlist")}
                    >
                        Selected
                    </Button>
                </div>
            </div>

            {visibility.mode === "allowlist" ? (
                <div className="max-h-72 space-y-2 overflow-auto rounded-lg border bg-background p-3">
                    {ctx.isShelfCategoriesLoading ? (
                        <p className="text-sm text-muted-foreground">
                            Loading shelf categories...
                        </p>
                    ) : categories.length ? (
                        categories.map((category: any) => {
                            const categoryId = Number(category?.id);
                            if (!Number.isInteger(categoryId)) return null;
                            return (
                                <label
                                    key={categoryId}
                                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/60"
                                >
                                    <input
                                        type="checkbox"
                                        className="size-4"
                                        checked={selectedIds.includes(
                                            categoryId,
                                        )}
                                        onChange={(event) =>
                                            toggleCategory(
                                                categoryId,
                                                event.target.checked,
                                            )
                                        }
                                    />
                                    <span className="min-w-0 flex-1 truncate">
                                        {String(
                                            category?.name ||
                                                `Category ${categoryId}`,
                                        )}
                                    </span>
                                    {category?.type ? (
                                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                                            {String(category.type)}
                                        </span>
                                    ) : null}
                                </label>
                            );
                        })
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No shelf categories found.
                        </p>
                    )}
                </div>
            ) : null}
        </div>
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
                                                    ...(
                                                        value.taxProfiles || []
                                                    ).map((tax: any) => ({
                                                        taxCode: String(
                                                            tax?.taxCode || "",
                                                        ),
                                                        title: String(
                                                            tax?.title ||
                                                                tax?.taxCode ||
                                                                "Tax",
                                                        ),
                                                    })),
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
                                                    ...(
                                                        value.customerProfiles ||
                                                        []
                                                    ).map((profile: any) => ({
                                                        id: String(
                                                            profile?.id || "",
                                                        ),
                                                        title: String(
                                                            profile?.title ||
                                                                `Profile ${profile?.id || ""}`,
                                                        ),
                                                    })),
                                                ]}
                                            />
                                        </div>
                                    </div>
                                    <DealerShelfVisibilitySettings />
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
                                            <Icons.add className="size-4" />
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
