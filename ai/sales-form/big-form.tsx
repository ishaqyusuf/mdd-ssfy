// --- Content from: ai/sales-form/use-shelf.tsx ---
import React, {
    createContext,
    useContext,
    useDeferredValue,
    useEffect,
    useMemo,
    useState,
} from "react";
import { getShelfCateogriesAction } from "@/actions/cache/get-shelf-categories";
import { getShelfProductsAction } from "@/actions/cache/get-shelf-products";
import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { CostingClass } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/costing-class";
import { SettingsClass } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/settings-class";
import { StepHelperClass } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import useEffectLoader from "@/lib/use-effect-loader";
import { generateRandomString } from "@/lib/utils";
import { FieldPath } from "react-hook-form";
import { useAsyncMemo } from "use-async-memo";

import { ComboboxContent } from "@gnd/ui/combobox";

export const ShelfContext = createContext<ReturnType<typeof useShelfContext>>(
    null as any
);

export const useShelf = () => useContext(ShelfContext);
export function useShelfContext(itemStepUid) {
    const { data: categories } = useEffectLoader(getShelfCateogriesAction);
    const [itemUid, stepUid] = itemStepUid?.split("-");
    const costCls = new CostingClass(
        new SettingsClass(itemStepUid, itemUid, stepUid)
    );
    const zus = useFormDataStore();
    const shelfItemUids =
        zus?.kvFormItem?.[itemUid]?.shelfItems?.lineUids || [];
    const basePath = `kvFormItem.${itemUid}.shelfItems`;
    function newProductLine(shelfUid, productUids = []) {
        const puid = generateRandomString();
        zus.dotUpdate(`${basePath}.lines.${shelfUid}.productUids` as any, [
            ...productUids,
            puid,
        ]);
        zus.dotUpdate(
            `${basePath}.lines.${shelfUid}.products.${puid}` as any,
            {} as any
        );
    }
    function newSection() {
        const uid = generateRandomString();
        zus.dotUpdate(`kvFormItem.${itemUid}.shelfItems.lineUids`, [
            ...shelfItemUids,
            uid,
        ]);
        zus.dotUpdate(
            `kvFormItem.${itemUid}.shelfItems.lines.${uid}.categoryIds`,
            []
        );

        newProductLine(uid);
    }

    return {
        itemStepUid,
        newProductLine,
        newSection,
        itemUid,
        stepUid,
        categories,
        shelfItemUids,
        costCls,
    };
}

// --- Content from: ai/sales-form/sales-form-dta.ts ---
import { whereTrashed } from "@/app/(clean-code)/_common/utils/db-utils";
import { AsyncFnType } from "@/app/(clean-code)/type";
import { dealerSession, user, userId } from "@/app/(v1)/_actions/utils";
import { salesFormData } from "@/app/(v1)/(loggedIn)/sales/_actions/get-sales-form";
import { ComponentPrice, prisma, Prisma } from "@/db";
import dayjs from "dayjs";

import { SalesMeta, SalesType, StepComponentMeta } from "../../types";
import { SalesBookFormIncludes } from "../utils/db-utils";
import { transformSalesBookForm } from "./dto/sales-book-form-dto";
import { getLoggedInDealerAccountDta } from "./sales-dealer-dta";
import { getSalesFormStepByIdDta } from "./sales-form-step-dta";
import { salesTaxForm } from "./sales-tax.persistent";
import { DeliveryOption } from "@/types/sales";

export interface GetSalesBookFormDataProps {
    type?: SalesType;
    slug?: string;
    id?: number;
    restoreMode?: boolean;
    customerId?: number;
}
type GetSalesBookFormDataDta = AsyncFnType<typeof getSalesBookFormDataDta>;
export async function getSalesBookFormDataDta(data: GetSalesBookFormDataProps) {
    // const where = {}
    const where: Prisma.SalesOrdersWhereInput = {
        isDyke: true,
        type: data?.type,
    };
    if (data.id) where.id = data.id;
    else if (data.slug) where.slug = data.slug;
    else {
        throw new Error("Invalid operation");
    }

    if (data.restoreMode) where.deletedAt = whereTrashed.where.deletedAt;

    const order = await prisma.salesOrders.findFirst({
        where,
        include: SalesBookFormIncludes(
            data.restoreMode
                ? {
                      deletedAt: {},
                  }
                : {}
        ),
    });

    const prodIds = order?.items
        ?.map((item) => item.formSteps.map((fs) => fs.prodUid))
        .flat()
        .filter(Boolean);
    const stepComponents = await getFormStepComponentsDta(prodIds || []);
    const meta = (order?.meta || {}) as any as Partial<SalesMeta>;
    if (meta.deliveryCost) {
        order.extraCosts.push({
            label: "Delivery",
            amount: meta.deliveryCost,
            orderId: order.id,
            type: "Delivery",
        } as any);
        meta.deliveryCost = null;
    }
    const labor = order?.extraCosts.find((a) => a.type == "Labor");
    if (!labor)
        order.extraCosts.push({
            type: "Labor",
            label: "Labor",
            orderId: order.id,
        } as any);
    return {
        order: {
            ...(order as Partial<typeof order>),
            meta,
        },
        extraCosts: order?.extraCosts,
        stepComponents,
    };
    // return typedSalesBookForm(order)
}
export async function createSalesBookFormDataDta(
    props: GetSalesBookFormDataProps
) {
    const session = await user();
    const ctx = await salesFormData(true);
    const dealer = await getLoggedInDealerAccountDta();
    let goodUntil = ctx.defaultProfile?.goodUntil;
    if (goodUntil && typeof goodUntil != "string")
        goodUntil = dayjs(goodUntil).toISOString();
    const salesRep = dealer?.id
        ? ({} as any)
        : {
              name: session.name,
              id: session.id,
          };
    const data: Partial<GetSalesBookFormDataDta> = {
        stepComponents: [],
        order: {
            type: props.type,
            salesRepId: salesRep?.id,
            isDyke: true,
            customerId: dealer?.dealerId,
            customerProfileId: ctx.defaultProfile?.id,
            status: dealer?.id ? "Evaluating" : "Active",
            taxPercentage: +ctx.settings?.tax_percentage,
            paymentTerm: ctx.defaultProfile?.meta?.net,
            goodUntil,
            deliveryOption: "pickup" as DeliveryOption,
            meta: {
                sales_percentage: ctx.defaultProfile?.coefficient,
                ccc_percentage: +ctx?.settings?.ccc,
                tax: true,
                calculatedPriceMode: true,
            },
            taxes: [],
            extraCosts: [
                {
                    type: "Labor",
                    label: "Labor",
                    // orderId: order.id,
                } as any,
            ],
            items: [
                {
                    meta: {},
                    formSteps: [(await getSalesFormStepByIdDta(1)) as any],
                    shelfItems: [],
                } as any,
            ],
            salesRep,
            createdAt: dayjs().toISOString() as any,
        },
    };
    return await formatForm(data as any);
}
async function formatForm(data: GetSalesBookFormDataDta) {
    const result = transformSalesBookForm(data);
    const { deleteDoors } = result;
    if (deleteDoors?.length)
        await prisma.dykeSalesDoors.updateMany({
            where: { id: { in: deleteDoors }, salesOrderId: data.order?.id },
            data: {
                deletedAt: new Date(),
            },
        });
    const ctx = await salesFormData(true);
    const _taxForm = await salesTaxForm(
        data.order.taxes as any,
        data.order?.id,
        ctx?.defaultProfile?.meta?.taxCode
    );
    return {
        ...result,
        customer: data.order.customer,
        dealerMode: await dealerSession(),
        superAdmin: (await userId()) == 1,
        adminMode: true,
        shippingAddressId: data?.order?.shippingAddressId,
        billingAddressId: data?.order?.billingAddressId,
        customerId: data?.order?.customerId,
        salesProfile: data.order.salesProfile,
        data: ctx,
        _taxForm,
    };
}
export async function getTransformedSalesBookFormDataDta(
    data: GetSalesBookFormDataProps
) {
    const sbf = await getSalesBookFormDataDta(data);
    return await formatForm(sbf);
}
export async function getFormStepComponentsDta(uids) {
    const c = await prisma.dykeStepProducts.findMany({
        where: {
            uid: { in: Array.from(new Set(uids)) },
        },
    });
    return c.map((component) => ({
        ...component,
        meta: component.meta as any as StepComponentMeta,
    }));
}
export async function saveSalesComponentPricingDta(
    prices: Partial<ComponentPrice>[],
    orderId
) {
    return;
    const ids = [];
    const filterPrices = prices.filter((p) => p.qty);
    await Promise.all(
        filterPrices
            .filter((p) => p.qty)
            .map(async (price) => {
                price.salesProfit = price.salesTotalCost - price.baseTotalCost;
                if (!price.type) price.type = "...";
                const s = await prisma.componentPrice.upsert({
                    create: {
                        ...(price as any),
                    },
                    update: {
                        ...price,
                    },
                    where: {
                        id: price.id,
                    },
                });
                ids.push(s.id);
            })
    );
    const res = await prisma.componentPrice.updateMany({
        where: {
            salesId: orderId,
            id: {
                notIn: ids.filter((id) => id > 0),
            },
        },
        data: {
            deletedAt: new Date(),
        },
    });
}

// --- Content from: ai/sales-form/sales-id-dta.ts ---
import { user } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { generateSalesSlug } from "@sales/utils/utils";

export async function generateSalesId(type) {
    return await generateSalesSlug(
        type,
        prisma.salesOrders,
        (await user()).name,
    );
}

// --- Content from: ai/sales-form/service-ctx.tsx ---
import { createContext, useContext, useEffect, useMemo } from "react";
import { useFormDataStore } from "../../_common/_stores/form-data-store";

import { MouldingClass } from "../../_utils/helpers/zus/moulding-class";
import { ServiceClass } from "../../_utils/helpers/zus/service-class";
export const Context = createContext<ReturnType<typeof useCreateContext>>(
    null as any,
);
export const useCtx = () => useContext(Context);

export const useCreateContext = (itemStepUid) => {
    const [itemUid, stepUid] = itemStepUid?.split("-");
    const zus = useFormDataStore();

    const itemIds = zus?.kvFormItem?.[itemUid]?.groupItem?.itemIds;
    const ctx = new ServiceClass(itemStepUid);
    useEffect(() => {
        ctx.dotUpdateItemForm("groupItem.type", "SERVICE");
    }, []);
    const _ctx = useMemo(() => {
        const itemForm = ctx.getItemForm();
        return {
            zus,
            ctx,
            itemForm,
            ...ctx.getServiceLineForm(),
        };
    }, [
        itemStepUid,
        // zus?.kvFormItem?.[itemUid]?.groupItem?.itemIds,
        // itemStepUid, zus
    ]);
    return {
        ctx,
        itemIds,
        ..._ctx,
    };
};

// --- Content from: ai/sales-form/sales-form.tsx ---
import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import ItemSection from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/item-section";
import { zhAddItem } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/zus-form-helper";
import { Icons } from "@/components/_v1/icons";
import Button from "@/components/common/button";
import useEffectLoader from "@/lib/use-effect-loader";
import { cn } from "@/lib/utils";
import { FormWatcher } from "./form-watcher";
import TakeOff from "./take-off";
import { TakeoffSwitch } from "./take-off/takeoff-switch";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Menu as MenuIcon, X } from "lucide-react";
import { useState } from "react";
import { SalesFormSidebar } from "./sales-form-sidebar";
import { useSalesSummaryToggle } from "@/store/invoice-summary-toggle";
import { SalesFormSave } from "./sales-form-save";
import { useSalesPreview } from "@/hooks/use-sales-preview";

export function SalesFormClient({ data }) {
    const zus = useFormDataStore();
    useEffectLoader(
        () => {
            zus.dotUpdate("currentTab", "invoice");
        },
        {
            wait: 200,
        }
    );

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { hidden } = useSalesSummaryToggle();
    const sPreview = useSalesPreview();
    const [takeOff, takeOffChanged] = useLocalStorage("take-off", false);
    if (!zus.formStatus || zus.currentTab != "invoice") return <></>;
    function preview() {
        sPreview.preview(zus.metaData?.salesId, zus?.metaData?.type);
    }
    return (
        <div className="min-h-screen w-full bg-white dark:bg-primary-foreground  xl:gap-4">
            <div
                className={cn(
                    " bg-white border-b border-gray-200 p-4 flex items-center gap-4",
                    hidden || "xl:hidden"
                )}
            >
                <h1 className="text-xl capitalize font-semibold text-gray-900">
                    {data?.order?.type} Builder
                </h1>
                <div className="flex-1"></div>
                <SalesFormSave />
                <Button
                    size="sm"
                    onClick={() => preview()}
                    className="flex items-center gap-2"
                >
                    <MenuIcon className="h-4 w-4 mr-2" />
                    Preview
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSidebarOpen(true)}
                    className="flex items-center gap-2"
                >
                    <MenuIcon className="h-4 w-4" />
                    Invoice Details
                </Button>
            </div>
            <div className="flex">
                <div className={cn("flex-1", !hidden && "xl:mr-96")}>
                    {takeOff ? (
                        <TakeOff />
                    ) : (
                        <div className={cn("hiddens")}>
                            {zus.sequence?.formItem?.map((uid) => (
                                <ItemSection key={uid} uid={uid} />
                            ))}
                        </div>
                    )}
                    <div className="mt-4 flex justify-end">
                        <Button
                            onClick={() => {
                                zhAddItem();
                            }}
                        >
                            <Icons.add className="mr-2 size-4" />
                            <span>Add</span>
                        </Button>
                    </div>
                </div>
                <div className={cn("hidden", !hidden && "xl:block")}>
                    <SalesFormSidebar />
                </div>
                {sidebarOpen && (
                    <div
                        className={cn(
                            "fixed inset-0 z-50 flex",
                            !hidden && "xl:hidden"
                        )}
                    >
                        <div
                            className="flex-1 bg-black bg-opacity-50"
                            onClick={() => setSidebarOpen(false)}
                        />
                        <div className="sw-full ssm:w-[70vw] w-96 bg-white">
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                <h2 className="text-lg font-semibold">
                                    Invoice Details
                                </h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <SalesFormSidebar
                                onClose={() => setSidebarOpen(false)}
                            />
                        </div>
                    </div>
                )}
            </div>
            {/* <div className="relative lg:w-[350px]">
                <div className="sticky top-16 flex w-full flex-col">
                    <div className="">
                        <SalesMetaForm />
                    </div>
                </div>
            </div> */}
            <FormWatcher />
            <TakeoffSwitch {...{ takeOff, takeOffChanged }} />
        </div>
    );
}

// --- Content from: ai/sales-form/component-item-card.tsx ---
import {
    Fragment,
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
} from "react";
import { updateComponentsSortingAction } from "@/actions/update-components-sorting";
import { DeleteRowAction } from "@/components/_v1/data-table/data-table-row-actions";
import { Icons } from "@/components/_v1/icons";
import { Menu } from "@/components/(clean-code)/menu";
import { _modal } from "@/components/common/modal/provider";
import { CustomComponentForm } from "@/components/forms/sales-form/custom-component";
import { useSortControl } from "@/hooks/use-sort-control";
import { cn } from "@/lib/utils";
import { closestCorners } from "@dnd-kit/core";
import {
    BoxSelect,
    CheckCircle,
    ExternalLink,
    Filter,
    Folder,
    Info,
    LineChart,
    LucideVariable,
    Variable,
    VariableIcon,
} from "lucide-react";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Skeleton } from "@gnd/ui/skeleton";
import { Sortable, SortableItem } from "@gnd/ui/sortable";

import {
    useFormDataStore,
    ZusComponent,
} from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { ComponentHelperClass } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import { zusDeleteComponents } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/zus-step-helper";

import { openComponentModal } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/component-form";
import { openEditComponentPrice } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/component-price-modal";
import { openSectionSettingOverride } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/component-section-setting-override";
import { openComponentVariantModal } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/component-visibility-modal";
import { openDoorPriceModal } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-price-modal";
import DoorSizeModal from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-modal";
import { openDoorSizeSelectModal } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-select-modal/open-modal";
import { openStepPricingModal } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/step-pricing-modal";
import {
    UseStepContext,
    useStepContext,
} from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/components-section/ctx";
import { CustomComponentAction } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/components-section/custom-component.action";
import SearchBar from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/components-section/search-bar";
import { Tabs } from "@gnd/ui/custom/tabs";
import { DoorSuppliers } from "@/components/forms/sales-form/door-suppliers";
import { DoorSupplierBadge } from "@/components/forms/sales-form/door-supplier-badge";
import { SuperAdminGuard } from "@/components/auth-guard";
import Image from "next/image";
import { env } from "@/env.mjs";
import { ComponentImg } from "@/components/forms/sales-form/component-img";

interface Props {
    itemStepUid;
}

export function ComponentItemCard({
    component,
    ctx,
    swapDoor,
    sortMode,
    itemIndex,
    onSelect,
}: {
    component: ZusComponent;
    ctx: UseStepContext;
    swapDoor?;
    sortMode?;
    itemIndex?;
    onSelect?;
}) {
    const { stepUid } = ctx;
    const zus = useFormDataStore();
    const stepForm = zus.kvStepForm[stepUid];

    const selectState = ctx.selectionState;
    const [open, setOpen] = useState(false);

    const { cls } = useMemo(() => {
        const cls = new ComponentHelperClass(
            stepUid,
            component?.uid,
            component
        );
        return {
            cls,
        };
    }, [component, stepUid]);
    async function deleteStepItem() {
        await zusDeleteComponents({
            zus,
            stepUid,
            productUid: [component.uid],
        });
        ctx.cls.deleteComponent(component.id);
    }
    const editVisibility = useCallback(() => {
        openComponentVariantModal(cls, [component.uid]);
    }, [cls, component]);
    const editPrice = useCallback(() => {
        openEditComponentPrice(cls);
    }, [cls]);
    const editDoorPrice = useCallback(() => {
        openDoorPriceModal(cls);
    }, [cls]);
    const selectComponent = useCallback(() => {
        if (onSelect) {
            onSelect(cls);
            return;
        }
        if (selectState.count) {
            ctx.toggleComponent(component.uid);
            return;
        }
        if (cls.isDoor()) {
            openDoorSizeSelectModal(cls, swapDoor);
        } else cls.selectComponent();
    }, [selectState, cls, component, ctx]);
    const multiSelect = cls.isMultiSelect();

    return (
        <div className="group relative flex min-h-[25vh] flex-col p-2 xl:min-h-[35vh]">
            {/* {multiSelect &&
                cls.multiSelected() &&
                cls.getMultiSelectData()?.length} */}
            <button
                className={cn(
                    "h-full w-full overflow-hiddens  rounded-lg border-2 hover:border-primary-foreground",
                    (multiSelect && cls.multiSelected()) ||
                        stepForm?.componentUid == component.uid
                        ? "border-muted-foreground bg-muted"
                        : "hover:border-muted-foreground/50",
                    sortMode &&
                        "border-dashed border-muted-foreground hover:border-muted-foreground"
                )}
                onClick={!sortMode ? selectComponent : undefined}
            >
                <div className="flex h-full flex-col">
                    <div className="flex-1 flex relative">
                        {/* <Image
                            className="aspect-square"
                            src={`${env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/dyke/${component.img}`}
                            // src={component.img}
                            alt={component.title}
                            width={128}
                            height={128}
                        /> */}
                        <ComponentImg
                            noHover={sortMode}
                            aspectRatio={4 / 2}
                            src={component.img}
                        />
                        <div className="absolute hidden bottom-0 right-0">
                            <div className="flex  gap-2 items-center text-xs font-semibold px-2">
                                <div className="flex-1" />
                                {component.salesPrice && (
                                    <Badge
                                        className="h-5 px-1"
                                        variant="default"
                                    >
                                        ${component.salesPrice}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col p-2">
                        <Label className="text-start leading-normal uppercase line-clamp-3">
                            {component.title}
                        </Label>
                    </div>
                </div>
            </button>
            <div className="absolute  -left-3s flex flex-col gap-2 z-20">
                <div className={cn(selectState?.count ? "flex" : "hidden")}>
                    <Checkbox checked={selectState?.uids?.[component.uid]} />
                </div>
                {component.salesPrice && (
                    <Badge className="font-bold px-1" variant="default">
                        ${component.salesPrice}
                    </Badge>
                )}
                <Badge
                    className="flex flex-col p-0.5 gap-1  border w-fit"
                    variant="secondary"
                >
                    <div
                        className={cn(
                            !component?.variations?.length && "hidden",
                            "px-1"
                        )}
                    >
                        <Filter className="size-4 text-muted-foreground/70" />
                    </div>
                    <div
                        className={cn(
                            !component?.sectionOverride?.overrideMode &&
                                "hidden"
                        )}
                    >
                        <LucideVariable className="size-4 text-muted-foreground/70" />
                    </div>
                    <div className={cn(!component.redirectUid && "hidden")}>
                        <ExternalLink className="h-4 w-4 text-muted-foreground/70" />
                    </div>
                </Badge>

                {/* <SuperAdminGuard>
                                {!component?.statistics || (
                                    <Badge
                                        className="h-5 font-bold gap-1 flex items-center px-1"
                                        variant="secondary"
                                    >
                                        <LineChart className="size-4" />
                                        {component?.statistics}
                                    </Badge>
                                )}
                            </SuperAdminGuard> */}
            </div>
            {component.productCode ? (
                <div className="s-rotate-90 -translate-y-1/2s top-1/2s absolute left-4 top-4 transform text-xs font-bold uppercase tracking-wider  text-muted-foreground">
                    {component.productCode}
                </div>
            ) : null}

            <div
                className={cn(
                    "absolute  left-0 top-0 m-4 flexs hidden items-center gap-2"
                )}
            >
                <div className={cn(selectState?.count ? "" : "hidden")}>
                    <Checkbox checked={selectState?.uids?.[component.uid]} />
                </div>
                <div className={cn(!component?.variations?.length && "hidden")}>
                    <Filter className="size-4 text-muted-foreground/70" />
                </div>
                <div
                    className={cn(
                        !component?.sectionOverride?.overrideMode && "hidden"
                    )}
                >
                    <LucideVariable className="size-4 text-muted-foreground/70" />
                </div>
                <div className={cn(!component.redirectUid && "hidden")}>
                    <ExternalLink className="h-4 w-4 text-muted-foreground/70" />
                </div>
            </div>
            <div
                className={cn(
                    "absolute right-0 top-0",
                    open
                        ? ""
                        : selectState?.count
                        ? "hidden"
                        : "hidden bg-muted dark:bg-muted-foreground group-hover:flex"
                )}
            >
                <div>
                    <Menu open={open} onOpenChanged={setOpen}>
                        <Menu.Item
                            Icon={Icons.edit}
                            SubMenu={
                                <>
                                    <Menu.Item
                                        onClick={() => {
                                            openComponentModal(
                                                ctx.cls,
                                                component
                                            );
                                        }}
                                        Icon={Info}
                                    >
                                        Details
                                    </Menu.Item>
                                    <Menu.Item
                                        onClick={editVisibility}
                                        Icon={Variable}
                                    >
                                        Visibility
                                    </Menu.Item>
                                    <Menu.Item
                                        disabled={cls.isDoor()}
                                        onClick={
                                            cls.isDoor()
                                                ? editDoorPrice
                                                : editPrice
                                        }
                                        Icon={Icons.dollar}
                                    >
                                        Price
                                    </Menu.Item>
                                    <Menu.Item
                                        onClick={() => {
                                            openSectionSettingOverride(cls);
                                        }}
                                        Icon={VariableIcon}
                                    >
                                        Section Setting Override
                                    </Menu.Item>
                                </>
                            }
                        >
                            Edit
                        </Menu.Item>
                        <Menu.Item
                            onClick={() => {
                                // zusToggleComponentSelect({
                                //     stepUid,
                                //     zus,
                                //     productUid: component.uid,
                                // });
                                ctx.toggleComponent(component.uid);
                            }}
                            Icon={CheckCircle}
                        >
                            Select
                        </Menu.Item>
                        <RedirectMenuItem cls={cls} />
                        <DeleteRowAction menu action={deleteStepItem} />
                    </Menu>
                </div>
            </div>
        </div>
    );
}
function RedirectMenuItem({ cls }: { cls: ComponentHelperClass }) {
    const { redirectRoutes } = useMemo(() => {
        return {
            redirectRoutes: cls.getRedirectableRoutes(),
        };
    }, [cls]);

    return (
        <Menu.Item
            Icon={ExternalLink}
            disabled={!redirectRoutes?.length}
            SubMenu={
                <>
                    {cls.redirectUid && (
                        <Menu.Item
                            onClick={() => cls.saveComponentRedirect(null)}
                        >
                            Cancel Redirect
                        </Menu.Item>
                    )}
                    {redirectRoutes?.map((r) => (
                        <Menu.Item
                            onClick={() => cls.saveComponentRedirect(r.uid)}
                            key={r.uid}
                        >
                            {r.title}
                        </Menu.Item>
                    ))}
                </>
            }
        >
            Redirect
        </Menu.Item>
    );
}

// --- Content from: ai/sales-form/components-step-context.tsx ---
import { useEffect, useMemo, useRef, useState } from "react";
import {
    useFormDataStore,
    ZusComponent,
} from "../../_common/_stores/form-data-store";

import { StepHelperClass } from "../../_utils/helpers/zus/step-component-class";
import { useSticky } from "../../_hooks/use-sticky";
import { useDebounce } from "@/hooks/use-debounce";
import { Edit3, EyeOff, Layout } from "lucide-react";

export type UseStepContext = ReturnType<typeof useStepContext>;
export function useStepContext(stepUid) {
    const [selectionState, setSelectionState] = useState({
        uids: {},
        count: 0,
    });
    const [stepComponents, setStepComponents] = useState<ZusComponent[]>([]);
    const [q, setQ] = useState("");
    const db = useDebounce(q, 300);

    const [tabComponents, setTabComponents] = useState<ZusComponent[]>([]);
    const [filteredComponents, setFilteredComponents] = useState<
        ZusComponent[]
    >([]);
    // const [tabs, setTabs] = useState<
    //     { title; count; Icon?; tab: typeof tab }[]
    // >([]);
    function selectAll() {
        setSelectionState((pre) => {
            const uids = {};
            filteredComponents.map((s) => (uids[s.uid] = true));
            //
            return {
                uids,
                count: filteredComponents.length,
            };
        });
    }
    // const _items = useFormDataStore().kvFilteredStepComponentList?.[stepUid];
    const tabs = useMemo(() => {
        const tabCounts = {
            main: stepComponents.filter(
                (s) => s._metaData.visible && !s._metaData.custom,
            ).length,
            custom: stepComponents.filter((s) => s._metaData.custom).length,
            hidden: stepComponents.filter(
                (s) => !s._metaData.visible && !s._metaData.custom,
            ).length,
        };

        return [
            {
                title: "Default Components",
                count: tabCounts.main,
                Icon: Layout,
                tab: "main",
            },
            {
                title: "Custom Components",
                count: tabCounts.custom,
                Icon: Edit3,
                tab: "custom",
            },
            {
                title: "Hidden Components",
                count: tabCounts.hidden,
                Icon: EyeOff,
                tab: "hidden",
            },
        ];
    }, [stepComponents]);
    const [tab, setTab] = useState<"main" | "custom" | "hidden">("main");

    useEffect(() => {
        setTabComponents(
            stepComponents.filter((s) => {
                const md = s._metaData;
                return tab == "custom"
                    ? md.custom
                    : tab == "hidden"
                      ? !md.visible
                      : md.visible;
            }),
        );
    }, [tab, stepComponents]);
    useEffect(() => {
        const _filtered = stepComponents.filter((s) => {
            const filters = [];
            if (q)
                filters.push(
                    s.title?.toLowerCase()?.includes(q?.toLowerCase()),
                );
            switch (tab) {
                case "hidden":
                    filters.push(!s._metaData.visible);
                    break;
                case "main":
                    filters.push(s._metaData.visible);
                    filters.push(!s._metaData.custom);
                    break;
                case "custom":
                    filters.push(s._metaData.custom);
                    break;
            }
            return filters.every((s) => s);
        });
        setFilteredComponents(_filtered);
    }, [stepComponents, db, tab]);
    const salesMultiplier = useFormDataStore(
        (s) => s.metaData?.salesMultiplier,
    );
    const stepHelper = useMemo(() => new StepHelperClass(stepUid), [stepUid]);
    const zusStepComponents = stepHelper.getStepComponents;
    useEffect(() => {
        stepHelper.fetchStepComponents().then(setStepComponents);
    }, [salesMultiplier, zusStepComponents]);

    const sticky = useSticky((bv, pv, { top, bottom }) => !bv && pv);
    const props = {
        stepUid,
        items: filteredComponents,
        sticky,
        // searchFn
    };

    return {
        tabs,
        setTab,
        tab,
        tabComponents,
        stepComponents,
        selectAll,
        q,
        setQ,
        items: filteredComponents || [],
        setItems: setFilteredComponents,
        sticky,
        cls: stepHelper,
        props,
        stepUid,
        clearSelection() {
            setSelectionState({
                uids: {},
                count: 0,
            });
        },
        toggleComponent(componentUid) {
            setSelectionState((current) => {
                const state = !current.uids?.[componentUid];
                const count = current.count + (state ? 1 : -1);
                const resp = {
                    uids: {
                        ...current?.uids,
                        [componentUid]: state,
                    },
                    count,
                };

                return resp;
            });
        },

        selectionState,
    };
}

// --- Content from: ai/sales-form/zus-step-helper.ts ---
import { deleteStepComponentsUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/step-component-use-case";
import { ZusSales } from "../../../_common/_stores/form-data-store";
import { toast } from "sonner";
import { StepHelperClass } from "./step-component-class";

interface LoadStepComponentsProps {
    stepUid: string;
    zus: ZusSales;
}

export async function zusDeleteComponents({
    stepUid,
    zus,
    productUid,
    selection,
}: LoadStepComponentsProps & { productUid: string[]; selection?: boolean }) {
    let uids = productUid?.filter(Boolean);
    const [uid, _stepUid] = stepUid?.split("-");

    if (uids.length) {
        await deleteStepComponentsUseCase(uids);
        toast.message("Deleted.");
    }
    // const stepComponents = zus.kvStepComponentList[_stepUid];
    // zus.dotUpdate(
    //     `kvStepComponentList.${_stepUid}`,
    //     stepComponents?.filter((c) => uids.every((u) => u != c.uid))
    // );
}

// --- Content from: ai/sales-form/service-class.ts ---
import { generateRandomString } from "@/lib/utils";
import { ZusSales } from "../../../_common/_stores/form-data-store";
import { GroupFormClass } from "./group-form-class";
import { StepHelperClass } from "./step-component-class";

export class ServiceClass extends GroupFormClass {
    constructor(public itemStepUid) {
        super(itemStepUid);
    }

    public getServiceLineForm() {
        const services = this.getServices();
        const resp = {
            lines: services.map((m) => {
                // const priceModel = this.getCurrentComponentPricingModel(m.uid);
                return {
                    ...m,
                    // basePrice: priceModel?.pricing,
                };
            }),
        };
        return resp;
    }
    public addServiceLine() {
        const uid = generateRandomString(5);

        const itemForm = this.getItemForm();
        const itemsUids = itemForm.groupItem.itemIds;
        itemsUids.push(uid);
        this.dotUpdateItemForm("groupItem.itemIds", itemsUids);
        this.dotUpdateGroupItemForm(uid, {
            // addon: "",
            pricing: {
                addon: "",
                customPrice: "",

                totalPrice: 0,
            },
            meta: {
                description: "",
                produceable: false,
                taxxable: false,
                // noHandle: true,
            },
            qty: {
                total: "",
            },
            selected: true,
            swing: "",
        });
    }
    public getServices() {
        const itemForm = this.getItemForm();
        const uid = generateRandomString(5);
        let groupItem = itemForm.groupItem || {
            itemIds: [uid],
            form: {
                [uid]: {
                    pricing: {
                        addon: "",
                        customPrice: "",
                    },
                    meta: {
                        description: "",
                        produceable: false,
                        taxxable: false,
                    },
                    qty: {
                        total: "",
                    },
                    selected: true,
                    swing: "",
                },
            },
            itemType: "Services",
            qty: {
                total: 0,
            },
            pricing: {
                components: {
                    basePrice: 0,
                    salesPrice: 0,
                },
                total: {
                    basePrice: 0,
                    salesPrice: 0,
                },
            },
        };

        if (!itemForm.groupItem)
            this.dotUpdateItemForm("groupItem", groupItem as any);
        return groupItem.itemIds
            .map((itemUid) => {
                return {
                    itemUid,
                    selected: itemForm.groupItem?.form?.[itemUid]?.selected,
                };
            })
            ?.filter((s) => s.selected);
    }
}

// --- Content from: ai/sales-form/step-component-class.ts ---
import { dotSet } from "@/app/(clean-code)/_common/utils/utils";
import { getPricingByUidUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-pricing-use-case";
import {
    getStepComponentsUseCase,
    saveComponentRedirectUidUseCase,
} from "@/app/(clean-code)/(sales)/_common/use-case/step-component-use-case";
import { _modal } from "@/components/common/modal/provider";
import { generateRandomString, sum } from "@/lib/utils";
import { FieldPath, FieldPathValue } from "react-hook-form";
import { toast } from "sonner";

import {
    ZusComponent,
    ZusItemFormData,
    ZusSales,
    ZusStepFormData,
} from "../../../_common/_stores/form-data-store";
import { SettingsClass } from "./settings-class";
import { zhHarvestDoorSizes } from "./zus-form-helper";

interface Filters {
    stepUid?;
    stepTitle?;
}
export class StepHelperClass extends SettingsClass {
    stepUid: string;
    itemUid;
    constructor(
        public itemStepUid,
        public staticZus?: ZusSales,
    ) {
        const [itemUid, stepUid] = itemStepUid?.split("-");
        super(itemStepUid, itemUid, stepUid, staticZus);
        this.itemUid = itemUid;
        this.stepUid = stepUid;
    }

    public isShelfItems() {
        return this.getStepForm()!.title == "Shelf Items";
    }
    public isHtp() {
        return this.getStepForm()!.title == "House Package Tool";
    }
    public isDoor() {
        return this.getStepForm().title == "Door";
    }
    public getDoorStepForm2() {
        const doorStepForm = Object.entries(this.zus.kvStepForm).find(
            ([k, v]) => k.startsWith(`${this.itemUid}-`) && v.title === "Door",
        );
        return {
            itemStepUid: doorStepForm?.[0],
            form: doorStepForm?.[1],
        };
    }
    public setDoorSupplier(
        doorItemStepUid?,
        supplier?: {
            uid: string;
            name: string;
        },
    ) {
        if (!doorItemStepUid)
            doorItemStepUid = this.getDoorStepForm2()?.itemStepUid;

        if (doorItemStepUid) {
            this.zus.dotUpdate(
                `kvStepForm.${doorItemStepUid}.formStepMeta.supplierUid`,
                supplier?.uid || null,
            );
            this.zus.dotUpdate(
                `kvStepForm.${doorItemStepUid}.formStepMeta.supplierName`,
                supplier?.name || null,
            );
        }
    }
    public isLineItem() {
        return this.getStepForm().title == "Line Item";
    }
    public isMoulding() {
        // return this.getStepForm().title == "Moulding";
        // console.log(this.getItemForm().groupItem?.type);
        const config = this.getRouteConfig();
        return config?.shelfLineItems;
        // return [
        //     // "door",
        //     "moulding",
        //     // "weatherstrip color",
        //     "door hardware",
        // ].includes(this.getStepForm().title?.trim()?.toLocaleLowerCase());
    }
    public isServiceLineItem() {
        return !this.isMoulding() && this.isLineItem();
    }
    public isMouldingLineItem() {
        return this.isMoulding() && this.isLineItem();
    }
    public isMultiSelect() {
        // return this.isDoor() || this.isMoulding();
        return this.isMultiSelectTitle(this.getStepForm().title);
    }
    public isMultiSelectTitle(title) {
        return ["door", "moulding", "weatherstrip color"].includes(
            title?.trim()?.toLocaleLowerCase(),
        );
    }
    public getTotalSelectionsCount() {
        return this.getItemForm()?.groupItem?.itemIds?.length;
    }
    public getSelectionComponentUids() {
        console.log(this.getItemForm()?.groupItem);

        return this.getItemForm()?.groupItem?.itemIds;
    }
    public getTotalSelectionsQty() {
        return this.getItemForm()?.groupItem?.qty?.total;
    }
    public hasSelections() {
        return this.getTotalSelectionsQty() && this.isMultiSelect();
    }
    public getStepIndex() {
        const index = this.getItemStepSequence()?.indexOf(this.itemStepUid);
        return index;
    }
    public getItemStepSequence() {
        const sequence = this.zus.sequence.stepComponent?.[this.itemUid];
        return sequence;
    }
    public getCurrentStepSequence() {
        const sequence = this.getItemStepSequence();
        const index = this.getStepIndex();
        return sequence.filter((a, i) => i <= index);
    }
    public getItemStepForms() {
        const sequence = this.getItemStepSequence();
        return Object.entries(this.zus.kvStepForm)
            .filter(([k, data]) => sequence.includes(k))
            .map(([k, data]) => data);
    }
    public getStepSequence() {
        return this.getItemStepSequence()
            ?.map((s) => s.split("-")?.[1])
            .filter(Boolean);
    }
    public getItemForm() {
        return this.zus.kvFormItem[this.itemUid];
    }
    public getStepForm() {
        return this.zus.kvStepForm[this.itemStepUid];
    }
    public updateStepForm(data: ZusStepFormData) {
        Object.entries(data).map(([k, v]) => {
            this.zus.dotUpdate(`kvStepForm.${this.itemStepUid}.${k}` as any, v);
        });
    }
    public getSupplierInfo() {
        // const s = Object.entries(this.zus.kvStepForm).find(
        //     ([itemStepUid, stepData]) =>
        //         itemStepUid?.startsWith(`${this.itemUid}-`) &&
        //         stepData?.title == "Supplier",
        // );
    }
    public findStepForm(stepUid) {
        return this.zus.kvStepForm[`${this.itemUid}-${this.stepUid}`];
    }
    public getStepPriceDeps() {
        const stepForm = this.getStepForm();
        return stepForm?.meta?.priceStepDeps || [];
    }
    public stepValueUids(stepUids: string[]) {
        // const uidStacks = [];
        return stepUids
            .map((uid) => {
                return this.zus.kvStepForm[`${this.itemUid}-${uid}`]
                    ?.componentUid;
            })
            .filter(Boolean)
            .join("-");
    }
    public getComponentPricings(componentUid) {
        // if(!component)componentUid = this.
        const pricings = this.zus.pricing[componentUid];
        return pricings;
    }
    public getVisibleComponents() {
        // const ls = this.getStepComponents;
        // if (ls) return this.filterStepComponents(ls);
        const sets = this.zus.setting?.stepsByKey?.[this.stepUid]?.components;
        if (sets?.length) {
            return this.filterStepComponents(sets as any);
        }
        return [];
    }
    public getComponentPrice(componentUid) {
        const priceDeps = this.getStepPriceDeps();
        const componentPricings = this.getComponentPricings(componentUid);
        const stepUids = this.stepValueUids(priceDeps);

        if (!priceDeps.length) {
            return componentPricings?.[componentUid]?.price || null;
        }
        return componentPricings?.[stepUids]?.price || null;
    }
    public isComponentVisible(c: ZusComponent) {
        let vis = [];
        if (c.variations?.length) {
            c.variations.some((v) => {
                const rules = v.rules;
                const matches = rules.every(
                    ({ componentsUid, operator, stepUid: __stepUid }) => {
                        const selectedComponentUid =
                            this.zus.kvStepForm[`${this.itemUid}-${__stepUid}`]
                                ?.componentUid;
                        return (
                            !componentsUid?.length ||
                            (operator == "is"
                                ? componentsUid?.some(
                                      (a) => a == selectedComponentUid,
                                  )
                                : componentsUid?.every(
                                      (a) => a != selectedComponentUid,
                                  ))
                        );
                    },
                );
                if (matches)
                    vis.push(...rules.map((r) => r.componentsUid.join("-")));
                return matches;
            });
            if (!vis.length) return null;
            return vis;
        }
        return ["default"];
    }
    public get getStepComponents() {
        return this.zus.kvStepComponentList?.[this.stepUid];
    }
    public get getStepFilteredComponents() {
        // return this.zus.kvFilteredStepComponentList?.[this.itemStepUid];
        return this.zus.kvStepComponentList[this.stepUid];
    }
    public updateStepComponent(data) {
        this.zus.dotUpdate(
            `kvStepComponentList.${this.stepUid}`,
            this.getStepComponents?.map((c) => {
                if (c.uid == data.uid) return data;
                return c;
            }),
        );
        this.refreshStepComponentsData();
    }
    public updateComponentKey(key: FieldPath<ZusComponent>, value, ...uids) {
        this.zus.dotUpdate(
            `kvStepComponentList.${this.stepUid}`,
            this.getStepComponents?.map((c) => {
                if (uids.includes(c.uid)) {
                    const s = dotSet(c);
                    s.set(key as any, value);
                }

                return c;
            }),
        );
    }
    public updateStepComponentVariants(variations, componentUids: string[]) {
        this.zus.dotUpdate(
            `kvStepComponentList.${this.stepUid}`,
            this.getStepComponents?.map((c) => {
                if (componentUids.includes(c.uid)) c.variations = variations;

                return c;
            }),
        );
    }
    public getComponentVariantData() {
        const sequence = this.getItemStepSequence();
        const index = sequence?.indexOf(this.itemStepUid);
        const data: {
            steps: { uid: string; title: string }[];
            componentsByStepUid: {
                [stepUid in string]: {
                    uid: string;
                    title: string;
                }[];
            };
            stepsCount: number;
        } = {
            steps: [],
            componentsByStepUid: {},
            stepsCount: 0,
        };
        sequence
            .filter((s, i) => i < index)
            .map((s) => {
                const [_, currentStepUid] = s.split("-");
                const stepData = this.zus.setting.stepsByKey?.[currentStepUid];

                if (stepData) {
                    data.stepsCount++;
                    data.steps.push({
                        uid: currentStepUid,
                        title: stepData.title,
                    });
                    data.componentsByStepUid[currentStepUid] =
                        stepData.components || [];
                }
            });
        return data;
    }
    public async refreshStepComponentsData(reload = false) {
        await this.fetchStepComponents(reload);
    }
    public addStepComponent(component) {
        let _components = this.getStepComponents;
        let index = _components.findIndex((s) => s.id == component.id);
        if (index >= 0) _components[index] = component;
        else _components.push(component);
        this.zus.dotUpdate(`kvStepComponentList.${this.stepUid}`, [
            ..._components,
        ]);
        this.refreshStepComponentsData();
    }
    public deleteComponent(id) {
        this.zus.dotUpdate(`kvStepComponentList.${this.stepUid}`, [
            ...this.getStepComponents.filter((s) => s.id != id),
        ]);
        this.refreshStepComponentsData();
    }
    public async fetchStepComponents(reload = false) {
        const stepData = this.getStepForm();
        const ls = this.getStepComponents;

        const components =
            ls?.length && !reload
                ? ls
                : stepData
                  ? await getStepComponentsUseCase(
                        stepData.title,
                        stepData.stepId,
                    )
                  : [];
        if (!ls?.length || reload)
            this.zus.dotUpdate(
                `kvStepComponentList.${this.stepUid}`,
                components,
            );
        return this.filterStepComponents(components);
    }

    public getAllVisibleComponents(filter?: Filters) {
        const itemStepsUids = this.getItemStepSequence();
        return itemStepsUids

            .map((itemStepUid) => {
                const [itemUid, stepUid] = itemStepUid.split("-");
                // const rootStep = this.rootStepFromUid(stepUid);
                const itemStepCls = new StepHelperClass(itemStepUid);
                const components = itemStepCls.getVisibleComponents();
                const stepForm = itemStepCls.getStepForm();
                return {
                    stepTitle: stepForm.title,
                    stepUid: itemStepCls.stepUid,
                    components,
                };
            })
            .filter((a) => {
                if (filter?.stepTitle) return a.stepTitle == filter.stepTitle;
                if (filter?.stepUid) return a.stepUid == filter.stepUid;
                return true;
            })
            .map((a) => a.components)
            .flat()
            ?.filter((a) => a._metaData?.visible);
    }
    public selectionUid;
    public filterStepComponents(components: ZusComponent[]) {
        let filteredComponents = components
            // ?.filter(cls.isComponentVisible)
            ?.map((component, index) => {
                if (!component._metaData) component._metaData = {} as any;
                const vis = this.isComponentVisible(component);
                component._metaData.visible = !!vis;
                component.basePrice = this.getComponentPrice(component.uid);
                component.salesPrice = component._metaData.custom
                    ? component.basePrice
                    : this.calculateSales(component.basePrice);
                // component.salesPrice = component._metaData.custom
                //     ? component.basePrice
                //     : this.calculateSales(component.basePrice);
                // const sort = component._metaData.sorts?.find((s) =>
                //     vis?.includes(s.uid),
                // );
                // let sortIndex = sort?.sortIndex;
                // // component._metaData.sortId = this.getCurrentStepSequence();
                // component._metaData.sortIndex = sortIndex;
                // component._metaData.sortUid = sort?.uid || vis?.[0];
                return component;
            });
        // if (
        //     filteredComponents?.filter((a) => a._metaData.sortIndex)?.length > 0
        // ) {
        //     filteredComponents = filteredComponents.sort(
        //         (a, b) => a._metaData.sortIndex - b._metaData.sortIndex,
        //     );
        // }
        // this.zus.dotUpdate(
        //     `kvFilteredStepComponentList.${this.itemStepUid}`,
        //     filteredComponents,
        // );
        return filteredComponents;
    }
    public rootStepFromUid(stepUid) {
        const mainStep = Object.values(
            this.zus.setting.rootComponentsByKey,
        )?.find((s) => s.stepUid == stepUid);
        return mainStep;
    }
    public selectorState: {
        state: {
            uids: {};
            count: number;
        };
        setState: any;
    } = {
        state: null,
        setState: null,
    };
    public resetSelector(state, setState) {
        // this.selection = { count: 0, selection: {} };
        this.selectorState = {
            state,
            setState,
        };
        setState({
            uids: {},
            count: 0,
        });
        return this;
    }
    public toggleComponent(componentUid) {
        this.selectorState.setState?.((current) => {
            const state = !current.uids?.[componentUid];
            const count = current.count + state ? 1 : -1;
            const resp = {
                uids: {
                    ...current?.uids,
                    [componentUid]: state,
                },
                count,
            };

            return resp;
        });
    }
    public saveStepForm(data: ZusStepFormData) {
        this.zus.dotUpdate(`kvStepForm.${this.itemStepUid}`, data);
    }
    public saveItemForm(data: ZusItemFormData) {
        this.zus.dotUpdate(`kvFormItem.${this.itemUid}`, data);
    }
    public dotUpdateItemForm<K extends FieldPath<ZusItemFormData>>(
        k: K,
        value: FieldPathValue<ZusItemFormData, K>,
    ) {
        this.zus.dotUpdate(`kvFormItem.${this.itemUid}.${k}`, value as any);
    }
    public updateStepFormMeta(meta) {
        const step = this.getStepForm();
        const d = dotSet(step);
        d.set("meta", meta);
        this.saveStepForm(step);
    }
    public deleteStepsForm(itemStepsUid: string[]) {
        if (itemStepsUid?.length) {
            const newData = {};
            Object.entries(this.zus.kvStepForm)
                .filter(([a, b]) => !itemStepsUid?.includes(a))
                .map(([a, b]) => (newData[a] = b));
            this.zus.dotUpdate(`kvStepForm`, newData);
        }
    }
    public updateNextStepSequence(nextStepUid, stepForm) {
        const stepSq = this.getItemStepSequence();
        const prevStepIndex = stepSq.indexOf(this.itemStepUid);
        const prevNextStepUid = stepSq[prevStepIndex + 1];
        if (prevNextStepUid) {
            if (prevNextStepUid != nextStepUid) {
                const rems = stepSq.splice(
                    prevStepIndex + 1,
                    stepSq.length - prevStepIndex - 1,
                );
                this.deleteStepsForm(rems);
                stepSq.push(nextStepUid);
            }
        } else {
            stepSq.push(nextStepUid);
        }
        this.zus.dotUpdate(`kvStepForm.${nextStepUid}`, stepForm);
        this.zus.dotUpdate(`sequence.stepComponent.${this.itemUid}`, stepSq);
        this.toggleStep(nextStepUid);
    }
    public nextStep(isRoot = false, redirectUid = null) {
        const nrs = this.getNextRouteFromSettings(
            this.getItemForm(),
            isRoot,
            redirectUid,
        );

        if (!nrs.nextRoute) {
            toast.error("This Form Step Sequence has no next step.");
            return;
        }
        let { nextStepForm, nextRoute, nextStepUid } = nrs;
        if (!nextStepForm) {
            nextStepForm = {
                componentUid: null,
                meta: nextRoute.meta,
                flatRate: false,
            };
        }
        nextStepForm.title = nextRoute.title;
        nextStepForm.stepId = nextRoute.id;
        nextStepForm.value = nextStepForm.value || "";

        this.updateNextStepSequence(nextStepUid, nextStepForm);
    }
    public getDoorPriceModel(componentUid) {
        const { sizeList, height } = zhHarvestDoorSizes(this.zus, this.itemUid);
        const formData = {
            priceVariants: {} as {
                [size in string]: {
                    id?: number;
                    price?: number;
                };
            },
            stepProductUid: componentUid,
            dykeStepId: this.getStepForm().stepId,
        };

        const stepProdPricings = this.getComponentPricings(componentUid);
        sizeList.map((sl) => {
            // sl.size eg; 2-0 x 7-0.
            // new 2-0 x 7-0 & supplierUID
            const supllierSizeDep = this.supplierSizeDep(sl.size);

            formData.priceVariants[sl.size] = stepProdPricings?.[
                supllierSizeDep
                // sl.size
            ] || {
                id: null,
                price: "",
            };
        });
        let filt = sizeList?.filter((s) => s.height == height);

        return {
            formData,
            sizeList,
            height,
            heightSizeList: filt?.filter(
                (a, i) => i == filt.findIndex((s) => s.size == a.size),
            ),
        };
    }
    public supplierSizeDep = (size) => {
        const supplierUid =
            this.getDoorStepForm2()?.form?.formStepMeta?.supplierUid;
        if (!supplierUid) return size;
        return [size, supplierUid].join(" & ");
    };
    public getCurrentComponentPricingModel(componentUid) {
        const pm = this.getComponentPriceModel(componentUid);
        const variant = pm.priceVariants.find((s) => s.current);
        const pricing = pm?.pricing?.[variant?.path];
        return {
            variant,
            pricing,
        };
    }
    // public getItemType() {
    //      const stepSeq = this.getItemStepSequence()?.[0];
    //      const root = this.zus.kvStepForm[stepSeq];//?.componentUid;
    //      return root?.title
    // }
    public getPricedSteps() {
        // const itemForm = this.getItemForm();
        const itemSteps = this.getItemStepForms();
        return itemSteps
            .map((step) => {
                return {
                    title: step.title,
                    price: step.salesPrice,
                    value: step.value,
                };
            })
            .filter((p) => p.price);
    }
    public getComponentPriceModel(componentUid) {
        const priceDeps = this.getStepPriceDeps();
        const stepSeqs = this.getItemStepSequence();

        const matchedSteps = priceDeps
            ?.map((dep) => {
                const [itemUid, stepUid] =
                    stepSeqs?.find((s) => s.endsWith(`-${dep}`))?.split("-") ||
                    [];
                return stepUid;
            })
            .filter(Boolean);
        // const componentUid = this.componentUid;
        const componentPricings = this.getComponentPricings(componentUid);
        const form = {
            pricing: componentPricings,
            priceVariants: [] as {
                path: string;
                title: string[];
                current?: boolean;
            }[],
        };

        if (!matchedSteps?.length) {
            form.priceVariants.push({
                // path: `${componentUid}.${componentUid}`,
                path: componentUid,
                title: ["Default Price"],
                current: true,
            });
        } else {
            const ms = matchedSteps.map((stepUid) => {
                const components =
                    this.zus.setting?.stepsByKey?.[stepUid]?.components;
                return components
                    .filter((c) => {
                        const mainStep = this.rootStepFromUid(stepUid);
                        if (mainStep) {
                            const stepSeq = this.getItemStepSequence()?.[0];
                            const rootCUid =
                                this.zus.kvStepForm[stepSeq]?.componentUid;
                            return c.uid == rootCUid;
                        }
                        return true;
                    })
                    .map((c) => ({
                        ...c,
                        stepUid,
                    }))
                    .filter(Boolean);
            });
            const combs = getCombinations(ms);

            const visibleComponents = this.getAllVisibleComponents();
            const visibleComponentsUID = visibleComponents.map((a) => a.uid);
            const filteredCombs = combs.filter((a) => {
                return a.uidStack.every((u) =>
                    visibleComponentsUID.includes(u),
                );
            });
            const kvstepforms = this.zus.kvStepForm;
            form.priceVariants = filteredCombs?.map((fc) => {
                const path = fc.uidStack?.join("-");
                let current = fc.uidStack.every(
                    (u, i) =>
                        kvstepforms[`${this.itemUid}-${fc.stepUidStack[i]}`]
                            ?.componentUid == u,
                );
                if (!form.pricing) form.pricing = {};
                if (!form.pricing[path])
                    form.pricing[path] = {
                        price: "",
                        id: null,
                    };
                return {
                    path,
                    title: fc.titleStack,
                    current,
                };
            });
        }
        return form;
    }
    public toggleStep(itemStepUid = this.itemStepUid) {
        let currentStepUid = this.getItemForm()?.currentStepUid;
        if (currentStepUid == itemStepUid) currentStepUid = null;
        else currentStepUid = itemStepUid;
        this.dotUpdateItemForm("currentStepUid", currentStepUid);
    }

    public resetGroupItem(itemType) {
        const itemForm = this.getItemForm();
        let _itemType = itemForm.groupItem?.itemType;
        if (_itemType != itemType) {
            _itemType = itemType;
            if (_itemType == "Shelf Items") {
                if (!itemForm.shelfItems)
                    itemForm.shelfItems = {
                        lineUids: [],
                        lines: {},
                        subTotal: 0,
                        salesItemId: null,
                    };
                itemForm.groupItem = {
                    itemType: _itemType,
                } as any;
                return;
            }
            const basePrice = "" as any;
            const salesPrice = "" as any;
            const type =
                // _itemType == "Moulding"
                this.isMoulding()
                    ? "MOULDING"
                    : _itemType == "Services"
                      ? "SERVICE"
                      : (_itemType as any) == "Shelf Items"
                        ? "SHELF"
                        : "HPT";
            itemForm.groupItem = {
                pricing: {
                    components: {
                        basePrice,
                        salesPrice,
                    },
                    total: { basePrice, salesPrice },
                },
                itemIds: [],
                itemType,
                type,
                form: {},
                qty: {
                    lh: 0,
                    rh: 0,
                    total: 0,
                },
            };
        }
        this.saveItemForm(itemForm);
        // if(_itemType=='Shelf Items')
    }
}
export class ComponentHelperClass extends StepHelperClass {
    constructor(
        itemStepUid,
        // zus: ZusSales,
        public componentUid,
        public component?: ZusComponent,
    ) {
        super(itemStepUid);
        this.redirectUid = this.getComponent?.redirectUid;
    }
    public redirectUid;

    public get getComponent() {
        if (this.component) return this.component;
        return this.zus.kvStepComponentList[this.stepUid]?.find(
            (c) => c.uid == this.componentUid,
        );
        // this.component = load component
        // return this.component;
    }

    public async fetchUpdatedPrice() {
        const priceData = await getPricingByUidUseCase(this.componentUid);

        Object.entries(priceData).map(([k, d]) =>
            this.zus.dotUpdate(`pricing.${k}`, d),
        );
        this.refreshStepComponentsData();
    }
    public componentIsMoulding() {
        // return this.getStepForm().title == "Moulding";
        // console.log(this.getItemForm().groupItem?.type);
        const t = this.component?.title?.trim();

        return [
            // "door",
            "moulding",
            // "weatherstrip color",
            "door hardware",
        ].includes(t);
    }
    public selectComponent(takeOff = false) {
        let component = this.getComponent;
        // console.log(this.getRouteConfig());
        // const config = this.getRouteConfig(component.uid)
        if (this.isMoulding()) {
            // console.log(this.getStepForm()?.title);
            let groupItem = this.getItemForm()?.groupItem;
            groupItem.type = "MOULDING";
            groupItem.stepUid = component.uid;

            if (!groupItem.form?.[this.componentUid]) {
                groupItem.form[this.componentUid] = {
                    stepProductId: {
                        id: this.component.id,
                    },
                    mouldingProductId: component.productId,
                    selected: true,
                    meta: {
                        description: component?.title,
                        taxxable: false,
                        produceable: false,
                        // noHandle: this.getRouteConfig()?.noHandle,
                    },
                    qty: {
                        rh: "",
                        lh: "",
                        total: 1,
                    },
                    // addon: "",
                    pricing: {
                        addon: "",
                        customPrice: "",
                        unitPrice: sum([
                            groupItem?.pricing?.components?.salesPrice,
                            component.salesPrice,
                        ]),
                        itemPrice: {
                            salesPrice: component.salesPrice,
                            basePrice: component.basePrice,
                        },
                    },
                    swing: "",
                };
            } else {
                groupItem.form[this.componentUid].selected =
                    !groupItem.form?.[this.componentUid].selected;
            }

            groupItem.itemIds = Object.entries(groupItem.form)
                .filter(([uid, data]) => data.selected)
                .map(([uid, data]) => uid);
            console.log(groupItem.itemIds);

            groupItem.qty.total = groupItem.itemIds?.length;

            this.dotUpdateItemForm("groupItem", groupItem);
            this.delistGroupForm();

            this.updateGroupedCost();
            this.calculateTotalPrice();
        } else {
            let stepData = this.getStepForm();
            // stepData.salesOrderItemId;
            if (stepData.title == "Item Type") {
                // if (component.title == "Moulding") {
                //     this.dotUpdateItemForm("groupItem.type", "SERVICE");
                // } else
                if (component.title == "Shelf Items") {
                    const shelfItems = this.getItemForm()?.shelfItems;
                    if (!shelfItems) {
                        const uid = generateRandomString();
                        const puid = generateRandomString();
                        this.dotUpdateItemForm(`shelfItems`, {
                            subTotal: 0,
                            salesItemId: null,
                            lines: {
                                [uid]: {
                                    categoryIds: [],
                                    productUids: [uid],
                                    products: {
                                        [puid]: {} as any,
                                    },
                                },
                            },
                            lineUids: [uid],
                        });
                    }
                } else if (component.title == "Service") {
                    this.dotUpdateItemForm("groupItem.type", "SERVICE");
                }
            }
            stepData = {
                ...stepData,
                flatRate: component._metaData?.custom,
                componentUid: this.componentUid,
                componentId: component.id,
                value: component.title,
                stepId: component.stepId,
                salesPrice: component.salesPrice,
                basePrice: component.basePrice,
                sectionOverride: component.sectionOverride,
            };
            if (stepData.title == "Item Type") {
                this.resetGroupItem(component.title);
            }
            this.saveStepForm(stepData);
            this.dotUpdateItemForm("currentStepUid", null);
            const isRoot = this.componentIsRoot();
            // if (isRoot) {
            //     this.dotUpdateItemForm("routeUid", this.componentUid);
            // }
            if (!takeOff) this.nextStep(isRoot, this.redirectUid);
            this.updateComponentCost();
        }
    }
    public componentIsRoot() {
        const route = this.zus.setting.composedRouter;
        const isRoot = route[this.componentUid] != null;
        return isRoot;
    }
    public getMultiSelectData() {
        return Object.entries(this.getItemForm()?.groupItem?.form || {})
            ?.filter(([uid, data]) => uid?.startsWith(`${this.componentUid}`))
            .map(([uid, data]) => data);
    }
    public multiSelected() {
        return this.getMultiSelectData()?.some((s) => s.selected);
    }
    public async saveComponentRedirect(redirectUid) {
        await saveComponentRedirectUidUseCase(this.component.id, redirectUid);
        toast.success("Saved");
        this.updateStepComponent({
            ...this.component,
            redirectUid,
        });
    }
    public delistGroupForm() {
        let groupItem = this.getItemForm()?.groupItem;
        const components = this.getStepFilteredComponents;
        const delistUids = [];
        groupItem.qty = {
            lh: 0,
            rh: 0,
            total: 0,
        };
        Object.entries(groupItem.form || {}).map(([uid, formData]) => {
            const [itemUid] = uid?.split("-");
            if (
                components.every((s) => s.uid != itemUid) ||
                !formData.selected
            ) {
                delistUids.push(uid);
                delete groupItem?.form?.[uid];
            } else {
                groupItem.qty.lh += Number(formData?.qty?.lh) || 0;
                groupItem.qty.rh += Number(formData?.qty?.rh) || 0;
                groupItem.qty.total += Number(formData?.qty?.total) || 0;
            }
        });
        if (delistUids.length) {
            groupItem.itemIds = groupItem.itemIds?.filter(
                (s) => !delistUids.includes(s),
            );
            this.dotUpdateItemForm("groupItem", groupItem);
            this.updateComponentCost();
        }
    }
}

function getCombinations(
    arr: { title: string; uid: string; stepUid: string }[][],
) {
    // : { titleStack: string[]; uidStack: string[] }[]
    const result: {
        titleStack: string[];
        uidStack: string[];
        stepUidStack: string[];
    }[] = [];

    function backtrack(
        titleStack: string[],
        uidStack: string[],
        stepUidStack: string[],
        index: number,
    ) {
        if (index === arr.length) {
            result.push({
                titleStack: [...titleStack],
                uidStack: [...uidStack],
                stepUidStack: [...stepUidStack],
            });
            return;
        }
        for (const item of arr[index]) {
            titleStack.push(item.title);
            uidStack.push(item.uid);
            stepUidStack.push(item.stepUid);
            backtrack(titleStack, uidStack, stepUidStack, index + 1);
            titleStack.pop();
            uidStack.pop();
            stepUidStack.pop();
        }
    }

    backtrack([], [], [], 0);
    return result;
}

// --- Content from: ai/sales-form/save-sales-class.ts ---
import { prisma, SalesOrders } from "@/db";
import { nextId } from "@/lib/nextId";
import { generateRandomString } from "@/lib/utils";

import { SalesFormFields, SalesType } from "../../../types";
import { resetSalesStatAction } from "../../data-actions/sales-stat-control.action";
import { composeSalesUrl } from "../../utils/sales-utils";
import { SaveSalesHelper } from "./helper-class";
import { ItemHelperClass } from "./item-helper-class";
import { saveShelfHelper } from "./save-shelf-helper";

export interface SaverData {
    tx?;
    error?;
    idStack?: {
        itemIds: number[];
        stepFormIds: number[];
        hptIds: number[];
        salesDoorIds: number[];
    };
    sales?: { id?; data?; updateId? };
    customerId?;
    billingAddressId?;
    shippingAddressId?;
    deleteStacks?: { ids; priority }[];
    orderTxIndex: number;
    orderTxIndexFound?: boolean;
    tax?: {
        id?;
        data?;
        updateId?;
    };
    result?;
    items?: {
        id?;
        data?;
        formValues?: {
            id?;
            data?;
        }[];
        shelfItems?: {
            id?;
            data?;
        }[];
        hpt?: {
            id?;
            data?;
            doors?: {
                id?;
                data?;
            }[];
        };
    }[];
    stacks?: {
        id;
        updateId?;
        data?;
        priority;
    }[];

    reqData?;
}

export type HptData = SaverData["items"][number]["hpt"];
export type ShelfData = SaverData["items"][number]["shelfItems"];
export type SaveQuery = {
    restoreMode: boolean;
    allowRedirect: boolean;
    copy?: boolean;
};
export class SaveSalesClass extends SaveSalesHelper {
    public result() {
        const data = this.data;
        if (data.error) {
            return { data };
        }
        const salesResp = data.result?.[data.orderTxIndex] as SalesOrders;

        const isUpdate = data.sales.data?.id == null;
        const type = this.form.metaData.type;
        const redirectTo =
            (!isUpdate || this.query?.restoreMode) && salesResp
                ? composeSalesUrl({
                      slug: salesResp.slug,
                      type,
                      isDyke: true,
                  })
                : null;

        // setTimeout(() => {
        //     switch (this.form?.saveAction) {
        //         case "close":
        //             redirect(`/sales-book/${type}s`);
        //         case "default":
        //             if (redirectTo && (__redirect || this.query?.restoreMode))
        //                 redirect(redirectTo);
        //         case "new":
        //             redirect(`/sales-book/create-${type}`);
        //     }
        // }, 1000);
        return {
            slug: salesResp?.slug,
            redirectTo,
            data,
            salesType: salesResp?.type as SalesType,
            salesId: salesResp?.id,
            salesNo: salesResp?.orderId,
        };
    }
    public getTable(priority, tx = prisma) {
        if (!priority) priority = 0;
        return [
            tx.salesOrders as any,
            tx.salesOrderItems as any,
            tx.dykeStepForm as any,
            tx.housePackageTools as any,
            tx.dykeSalesDoors as any,
            tx.salesTaxes as any,
            tx.dykeSalesShelfItem as any,
        ][priority - 1];
    }
    public data: SaverData = {
        orderTxIndex: -1,
    };
    constructor(
        public form: SalesFormFields,
        public oldFormState?: SalesFormFields,
        public query?: SaveQuery,
    ) {
        super();
        this.ctx = this;
        this.data = {
            items: [],
            orderTxIndex: -1,
            deleteStacks: [],
            stacks: [],
            reqData: { form, oldFormState },
        };
    }
    public async execute() {
        this.nextIds.itemId = await nextId(prisma.salesOrderItems);
        this.nextIds.hpt = await nextId(prisma.housePackageTools);
        this.nextIds.salesDoor = await nextId(prisma.dykeSalesDoors);
        this.nextIds.formStep = await nextId(prisma.dykeStepForm);
        this.nextIds.salesId = await nextId(prisma.salesOrders);
        this.nextIds.shelfItemId = await nextId(prisma.dykeSalesShelfItem);
        await this.generateSalesForm();
        await this.generateItemsForm();
        this.composeTax();
        await this.saveData();
    }
    public get isRestoreMode() {
        return this.query?.restoreMode;
    }
    public async saveData() {
        this.composeSaveStacks();
        this.getUnusedIds();
        const data = Object.values(this.groupByPriorityAndId());
        this.data.tx = data;
        let salesId = this.form.metaData?.id;
        const txs = [];
        this.data.deleteStacks
            ?.filter((s) => s?.ids?.length)
            .map((s) => {
                const table = this.getTable(s.priority);
                txs.push(
                    table.updateMany({
                        where: {
                            id: { in: s.ids },
                        },
                        data: {
                            deletedAt: new Date(),
                        },
                    }),
                );
                this.data.orderTxIndex++;
            });
        data.map((dt) => {
            const orderTx = dt.priority == 1;

            if (dt.update.length) {
                dt.update
                    .filter((u) => u.data)
                    .map((u) => {
                        const table = this.getTable(dt.priority);
                        if (!this.data.orderTxIndexFound) {
                            this.data.orderTxIndex++;
                            this.data.orderTxIndexFound = orderTx;
                        }

                        txs.push(
                            table?.update({
                                where: {
                                    id: u.id,
                                },
                                data: {
                                    ...u.data,
                                    deletedAt: null,
                                },
                            }),
                        );
                    });
            }
            const createManyData = dt.create.map((d) => d.data).filter(Boolean);
            if (createManyData.length) {
                const table = this.getTable(dt.priority);
                if (!this.data.orderTxIndexFound) {
                    this.data.orderTxIndex++;
                    this.data.orderTxIndexFound = orderTx;
                }
                txs.push(
                    orderTx
                        ? table.create({
                              data: createManyData[0],
                          })
                        : table.createMany({
                              data: createManyData,
                          }),
                );
            }
        });

        try {
            // TODO: REMOVE
            // if (data.filter((d) => d.priority == 2).length > 1) return;
            if (this.form.metaData.debugMode) return;
            const transactions = await prisma.$transaction((async (tx) => {
                return await Promise.all(
                    txs?.map(async (fn) => {
                        const resp = await fn; //();
                        if (resp?.slug && resp?.orderId) {
                            salesId = resp.id;
                        }
                        return resp;
                    }),
                );
            }) as any);
            this.data.result = transactions;
            if (salesId) await resetSalesStatAction(salesId);
        } catch (error) {
            if (error instanceof Error) this.data.error = error.message;
            else this.data.error = "ERROR";
        }
    }

    public composeSaveStacks() {
        this.data.stacks = [];
        const data = this.data;
        this.createStack(data.sales, 1);
        data.items.map((item) => {
            this.createStack(item, 2);
            item.formValues?.map((fv) => {
                this.createStack(fv, 3);
            });
            item.shelfItems?.map((shelfItem) => {
                this.createStack(shelfItem, 7);
            });
            if (item.hpt) {
                this.createStack(item.hpt, 4);
                item.hpt.doors?.map((door) => {
                    this.createStack(door, 5);
                });
            }
        });
        this.createStack(data.tax, 6);
    }
    public get salesId() {
        return this.data.sales?.id || this.data.sales?.updateId;
    }
    public async generateSalesForm() {
        const md = this.ctx.form.metaData;
        this.ctx.data.billingAddressId = md.billing.id;
        this.ctx.data.shippingAddressId = md?.shipping.id;
        this.ctx.data.customerId = md?.customer.id;
        const saveData = await this.composeSalesForm(this.form);
        this.data.sales = saveData;
    }
    public nextIds = {
        itemId: null,
        hpt: null,
        salesDoor: null,
        formStep: null,
        salesId: null,
        shelfItemId: null,
    };
    public async generateItemsForm() {
        this.form.sequence.formItem.map((itemId) => {
            const formItem = this.form.kvFormItem[itemId];
            // formItem.uid

            if (formItem.shelfItems) {
                saveShelfHelper({
                    ctx: this,
                    formItem,
                    itemId,
                });
                return;
            } else {
                if (!formItem?.groupItem?.groupUid)
                    formItem.groupItem.groupUid = generateRandomString(4);
            }
            const formEntries = Object.entries(
                formItem.groupItem.form || {},
            ).filter(([k, v]) => v.selected);

            const primaryForm = formEntries.find(
                ([k, v], i) => v.primaryGroupItem,
            );
            if (!primaryForm && formEntries.length) {
                formEntries[0][1].primaryGroupItem = true;
            }
            formEntries.map(([groupItemFormId, groupItemForm], index) => {
                const itemCtx = new ItemHelperClass(this, itemId);

                if (groupItemFormId?.split("-")?.length > 2) {
                    if (index == 0) {
                        itemCtx.generateDoorsItem();
                    }
                } else {
                    itemCtx.generateNonDoorItem(
                        groupItemForm,
                        groupItemForm.primaryGroupItem,
                    );
                }
            });
        });
    }
}

// --- Content from: ai/sales-form/item-class.ts ---
import { SettingsClass } from "./settings-class";

export class ItemClass extends SettingsClass {
    constructor(public itemUid) {
        super(null, itemUid);
    }
    public get itemIndex() {
        return this.zus.sequence.formItem.indexOf(this.itemUid);
    }
    public get formItem() {
        return this.zus.kvFormItem?.[this.itemUid];
    }
    public deleteItem() {
        this.zus.removeItem(this.itemUid, this.itemIndex);
        const newState = {};
        Object.entries(this.zus.kvFormItem)
            .filter(([a, b]) => a != this.itemUid)
            .map(([a, b]) => (newState[a] = b));
        this.zus.dotUpdate("kvFormItem", newState);
        this.calculateTotalPrice();
    }
}

// --- Content from: ai/sales-form/form-data-store.ts ---
import { create } from "zustand";

import { SalesFormZusData } from "../../../../types";
import { FieldPath } from "react-hook-form";
import { dotObject } from "@/app/(clean-code)/_common/utils/utils";
import { deepCopy } from "@/lib/deep-copy";
import { StepComponentData } from "@api/db/queries/sales-form";
export type ZusSales = SalesFormZusData & SalesFormZusAction;
export type ZusComponent = StepComponentData;
export type ZusStepFormData = ZusSales["kvStepForm"][number];
export type ZusItemFormData = ZusSales["kvFormItem"][number];
export type ZusGroupItem = ZusItemFormData["groupItem"];
export type ZusGroupItemForm = ZusItemFormData["groupItem"]["form"];
export type ZusGroupItemFormPath = ZusGroupItemForm[string];
type SalesFormZusAction = ReturnType<typeof fns>;
export type SalesFormSet = (
    update: (state: SalesFormZusData) => Partial<SalesFormZusData>,
) => void;
function fns(set: SalesFormSet) {
    return {
        initOldFormState: (data) =>
            set((state) => {
                return {
                    ...state,
                    oldFormState: deepCopy({
                        kvFormItem: data.kvFormItem,
                        kvStepForm: data.kvStepForm,
                        metaData: data.metaData,
                    }) as any,
                };
            }),
        init: (data) =>
            set((state) => {
                let newData = {
                    ...state,
                    ...data,
                    oldFormState: deepCopy({
                        kvFormItem: data.kvFormItem,
                        kvStepForm: data.kvStepForm,
                        metaData: data.metaData,
                        sequence: data.sequence,
                    }),
                };

                return newData;
            }),
        newStep: (itemUid, stepUid) =>
            set((state) => {
                const newState = { ...state };
                newState.sequence.stepComponent[itemUid].push(stepUid);
                return newState;
            }),
        toggleItem: (itemUid) =>
            set((state) => {
                const newState = { ...state };
                newState.kvFormItem[itemUid].collapsed =
                    !newState.kvFormItem[itemUid].collapsed;
                return newState;
            }),

        removeKey: <K extends FieldPath<SalesFormZusData>>(k: K) =>
            set((state) => {
                const newState = {
                    ...state,
                };
                dotObject.remove(k, newState);
                return newState;
            }),
        dotUpdate: <K extends FieldPath<SalesFormZusData>>(
            k: K,
            stepSq, //: FieldPathValue<SalesFormZusData, K>
        ) =>
            set((state) => {
                const newState = {
                    ...state,
                };
                dotObject.set(k, stepSq, newState);
                return newState;
            }),

        update: (k: keyof SalesFormZusData, value) =>
            set((state) => {
                const newState: any = { ...state };
                newState[k] = value;

                return newState;
            }),
        updateFormItem: (
            uid,
            k: keyof SalesFormZusData["kvFormItem"][number],
            value,
        ) =>
            set((state) => {
                const newState = { ...state };
                (newState.kvFormItem[uid] as any)[k] = value as any;
                return newState;
            }),
        removeItem: (uid, index) =>
            set((state) => {
                const newState = { ...state };
                newState.sequence.formItem.splice(index, 1);
                return newState;
            }),
    };
}
export const useFormDataStore = create<ZusSales>(
    (set) =>
        ({
            ...fns(set),
        }) as any,
);
export const getFormState = () => useFormDataStore.getState();

// --- Content from: ai/sales-form/index.dta.ts ---
import { SalesFormFields } from "../../../types";
import { SaveQuery, SaveSalesClass } from "./save-sales-class";

export async function saveSalesFormDta(
    form: SalesFormFields,
    oldFormState?: SalesFormFields,
    query?: SaveQuery,
) {
    const worker = new SaveSalesClass(form, oldFormState, query);
    await worker.execute();
    return worker.result();
}

// --- Content from: ai/sales-form/hpt-door.tsx ---
import { ComponentImg } from "@/components/forms/sales-form/component-img";
import { openDoorSwapModal } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-swap-modal";
import Button from "@/components/common/button";
import { HptContext, useHpt } from "@/components/forms/sales-form/context";

interface DoorProps {
    door: HptContext["doors"][number];
}
export function Door({ door }: DoorProps) {
    const ctx = useHpt();

    return (
        <div className="flex gap-4s flex-col h-full items-end">
            <div className="">
                <Button
                    size="xs"
                    onClick={() => {
                        openDoorSwapModal(door, ctx.hpt.itemUid);
                    }}
                >
                    Change Door
                </Button>
            </div>
            <div className="w-2/3">
                <ComponentImg noHover aspectRatio={0.7} src={door.img} />
            </div>
        </div>
    );
}

// --- Content from: ai/sales-form/form-client.tsx ---
"use client";

import { useEffect } from "react";
import { SalesFormClient } from "@/components/forms/sales-form/sales-form";

import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { zhInitializeState } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/zus-form-helper";

export function FormClient({ data }) {
    const zus = useFormDataStore();
    useEffect(() => {
        zus.init(zhInitializeState(data));
    }, []);
    return <SalesFormClient data={data} />;
}

// --- Content from: ai/sales-form/sales-labor-cost.ts ---
"use server";

import { prisma } from "@/db";
import dayjs from "dayjs";
import { SiteEvent } from "./site-event-class";
import { revalidateTag, unstable_cache } from "next/cache";
import { actionClient } from "./safe-action";
import z from "zod";
import { saveSalesLaborCostSchema } from "./schema";

export async function getSalesLaborCost() {
    const tags = ["sales-labor-cost"];
    const fn = async () => {
        const cost = await prisma.salesLaborCosts.findFirst({
            where: {
                current: true,
            },
        });
        return cost;
    };
    // return await fn();
    return unstable_cache(fn, tags, {
        tags,
    })();
}

export async function updateSalesLaborCost(rate) {
    let cost = await getSalesLaborCost();
    if (cost && dayjs().diff(cost.createdAt, "days") > 30) {
        await prisma.salesLaborCosts.updateMany({
            data: {
                current: false,
            },
        });
        cost = null;
    }
    if (cost) {
        cost = await prisma.salesLaborCosts.update({
            where: {
                id: cost.id,
            },
            data: {
                rate,
            },
        });
        const ev = new SiteEvent();
        await ev.event("edited").type("sales-labor-cost").create();
    } else {
        cost = await prisma.salesLaborCosts.create({
            data: {
                rate,
                current: true,
            },
        });
        const ev = new SiteEvent();
        await ev.event("created").type("sales-labor-cost").create();
    }
    revalidateTag("sales-labor-cost");
    return cost;
}

export const saveSalesLaborCost = actionClient
    .schema(saveSalesLaborCostSchema)
    .metadata({
        name: "save-sales-labor-cost",
        track: {
            event: "sales-labor-cost",
            type: "save",
        },
    })
    .action(async ({ parsedInput: { rate } }) => {
        const r = await updateSalesLaborCost(rate);
        return { success: true, rate, id: r.id };
    });

// --- Content from: ai/sales-form/molding-step-ctx.tsx ---
import { createContext, useContext, useEffect, useMemo } from "react";
import { useFormDataStore } from "../../_common/_stores/form-data-store";

import { MouldingClass } from "../../_utils/helpers/zus/moulding-class";
export const Context = createContext<ReturnType<typeof useCreateContext>>(
    null as any,
);
export const useCtx = () => useContext(Context);

export const useCreateContext = (itemStepUid) => {
    const zus = useFormDataStore();
    const ctx = useMemo(() => {
        const ctx = new MouldingClass(itemStepUid);

        const itemForm = ctx.getItemForm();
        return {
            zus,
            ctx,
            itemForm,
            ...ctx.getMouldingLineItemForm(),
        };
    }, [
        itemStepUid,
        zus,
        // itemStepUid, zus
    ]);
    return {
        ...ctx,
    };
};

// --- Content from: ai/sales-form/sales-book-form-use-case.ts ---
"use server";

import { AsyncFnType } from "@/app/(clean-code)/type";

import { SalesFormFields, SalesType } from "../../types";
import { deleteSalesByOrderId } from "../data-access/sales-dta";
import {
    createSalesBookFormDataDta,
    GetSalesBookFormDataProps,
    getTransformedSalesBookFormDataDta,
} from "../data-access/sales-form-dta";
import {
    loadSalesFormData,
    saveSalesSettingData,
} from "../../../../../actions/sales-settings";
import { getPricingListDta } from "../data-access/sales-pricing-dta";

import { saveSalesFormDta } from "../data-access/save-sales/index.dta";
import { SaveQuery } from "../data-access/save-sales/save-sales-class";
import { composeSalesPricing } from "../utils/sales-pricing-utils";
import { composeStepRouting } from "../utils/sales-step-utils";
import { getSalesLaborCost } from "@/actions/sales-labor-cost";
import { copySales } from "@sales/copy-sales";
import { authUser } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { createNoteAction } from "@/modules/notes/actions/create-note-action";
import { consoleLog } from "@gnd/utils";
export type GetSalesBookForm = AsyncFnType<typeof getSalesBookFormUseCase>;
export async function getSalesBookFormUseCase(data: GetSalesBookFormDataProps) {
    const result = await getTransformedSalesBookFormDataDta(data);
    return await composeBookForm(result);
}
async function composeBookForm<T>(data: T) {
    const laborConfig = await getSalesLaborCost();

    return {
        ...data,
        salesSetting: composeStepRouting(await loadSalesFormData()),
        pricing: composeSalesPricing(await getPricingListDta()),
        laborConfig,
    };
}
export async function createSalesBookFormUseCase(
    data: GetSalesBookFormDataProps
) {
    const resp = await createSalesBookFormDataDta(data);
    return await composeBookForm(resp);
}
export async function saveSalesSettingUseCase(meta) {
    await saveSalesSettingData(meta);
}

export async function saveFormUseCase(
    data: SalesFormFields,
    oldFormState?: SalesFormFields,
    query?: SaveQuery
    // allowRedirect = true
) {
    if (!oldFormState)
        oldFormState = {
            kvFormItem: {},
            kvStepForm: {},
            sequence: {
                formItem: [],
                multiComponent: {},
                stepComponent: {},
            },
            metaData: {} as any,
        };

    return await saveSalesFormDta(data, oldFormState, query);
}
export async function moveOrderUseCase(orderId, to: SalesType) {
    const resp = await copySalesUseCase(
        orderId,
        to,
        to == "order" ? "quote" : "order"
    );
    if (!resp?.error) await deleteSalesByOrderId(orderId);
    return resp;
}
export async function copySalesUseCase(orderId, as: any, type: any) {
    const resp2 = await copySales({
        db: prisma,
        as,
        salesUid: orderId,
        author: await authUser(),
        type,
    });
    await createNoteAction({
        note: `Copied from ${orderId}`,
        headline: "Copy Action",
        type: "general",
        tags: [
            {
                tagName: "salesId",
                tagValue: String(resp2?.id),
            },
            {
                tagName: "type",
                tagValue: "general",
            },
            {
                tagName: "status",
                tagValue: "public",
            },
        ],
    });
    const link = resp2?.isDyke ? `/sales-book/edit-${as}/${resp2.slug}` : ``;

    return {
        error: resp2?.error,
        link,
        id: resp2.id,
        slug: resp2.slug,
        data: resp2,
    };
}

// --- Content from: ai/sales-form/settings-class.ts ---
import { dotObject } from "@/app/(clean-code)/_common/utils/utils";
import { formatMoney, toFixed } from "@/lib/use-number";
import { FieldPath, FieldPathValue } from "react-hook-form";

import {
    useFormDataStore,
    ZusItemFormData,
    ZusSales,
} from "../../../_common/_stores/form-data-store";
import { CostingClass } from "./costing-class";

export class SettingsClass extends CostingClass {
    constructor(
        public itemStepUid?,
        // public zus: ZusSales,
        public itemUid?,
        public stepUid?,
        public staticZus?: ZusSales,
    ) {
        super();
        this.setting = this;
    }

    public salesProfiles() {
        const profiles = this.dotGet("profiles");
        return profiles.map(({ id, coefficient, defaultProfile, title }) => ({
            id,
            coefficient,
            defaultProfile,
            title,
        }));
    }
    public getItemType() {
        return Object.entries(this.zus.kvStepForm)?.find(
            ([uid, data]) =>
                uid?.startsWith(this.itemUid) && data.title == "Item Type",
        )?.[1]?.value as any;
    }
    public currentProfile() {
        return this.salesProfiles().find(
            (profile) => profile.id == this.dotGet("metaData.salesProfileId"),
        );
    }
    public dotGet<K extends FieldPath<ZusSales>>(
        path: K,
    ): FieldPathValue<ZusSales, K> {
        return dotObject.pick(path, this.zus);
    }

    public get zus(): ZusSales {
        return this.staticZus || useFormDataStore.getState();
    }
    public getRootUid() {
        const rootStepUid = this.zus.sequence.stepComponent[this.itemUid]?.[0];
        return this.zus.kvStepForm[rootStepUid]?.componentUid;
    }
    public composeNextRoute(
        itemForm: ZusItemFormData,
        redirectUid,
        isRoot,
        stepUid,
    ) {
        const route = this.zus.setting.composedRouter;
        const rootUid = this.getRootUid();
        itemForm.routeUid;

        const nextRouteUid =
            redirectUid || route[rootUid]?.route?.[isRoot ? rootUid : stepUid];
        const nextRoute = this.zus.setting.stepsByKey[nextRouteUid];
        const nextStepUid = `${this.itemUid}-${nextRoute?.uid}`;

        return {
            nextRoute,
            nextStepUid,
            nextStepForm: this.zus.kvStepForm[nextStepUid],
        };
    }
    public getNextRouteFromSettings(
        itemForm: ZusItemFormData,
        isRoot,
        redirectUid,
    ) {
        const routeData = this.composeNextRoute(
            itemForm,
            redirectUid,
            isRoot,
            this.stepUid,
        );

        if (!routeData.nextRoute) {
            const stepSequences =
                this.zus.sequence.stepComponent?.[this.itemUid];
            const stepIndex = stepSequences?.indexOf(this.itemStepUid);
            for (let i = stepIndex - 1; i > 0; i--) {
                const [_itemUid, _stepUid] = stepSequences[i]?.split("-");

                const nx = this.composeNextRoute(
                    itemForm,
                    null,
                    false,
                    _stepUid,
                );
                const exists = stepSequences.includes(nx?.nextStepUid);
                if (!exists && nx?.nextRoute) return nx;
            }
        }
        return routeData;
    }
    public getRedirectableRoutes() {
        const settings = this.zus.setting;
        const stepSequence = this.zus.sequence.stepComponent[this.itemUid]?.map(
            (s) => s.split("-")[1],
        );

        const steps = settings.steps
            ?.filter((r) => {
                return true;
            })
            .map((step) => ({
                title: step.title,
                uid: step.uid,
            }));

        return steps;
    }
    public getRouteOverrideConfig(itemUid = this.itemUid) {
        const override = Object.entries(this.zus.kvStepForm)
            ?.filter(([k, v]) => k.startsWith(itemUid))
            ?.map(([k, v]) => v?.sectionOverride)
            .filter((s) => s?.overrideMode)?.[0];
        return override;
    }
    public getRouteConfig(itemUid = this.itemUid) {
        const route = this.zus.setting.composedRouter;
        const fItem = this.zus.sequence?.stepComponent?.[itemUid];
        const componentUid = this.zus.kvStepForm[fItem?.[0]]?.componentUid;

        const config = route[componentUid]?.config || {};

        let _baseConfig = config || {};
        let componentOverride = this.getRouteOverrideConfig();
        // if (componentOverride)
        return {
            ..._baseConfig,
            ...(componentOverride || {}),
        };
    }
    public updateComponentRedirectUid(componentUid, redirectUid) {
        const stepsByKey = this.zus.setting.stepsByKey[this.stepUid];
        stepsByKey.components = stepsByKey.components.map((data) => {
            if (data.uid == componentUid) data.redirectUid = redirectUid;
            return data;
        });
        this.zus.dotUpdate(`setting.stepsByKey.${this.stepUid}`, stepsByKey);
    }
    public getComponentFromSettingsByStepId(stepId, uid) {
        const c = Object.entries(this.zus.setting.stepsByKey)
            .find(([stepUid, data]) => data.id == stepId)?.[1]
            ?.components?.find((c) => c.uid == uid);
        if (!c) {
            const back = Object.values(this.zus.setting.stepsByKey)
                .map((s) => s.components)
                .flat()
                .find((s) => s.uid == uid);
            return back;
        }
        return c;
    }
}

// --- Content from: ai/sales-form/sales-pricing-dta.ts ---
import { AsyncFnType } from "@/app/(clean-code)/type";
import { prisma, Prisma } from "@/db";

import { DykeProductMeta } from "../../types";

export type GetPricingList = AsyncFnType<typeof getPricingListDta>;
export async function getPricingListDta(
    where: Prisma.DykePricingSystemWhereInput = {},
) {
    const pricings = await prisma.dykePricingSystem.findMany({
        where,
        select: {
            id: true,
            dependenciesUid: true,
            price: true,
            stepProductUid: true,
        },
    });
    return pricings;
}
export async function getComponentPricingListByUidDta(stepProductUid) {
    return await getPricingListDta({
        stepProductUid,
    });
}
export async function updateComponentPricingsDta(
    data: Partial<Prisma.DykePricingSystemCreateManyInput>[],
) {
    const updateByPrice: { [price in string]: number[] } = {};
    const deleteIds = [];
    data.map((p) => {
        const k = p.price;
        if (!k) deleteIds.push(p.id);
        if (updateByPrice[k]) updateByPrice[k].push(p.id);
        else updateByPrice[k] = [p.id];
    });
    await Promise.all(
        Object.entries(updateByPrice).map(async ([price, ids]) => {
            await prisma.dykePricingSystem.updateMany({
                where: { id: { in: ids } },
                data: {
                    price: price == "del" ? null : Number(price),
                },
            });
        }),
    );
    if (deleteIds.length)
        await prisma.dykePricingSystem.updateMany({
            where: { id: { in: deleteIds } },
            data: {
                deletedAt: new Date(),
            },
        });
}
export async function saveComponentPricingsDta(
    data: Prisma.DykePricingSystemCreateManyInput[],
) {
    const newData = data
        .filter((a) => !a.id && a.price)
        .map(({ id, ...rest }) => rest);

    if (newData.length) {
        const resp = await prisma.dykePricingSystem.createMany({
            data: newData,
        });
    }
    await updateComponentPricingsDta(data.filter((d) => d.id));
    return {
        status: "success",
    };
}
export async function saveHarvestedDta(ls) {
    return await prisma.dykePricingSystem.createMany({
        data: ls,
    });
}
export async function harvestSalesPricingDta() {
    const steps = await prisma.dykeStepProducts.findMany({
        where: {
            door: {
                deletedAt: null,
            },
        },
        select: {
            uid: true,
            dykeStepId: true,
            door: {
                select: {
                    meta: true,
                },
            },
        },
    });
    const res = steps
        .map((s) => {
            return {
                uid: s.uid,
                stepId: s.dykeStepId,
                doorPrice: (s?.door?.meta as any as DykeProductMeta)?.doorPrice,
            };
        })
        .filter((s) => s.doorPrice);
    const inserts: Prisma.DykePricingSystemCreateManyInput[] = [];
    res.map((r) => {
        Object.entries(r.doorPrice).map(([dependenciesUid, price]) => {
            if (price)
                inserts.push({
                    price,
                    dependenciesUid,
                    dykeStepId: r.stepId,
                    stepProductUid: r.uid,
                });
        });
    });
    return inserts;
}

// --- Content from: ai/sales-form/service-index.tsx ---
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import Money from "@/components/_v1/money";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { AnimatedNumber } from "@/components/animated-number";
import { cn } from "@/lib/utils";

import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@gnd/ui/table";

import { LineInput, LineSwitch } from "../line-input";
import { Context, useCreateContext, useCtx } from "./service-ctx";

interface Props {
  itemStepUid;
}
export default function ServiceLineItem({ itemStepUid }: Props) {
  const ctx = useCreateContext(itemStepUid);

  return (
    <>
      <Context.Provider value={ctx}>
        {ctx.ctx.getItemForm().title || "-"}
        <Table className="table-fixed p-4 text-xs font-medium">
          <TableHeader>
            <TableRow className="uppercase">
              <TableHead className="w-10">Sn.</TableHead>
              <TableHead className="w-full">Description</TableHead>
              <TableHead className="w-16">Tax</TableHead>
              <TableHead className="w-16">
                <TextWithTooltip
                  text={"Production"}
                  className="w-16"
                ></TextWithTooltip>
              </TableHead>
              <TableHead className="w-28">Qty</TableHead>
              <TableHead className="w-28">Unit Price</TableHead>

              <TableHead className="w-28">Line Total</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ctx.itemIds?.map((m, index) => (
              <ServiceRow sn={index + 1} lineUid={m} key={m} />
            ))}
          </TableBody>
          <TableFooter className="bg-accent">
            <TableRow>
              <TableCell>
                <Button
                  onClick={() => {
                    ctx.ctx.addServiceLine();
                  }}
                >
                  <Icons.add className="mr-2 size-4" />
                  <span>Line</span>
                </Button>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Context.Provider>
    </>
  );
}
function ServiceRow({ lineUid, sn }: { sn; lineUid }) {
  const ctx = useCtx();
  const mfd = ctx.itemForm?.groupItem?.form?.[lineUid];
  const valueChanged = () => {
    ctx.ctx.updateGroupedCost();
    ctx.ctx.calculateTotalPrice();
  };
  return (
    <>
      <TableRow className={cn(!mfd?.selected && "hidden")}>
        <TableCell className="font-mono$">{sn}.</TableCell>
        <TableCell className="font-mono$ text-sm font-medium">
          <LineInput cls={ctx.ctx} name="meta.description" lineUid={lineUid} />
        </TableCell>
        <TableCell>
          <LineSwitch
            cls={ctx.ctx}
            name="meta.taxxable"
            lineUid={lineUid}
            valueChanged={valueChanged}
          />
        </TableCell>
        <TableCell>
          <LineSwitch cls={ctx.ctx} name="meta.produceable" lineUid={lineUid} />
        </TableCell>
        <TableCell>
          <LineInput
            cls={ctx.ctx}
            name="qty.total"
            lineUid={lineUid}
            type="number"
            valueChanged={valueChanged}
            mask
            qtyInputProps={{
              min: 1,
            }}
          />
        </TableCell>
        <TableCell>
          <LineInput
            cls={ctx.ctx}
            name="pricing.customPrice"
            lineUid={lineUid}
            type="number"
            valueChanged={valueChanged}
          />
          {/* <Input
                        type="number"
                        defaultValue={mfd?.addon}
                        onChange={(e) => {
                            ctx.ctx.dotUpdateGroupItemFormPath(
                                lineUid,
                                "pricing.addon",
                                +e.target.value
                            );
                            valueChanged();
                        }}
                    /> */}
        </TableCell>
        <TableCell>
          <AnimatedNumber value={mfd?.pricing?.totalPrice || 0} />
          {/* <Money value={mfd?.pricing?.totalPrice} /> */}
        </TableCell>
        <TableCell align="right">
          <ConfirmBtn
            onClick={() => {
              ctx.ctx.removeGroupItem(lineUid);
            }}
            trash
            disabled={ctx.ctx.selectCount == 1}
            size="icon"
          />
        </TableCell>
      </TableRow>
    </>
  );
}

// --- Content from: ai/sales-form/sales-step-utils.ts ---
import {
    DykeDoorType,
    DykeStepTitleKv,
    DykeStepTitles,
    StepMeta,
} from "../../types";
import { transformSalesStepMeta } from "../data-access/dto/sales-step-dto";
import { LoadSalesFormData } from "../../../../../actions/sales-settings";

export function composeStepRouting(fdata: LoadSalesFormData) {
    const sectionKeys = Object.keys(fdata.setting?.data?.route || [])?.map(
        (uid) => ({ uid }),
    );
    const stepsByKey: {
        [uid in string]: {
            id;
            title;
            uid;

            meta: StepMeta;
            components: {
                uid: string;
                id: number;
                title: string;
                redirectUid: string;
                img: string;
            }[];
        };
    } = {};
    // fdata.rootStep
    const rootComponentsByKey: {
        [uid in string]: { id?; title; uid; stepUid? };
    } = {};
    fdata.rootStep.stepProducts.map((s) => {
        rootComponentsByKey[s.uid] = {
            uid: s.uid,
            title: s.product?.title,
            stepUid: fdata.rootStep.uid,
        };
    });
    [...fdata.steps, fdata.rootStep].map((step) => {
        const { stepProducts, id, title, uid, ...rest } = step;
        stepsByKey[step.uid] = {
            meta: transformSalesStepMeta(rest)?.meta,
            id,
            title,
            uid,
            components: stepProducts?.map((p) => ({
                title: p?.name || p.product?.title || p.door?.title,
                uid: p.uid,
                id: p.id,
                variations: p.meta?.variations || [],
                redirectUid: p.redirectUid,
                img: p.product?.img || p.door?.img,
            })),
        };
    });
    const composedRouter = { ...(fdata.setting?.data?.route || {}) };
    Object.keys(composedRouter).map((routeKey) => {
        composedRouter[routeKey].route = {};

        let crk = routeKey;
        composedRouter[routeKey].routeSequence?.map((s) => {
            composedRouter[routeKey].route[crk] = s.uid;
            crk = s.uid;
        });
    });
    return {
        ...fdata,
        composedRouter,
        sectionKeys,
        stepsByKey,
        rootComponentsByKey,
        newStepTitle: "",
    };
}
const hiddenDisplaySteps = [
    "Door",
    "Item Type",
    "Moulding",
    "House Package Tool",
    "Height",
    "Hand",
    "Width",
];
export const composeStepFormDisplay = (
    stepForms: any[],
    sectionTitle = null,
) => {
    const configs = stepForms
        ?.map((stepForm) => {
            let color = null;
            let label = stepForm?.step?.title?.toLowerCase();
            let value = stepForm?.value?.toLowerCase();
            let hidden =
                hiddenDisplaySteps
                    ?.map((a) => a.toLowerCase())
                    .includes(value) || !value;
            if (label == "item type" && !sectionTitle) sectionTitle = value;
            let red = [
                label == "hinge finish" && !value?.startsWith("us15"),
                label?.includes("jamb") && !value?.startsWith("4-5/8"),
            ];
            if (red.some(Boolean)) color = "red";
            return {
                color,
                label,
                value,
                hidden,
            };
        })
        .filter((a) => !a.hidden);
    return {
        configs,
        sectionTitle,
    };
};

// --- Content from: ai/sales-form/molding-step-index.tsx ---
import ConfirmBtn from "@/components/_v1/confirm-btn";
import Money from "@/components/_v1/money";
import { DataLine } from "@/components/(clean-code)/data-table/Dl";
import { Menu } from "@/components/(clean-code)/menu";
import { MoneyBadge } from "@/components/(clean-code)/money-badge";
import { AnimatedNumber } from "@/components/animated-number";
import { cn } from "@/lib/utils";

import { Label } from "@gnd/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@gnd/ui/table";

import { MouldingClass } from "../../_utils/helpers/zus/moulding-class";
import { LineInput } from "../line-input";
import { Context, useCreateContext, useCtx } from "./molding-step-ctx";
import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@gnd/ui/tanstack";
import { Skeletons } from "@gnd/ui/custom/skeletons";

interface Props {
  itemStepUid;
}
export default function MouldingLineItem({ itemStepUid }: Props) {
  const ctx = useCreateContext(itemStepUid);
  // const uids = ctx.ctx.getSelectionComponentUids();
  // console.log(uids);
  // const { data: lines, isPending } = useQuery(
  //     _trpc.sales.getMultiLineComponents.queryOptions({
  //         uids,
  //     }),
  // );
  // if (isPending) return <Skeletons.Table />;
  // console.log(lines);
  return (
    <>
      <Context.Provider value={ctx}>
        <Table className="table-fixed p-4 text-xs font-medium">
          <TableHeader>
            <TableRow className="uppercase">
              <TableHead className="w-10">Sn.</TableHead>
              <TableHead className="w-full">
                {ctx?.ctx?.getItemType()}
              </TableHead>
              <TableHead className="w-28">Qty</TableHead>
              <TableHead className="w-28">Estimate</TableHead>
              <TableHead className="w-28">Addon/Qty</TableHead>
              <TableHead className="w-28">Line Total</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ctx.mouldings?.map((m, index) => (
              <MouldingRow sn={index + 1} data={m} key={m.uid} />
            ))}
          </TableBody>
        </Table>
      </Context.Provider>
    </>
  );
}
function MouldingRow({
  data,
  sn,
}: {
  sn;
  data: ReturnType<
    MouldingClass["getMouldingLineItemForm"]
  >["mouldings"][number];
}) {
  const ctx = useCtx();
  const mfd = ctx.itemForm?.groupItem?.form?.[data.uid];

  const lineUid = data.uid;

  const valueChanged = () => {
    ctx.ctx.updateGroupedCost();
    ctx.ctx.calculateTotalPrice();
  };
  return (
    <TableRow className={cn(!mfd?.selected && "hidden")}>
      <TableCell className="font-mono$">{sn}.</TableCell>
      <TableCell className="font-mono$ text-sm font-medium">
        {data.title}
      </TableCell>
      <TableCell>
        <LineInput
          cls={ctx.ctx}
          name="qty.total"
          lineUid={lineUid}
          type="number"
          valueChanged={valueChanged}
          mask
          qtyInputProps={{
            min: 0,
          }}
        />
      </TableCell>
      <TableCell className="">
        <Menu
          noSize
          Icon={null}
          label={<Money value={mfd?.pricing?.unitPrice} />}
        >
          <div className="min-w-[300px] p-2">
            <div>
              <Label>Price Summary</Label>
            </div>
            <dl>
              {ctx.pricedSteps?.map((step) => (
                <DataLine
                  size="sm"
                  key={step.title}
                  label={step.title}
                  value={
                    <div className="flex items-center justify-end gap-4">
                      <span>{step.value}</span>
                      <MoneyBadge>{step.price}</MoneyBadge>
                    </div>
                  }
                />
              ))}
              <DataLine
                size="sm"
                label="Moulding"
                value={
                  <div className="flex items-center justify-end gap-4">
                    <span className="line-clamp-2 max-w-xs">{`${data.title}`}</span>
                    <MoneyBadge>{data.basePrice?.price}</MoneyBadge>
                  </div>
                }
              />
              <DataLine
                size="sm"
                label="Custom Price"
                value={
                  <LineInput
                    className="w-28"
                    cls={ctx.ctx}
                    name="pricing.customPrice"
                    lineUid={lineUid}
                    type="number"
                    allowZero
                    valueChanged={valueChanged}
                  />
                }
              />
            </dl>
          </div>
        </Menu>
      </TableCell>
      <TableCell>
        <LineInput
          cls={ctx.ctx}
          name="pricing.addon"
          lineUid={lineUid}
          type="number"
          valueChanged={valueChanged}
        />
        {/* <FormInput
                        type="number"
                        size="sm"
                        control={form.control}
                        name="pricing.addon"
                        inputProps={inputProps}
                    /> */}
      </TableCell>
      <TableCell>
        <AnimatedNumber value={mfd?.pricing?.totalPrice || 0} />
        {/* <Money value={mfd?.pricing?.totalPrice} /> */}
      </TableCell>
      <TableCell align="right">
        <ConfirmBtn
          disabled={ctx.ctx.selectCount == 1}
          onClick={() => {
            ctx.ctx.removeGroupItem(data.uid);
          }}
          trash
          size="icon"
        />
      </TableCell>
    </TableRow>
  );
}

// --- Content from: ai/sales-form/item-helper-class.ts ---
import { Prisma } from "@/db";

import {
    DykeFormStepMeta,
    DykeSalesDoorMeta,
    HousePackageToolMeta,
    SalesFormFields,
    SalesItemMeta,
    ShelfItemMeta,
} from "../../../types";
import {
    HptData,
    SaverData,
    SaveSalesClass,
    ShelfData,
} from "./save-sales-class";

export class ItemHelperClass {
    constructor(
        public ctx: SaveSalesClass,
        public formItemId,
    ) {}
    public itemData: SaverData["items"][number];
    public formItem(old = false) {
        const fitem = this.workspace(old)?.kvFormItem[this.formItemId];

        return fitem;
    }

    public workspace(old = false) {
        return old ? this.ctx.oldFormState : this.ctx.form;
    }
    public getLineIndex(old = false) {
        return (
            this.workspace(old).sequence?.formItem?.indexOf(this.formItemId) + 1
        );
    }
    public groupItemForm(old = false) {
        return this.formItem(old)?.groupItem?.form;
    }
    public formSteps(old = false) {
        const ws = this.workspace(old);
        const stepSequence = ws.sequence?.stepComponent?.[this.formItemId];

        return stepSequence?.map((s) => ws.kvStepForm[s]);
    }
    public generateDoorsItem() {
        const formItem = this.formItem();
        const lineIndex = this.getLineIndex();
        const form = this.groupItemForm();
        const formList = Object.values(form);

        // const salesItemId = formList?.find((s) => s.meta?.salesItemId)?.meta
        // ?.salesItemId;
        const salesItemId = formItem?.id;

        const meta = {
            doorType: formItem.groupItem.itemType,
            lineIndex,
        } satisfies SalesItemMeta;

        const updateData = {
            meta,
            dykeDescription: formItem?.title,
            qty: null,
        } satisfies Prisma.SalesOrderItemsUpdateInput;
        if (!salesItemId) {
            const { ...rest } = updateData;
            const createData = {
                ...rest,
                salesOrderId: this.ctx.salesId,
                id: this.ctx.nextId("itemId"),
            } satisfies Prisma.SalesOrderItemsCreateManyInput;
            this.itemData = {
                data: createData,
                id: createData.id,
                formValues: [],
            };
        } else {
            this.itemData = {
                id: salesItemId,
                formValues: [],
                data: {
                    ...updateData,
                },
            };
        }
        this.generateItemFormSteps();

        const itemHtp: HptData = {
            id: formItem.groupItem?.hptId,
            doors: [],
        };
        const hptId = itemHtp?.id || this.ctx.nextId("hpt");
        let stepProductId;
        const hptMeta = {} satisfies HousePackageToolMeta;

        Array.from(new Set(Object.keys(form).map((k) => k.split("-")[0]))).map(
            (stepUid) => {
                Object.entries(form)
                    .filter(
                        ([uid, formData]) =>
                            uid.startsWith(stepUid) && formData.selected,
                    )
                    .map(([stepSizeUid, formData]) => {
                        if (!stepProductId) {
                            stepProductId =
                                formData.stepProductId?.id ||
                                formData.stepProductId?.fallbackId;
                        }
                        const [_, ...dimensions] = stepSizeUid?.split("-");
                        const dimension = dimensions?.join("-");

                        const doorData: HptData["doors"][number] = {
                            id: formData.doorId,
                        };
                        const updateDoor = this.composeSalesDoorUpdateData(
                            formData,
                            dimension,
                            formData.stepProductId?.id ||
                                formData.stepProductId?.fallbackId,
                        );

                        if (formData.doorId) {
                            if (
                                this.validateSalesDoorUpdate(
                                    formData.doorId,
                                    updateDoor,
                                    stepSizeUid,
                                    dimension,
                                )
                            )
                                doorData.data = updateDoor;
                        } else {
                            const { stepProduct, ...rest } = updateDoor;

                            const createDoor = {
                                ...rest,
                                id: this.ctx.nextId("salesDoor"),
                                housePackageToolId: hptId,
                                salesOrderId: this.ctx.salesId,
                                salesOrderItemId: this.itemData.id,
                                stepProductId: formData.stepProductId?.id,
                            } satisfies Prisma.DykeSalesDoorsCreateManyInput;
                            doorData.data = createDoor;
                            doorData.id = createDoor.id;
                        }

                        itemHtp.doors.push(doorData);
                    });
                this.itemData.hpt = itemHtp;
            },
        );
        const updateHpt = {
            meta: hptMeta,
            stepProduct: {
                connect: {
                    id: stepProductId,
                },
            },
        } satisfies Prisma.HousePackageToolsUpdateInput;

        if (itemHtp.id) {
            itemHtp.data = updateHpt;
            //  itemHtp.id = hpt.id;
        } else {
            const { stepProduct, ...createHtp } = updateHpt;
            const hpt = {
                id: hptId,
                ...createHtp,
                orderItemId: this.itemData.id,
                salesOrderId: this.ctx.salesId,
                doorType: formItem.groupItem.itemType,
                stepProductId: formItem.groupItem.doorStepProductId,
            } satisfies Prisma.HousePackageToolsCreateManyInput;
            itemHtp.data = hpt;
            itemHtp.id = hpt.id;
        }

        if (this.itemData.hpt?.doors?.length)
            this.ctx.data.items.push(this.itemData);
    }
    public generateItemFormSteps() {
        const steps = this.formSteps();
        steps.map((step) => {
            const updateData = this.composeStepUpdateData(step);
            if (!step.stepFormId) {
                const { salesOrderItem, component, ...rest } = updateData;
                const createData = {
                    ...rest,
                    componentId: component?.connect?.id,

                    id: this.ctx.nextId("formStep"),
                    stepId: step.stepId,
                    salesId: this.ctx.salesId,
                    salesItemId: this.itemData.id,
                } satisfies Prisma.DykeStepFormCreateManyInput;

                this.itemData.formValues.push({
                    data: createData,
                    id: createData.id,
                });
            } else {
                this.itemData.formValues.push(
                    this.validateFormValueUpdate(step.stepFormId, updateData),
                );
            }
        });
    }
    public composeStepUpdateData(step) {
        const meta = {
            ...(step?.formStepMeta || {}),
            flatRate: step.flatRate,
        } satisfies DykeFormStepMeta;
        return {
            basePrice: this.ctx.safeInt(step.basePrice),
            price: this.ctx.safeInt(step.salesPrice),
            prodUid: step.componentUid,
            component: step.componentId
                ? {
                      connect: {
                          id: step.componentId,
                      },
                  }
                : undefined,
            // componentId: step.componentId,
            qty: 1,
            meta,
            value: step.value,
            salesOrderItem: {
                connect: {
                    id: this.itemData.id,
                },
            },
        } satisfies Prisma.DykeStepFormUpdateInput;
    }
    public composeSalesDoorUpdateData(formData, dimension, fid = null) {
        return {
            dimension,
            lhQty: this.ctx.safeInt(formData.qty.lh),
            rhQty: this.ctx.safeInt(formData.qty.rh),
            totalQty: this.ctx.safeInt(formData.qty.total),
            jambSizePrice: this.ctx.safeInt(
                formData.pricing.itemPrice.salesPrice,
            ),
            doorPrice: this.ctx.safeInt(formData.pricing.addon),
            meta: {
                overridePrice: formData.pricing.customPrice,
                laborQty: formData?.pricing?.laborQty,
                unitLabor: formData?.pricing?.unitLabor,
                prodOverride: formData?.prodOverride,
            } satisfies DykeSalesDoorMeta,
            unitPrice: this.ctx.safeInt(formData.pricing.unitPrice),
            lineTotal: this.ctx.safeInt(formData.pricing.totalPrice),
            swing: formData.swing,
            stepProduct: {
                connect: {
                    id: fid || formData.stepProductId?.id,
                },
            },
        } satisfies Prisma.DykeSalesDoorsUpdateInput;
    }
    public validateSalesDoorUpdate(
        id,
        data: Prisma.DykeSalesDoorsUpdateInput,
        formUid,
        dimension,
    ) {
        if (this.ctx.isRestoreMode) return true;
        const group = this.groupItemForm(true);
        const formData = group?.[formUid];
        if (formData) {
            const updateDoor = this.composeSalesDoorUpdateData(
                formData,
                dimension,
            );

            return this.ctx.compare(data, updateDoor) ? false : true;
        }
        return true;
    }

    public validateFormValueUpdate(id, data: Prisma.DykeStepFormUpdateInput) {
        const _: any = { id };
        const fss = this.formSteps(true);
        const formStep = fss?.find((s) => s.stepFormId == id);

        if (formStep && !this.ctx.isRestoreMode) {
            const updateData = this.composeStepUpdateData(formStep);
            updateData.salesOrderItem.connect.id = formStep.salesOrderItemId;
            if (this.ctx.compare(data, updateData)) {
                return _;
            }
        }
        _.data = data;
        return _;
    }
    public generateShelfItems() {
        const {
            shelfItems: { lineUids, lines, subTotal },
        } = this.formItem();
        let itemIndex = 0;
        const shelfs: ShelfData = [];
        lineUids.map((uid) => {
            const { categoryIds, productUids, products } = lines[uid];
            productUids.map((puid) => {
                const prod = products[puid];
                const meta = {
                    itemIndex: ++itemIndex,
                    categoryUid: categoryIds.join("-"),
                    customPrice: prod.customPrice,
                    laborQty: prod?.laborQty,
                    unitLabor: prod?.unitLabor,
                    basePrice: prod.basePrice,
                    lineUid: uid,
                } as ShelfItemMeta;
                const updateShelf = {
                    category: {
                        connect: {
                            id: prod.categoryId,
                        },
                    },
                    totalPrice: prod.totalPrice,
                    unitPrice: prod.salesPrice,
                    qty: prod.qty,
                    description: prod.title,
                    shelfProduct: {
                        connect: {
                            id: prod.productId,
                        },
                    },
                    salesOrderItem: {
                        connect: {
                            id: this.itemData.id,
                        },
                    },
                    meta: meta as any,
                } satisfies Prisma.DykeSalesShelfItemUpdateInput;
                const prodId = prod.id || this.ctx.nextId("shelfItemId");
                if (prod.id) {
                    shelfs.push({
                        data: updateShelf,
                        id: prod.id,
                    });
                } else {
                    const { category, shelfProduct, salesOrderItem, ...rest } =
                        updateShelf;
                    shelfs.push({
                        id: prodId,
                        data: {
                            ...rest,
                            id: prodId,
                            categoryId: category.connect.id,
                            productId: shelfProduct.connect.id,
                            salesOrderItemId: this.itemData.id,
                        } satisfies Prisma.DykeSalesShelfItemCreateManyInput,
                    });
                }
            });
        });
        this.itemData.shelfItems = shelfs;
    }
    public generateNonDoorItem(
        gf?: SalesFormFields["kvFormItem"][""]["groupItem"]["form"][""],
        primaryGroupItem?,
    ) {
        if (!gf) gf = {} as any;
        const lineIndex = this.getLineIndex();
        const formItem = this.formItem();
        // formItem.groupItem.id
        // formItem?.id
        const isMoulding = formItem?.groupItem?.type == "MOULDING";
        const shelf = formItem?.shelfItems;
        const isShelf = shelf?.lineUids?.length;
        const salesItemId = isShelf
            ? formItem?.shelfItems?.salesItemId
            : gf?.meta?.salesItemId;
        const meta = {
            doorType: formItem?.groupItem?.itemType,
            lineIndex,
            ...(isMoulding || isShelf
                ? {}
                : {
                      tax: gf?.meta?.taxxable,
                  }),
        } satisfies SalesItemMeta;
        const updateData = {
            meta,
            ...(isMoulding || isShelf
                ? {}
                : {
                      dykeProduction: gf.meta?.produceable || false,
                  }),
            rate: this.ctx.safeInt(gf?.pricing?.unitPrice),
            total: isShelf
                ? this.ctx.safeInt(shelf.subTotal)
                : this.ctx.safeInt(gf?.pricing?.totalPrice),
            description: gf?.meta?.description,
            swing: gf.swing,
            qty: this.ctx.safeInt(gf.qty?.total),
            multiDykeUid: isShelf ? null : formItem?.groupItem?.groupUid,
            multiDyke: primaryGroupItem,
            dykeDescription: formItem?.title,
            // salesOrder
        } satisfies Prisma.SalesOrderItemsUpdateInput;
        const { multiDykeUid, multiDyke, ...rest } = updateData;
        if (!salesItemId) {
            const createData = {
                ...updateData,
                salesOrderId: this.ctx.salesId,
                id: this.ctx.nextId("itemId"),
            } satisfies Prisma.SalesOrderItemsCreateManyInput;
            this.itemData = {
                data: createData,
                id: createData.id,
                formValues: [],
            };
        } else {
            this.itemData = {
                data: updateData,
                id: salesItemId,
                formValues: [],
            };
        }
        if (primaryGroupItem || isShelf) this.generateItemFormSteps();
        if (isShelf) this.generateShelfItems();
        if (isMoulding) {
            const itemHtp: HptData = {
                id: gf.hptId,
            };
            const hptMeta = {
                priceTags: {
                    moulding: {
                        addon: this.ctx.safeInt(gf.pricing?.addon),
                        overridePrice: gf.pricing?.customPrice as any,
                        salesPrice: this.ctx.safeInt(
                            gf?.pricing?.itemPrice?.salesPrice,
                        ),
                        basePrice: this.ctx.safeInt(
                            gf?.pricing?.itemPrice?.basePrice,
                        ),
                        price: this.ctx.safeInt(gf?.pricing?.unitPrice),
                        laborQty: gf.pricing?.laborQty,
                        unitLabor: gf.pricing?.unitLabor,
                    },
                },
            } satisfies HousePackageToolMeta;
            const updateHpt = {
                meta: hptMeta,
                stepProduct: {
                    connect: {
                        id: gf.stepProductId?.id,
                    },
                },
                // molding: {
                //     connect: {
                //         id: gf.stepProductId?.id,
                //     },
                // },
            } satisfies Prisma.HousePackageToolsUpdateInput;
            if (itemHtp.id) {
                itemHtp.data = updateHpt;
            } else {
                const { stepProduct, ...createHtp } = updateHpt;
                const hpt = {
                    id: this.ctx.nextId("hpt"),
                    ...createHtp,
                    orderItemId: this.itemData.id,
                    salesOrderId: this.ctx.salesId,
                    doorType: formItem.groupItem.itemType,
                    stepProductId: gf.stepProductId.id,
                    moldingId: gf.mouldingProductId,
                } satisfies Prisma.HousePackageToolsCreateManyInput;
                itemHtp.data = hpt;
                itemHtp.id = hpt.id;
            }
            this.itemData.hpt = itemHtp;
        }
        //  if (this.itemData.hpt?.doors)
        this.ctx.data.items.push(this.itemData);
    }
}

// --- Content from: ai/sales-form/sales-meta-form.tsx ---
import { Fragment, useMemo, useState } from "react";
import salesData from "@/app-deps/(clean-code)/(sales)/_common/utils/sales-data";
import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { SettingsClass } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/settings-class";
import { DatePicker } from "@/components/_v1/date-range-picker";
import { Icons } from "@/components/_v1/icons";
import { Menu } from "@/components/(clean-code)/menu";
import { AnimatedNumber } from "@/components/animated-number";
import { FormSelectProps } from "@/components/common/controls/form-select";
import { NumberInput } from "@/components/currency-input";
import { LabelInput } from "@/components/label-input";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { cn } from "@/lib/utils";
import { NumericFormatProps } from "react-number-format";

import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
    Select as BaseSelect,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import { Footer } from "./footer";
import { SalesFormSave } from "./sales-form-save";
import ConfirmBtn from "@/components/confirm-button";
import { deleteSalesExtraCost } from "@/actions/delete-sales-extra-cost";
import FormSettingsModal from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/form-settings-modal";
import { _modal } from "@/components/common/modal/provider";
import { SalesLaborLine } from "./sales-labor-line";
import { useSticky } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_hooks/use-sticky";
import { MenuItemSalesActions } from "@/components/menu-item-sales-actions";
import { SalesHistory } from "@/components/sales-hx";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useSalesSummaryToggle } from "@/store/invoice-summary-toggle";
import { SalesCustomerInput } from "./sales-customer-input";

export function SalesMetaForm({}) {
    const zus = useFormDataStore();
    const md = zus.metaData;
    const tabs = [
        "summary",
        "history",
        // "transactions",
        // "customer info",
        // , "customer"
    ];
    const [tab, setTab] = useState(md?.id ? "summary" : "summary");
    const ctx = useSalesOverviewQuery();
    const { actionRef, isFixed, fixedOffset } = useSticky(
        (bv, pv, { top, bottom }) => {
            // return top < 0;
            return true;
        } //!bv && pv,
    );
    const [menuOpen, setMenuOpen] = useState(false);
    const { hidden, toggle } = useSalesSummaryToggle();
    return (
        <div>
            <div
                ref={actionRef}
                // style={isFixed ? { left: `${fixedOffset}px` } : {}}
            >
                <div className="flex relative  border-b">
                    <div className="-ml-6">
                        <Button
                            onClick={(e) => {
                                toggle();
                            }}
                            size="xs"
                            variant="outline"
                        >
                            {!hidden ? (
                                <ChevronsRight className="size-4" />
                            ) : (
                                <ChevronsLeft className="size-4" />
                            )}
                        </Button>
                    </div>
                    {tabs.map((_tab, ti) => (
                        <Button
                            key={_tab}
                            variant="ghost"
                            // disabled={ti != 0}
                            onClick={(e) => {
                                setTab(_tab);
                            }}
                            className={cn(
                                "rounded-none border-b-2 border-transparent font-mono$ uppercase hover:bg-transparent",
                                tab == _tab
                                    ? "rounded-none border-b border-primary"
                                    : "text-muted-foreground/90 hover:text-muted-foreground"
                            )}
                        >
                            {_tab}
                        </Button>
                    ))}
                    <div className="flex-1"></div>
                    <div>
                        <Menu open={menuOpen} onOpenChanged={setMenuOpen}>
                            {/* <Menu.Item Icon={Icons.save}>Save</Menu.Item> */}
                            <SalesFormSave type="menu" />
                            <Menu.Item
                                onClick={() => {
                                    ctx.open2(
                                        zus.metaData?.salesId,
                                        zus.metaData.type == "order"
                                            ? "sales"
                                            : "quote"
                                    );
                                }}
                                Icon={Icons.customerService}
                            >
                                Overview
                            </Menu.Item>

                            <MenuItemSalesActions
                                slug={zus.metaData.salesId}
                                setMenuOpen={setMenuOpen}
                                type={zus.metaData.type}
                                id={zus.metaData.id}
                            />

                            <Menu.Item
                                onClick={(e) => {
                                    _modal.openSheet(<FormSettingsModal />);
                                }}
                                Icon={Icons.settings}
                            >
                                Settings
                            </Menu.Item>
                        </Menu>
                    </div>
                </div>
                {tab == "summary" ? (
                    <SummaryTab />
                ) : tab == "history" ? (
                    <SalesHistory salesId={md?.salesId} />
                ) : (
                    <></>
                )}
            </div>
        </div>
    );
}
function SummaryTab({}) {
    const zus = useFormDataStore();
    const md = zus.metaData;
    const setting = useMemo(() => new SettingsClass(), []);
    const profiles = setting.salesProfiles();
    const taxList = setting.taxList();
    function calculateTotal() {
        setting.calculateTotalPrice();
    }
    return (
        <div className="">
            <SalesCustomerInput />
            {/* <div className="min-h-[15vh] border-b">
                <CustomerDataSection />
            </div> */}
            <div className="grid gap-1">
                <Input
                    label="Date"
                    name="metaData.createdAt"
                    value={md.createdAt}
                    type="date"
                />
                <LineContainer lg label="Profile">
                    <Select
                        value={md.salesProfileId}
                        onSelect={(e) => {
                            setting.salesProfileChanged();
                        }}
                        name="metaData.salesProfileId"
                        options={profiles}
                        titleKey="title"
                        valueKey="id"
                    />
                </LineContainer>
                <Input label="P.O No" name="metaData.po" value={md.po} />
                {md.type === "order" ? (
                    <>
                        <LineContainer label="Net Term">
                            <Select
                                name="metaData.paymentTerm"
                                value={md.paymentTerm}
                                options={salesData.paymentTerms}
                                valueKey={"value"}
                                titleKey={"text"}
                            />
                        </LineContainer>
                        {md.paymentTerm != "None" || (
                            <Input
                                label="Due Date"
                                name="metaData.paymentDueDate"
                                value={md.paymentDueDate}
                                type="date"
                            />
                        )}
                    </>
                ) : (
                    <>
                        <LineContainer label="Good Until">
                            <Input
                                label="Good Until"
                                name="metaData.goodUntil"
                                value={md.goodUntil}
                                type="date"
                            />
                        </LineContainer>
                    </>
                )}
                <div className="py-5"></div>
                <LineContainer label="Delivery Mode">
                    <Select
                        name="metaData.deliveryMode"
                        value={md.deliveryMode}
                        options={salesData.deliveryModes}
                        valueKey={"value"}
                        titleKey={"text"}
                    />
                </LineContainer>

                <LineContainer label="Sub Total">
                    <div className="text-right">
                        <AnimatedNumber value={md.pricing?.subTotal || 0} />
                    </div>
                </LineContainer>
                <LineContainer
                    label={
                        <div className="col-span-3 flex items-center justify-end border-b hover:bg-muted-foreground/30">
                            <Select
                                name="metaData.tax.taxCode"
                                options={taxList}
                                value={md.tax?.taxCode}
                                titleKey="title"
                                valueKey="taxCode"
                                onSelect={(e) => {
                                    setting.taxCodeChanged();
                                }}
                                className="w-auto"
                            />
                            <span className="text-sm">
                                {!md.tax?.taxCode || (
                                    <span>({md.tax?.percentage || 0}%)</span>
                                )}
                                :
                            </span>
                        </div>
                    }
                >
                    <div className="text-right">
                        <AnimatedNumber value={md.pricing?.taxValue || 0} />
                    </div>
                </LineContainer>
                <SalesLaborLine />
                {
                    // Object.entries(md.extraCosts)
                    md.extraCosts
                        // .filter((k) => k.type !=  "Labor")
                        .map((k, i) =>
                            k.type == "Labor" ? (
                                <Fragment key={i}></Fragment>
                            ) : (
                                <Input
                                    key={i}
                                    onChange={(e) => {
                                        calculateTotal();
                                    }}
                                    label={
                                        <span>
                                            <LabelInput
                                                value={k.label}
                                                className="text-end"
                                                onChange={(e) => {
                                                    zus.dotUpdate(
                                                        `metaData.extraCosts.${i}.label`,
                                                        e.target.value
                                                    );
                                                }}
                                            />
                                        </span>
                                    }
                                    name={`metaData.extraCosts.${i}.amount`}
                                    value={md.extraCosts?.[i]?.amount || ""}
                                    numberProps={{
                                        prefix: "$",
                                    }}
                                >
                                    <ConfirmBtn
                                        onClick={async (e) => {
                                            if (k.id)
                                                await deleteSalesExtraCost(
                                                    k.id
                                                );

                                            zus.removeKey(
                                                `metaData.extraCosts.${i}`
                                            );
                                            calculateTotal();
                                        }}
                                        size="sm"
                                        trash
                                    />
                                </Input>
                            )
                        )
                }
                <Menu Icon={Icons.add} label={"Add Cost"}>
                    {["Discount", "Delivery", "Custom"].map((v, i) => (
                        <Menu.Item
                            onClick={(e) => {
                                zus.dotUpdate(`metaData.extraCosts`, [
                                    ...zus.metaData?.extraCosts,
                                    {
                                        label: i == 2 ? "Custom" : v,
                                        amount: 0,
                                        type: i == 2 ? "CustomNonTaxxable" : v,
                                    },
                                ]);
                            }}
                            key={i}
                        >
                            {/* {i == 2 ? 'CustomNonTaxxable' : v} */}
                            {v}
                        </Menu.Item>
                    ))}
                </Menu>
                <LineContainer
                    label={
                        <div className="col-span-3 flex items-center justify-end border-b hover:bg-muted-foreground/30">
                            <Select
                                name="metaData.paymentMethod"
                                options={salesData.paymentOptions}
                                value={md.paymentMethod}
                                placeholder="Select Payment Method"
                                onSelect={(e) => {
                                    setting.taxCodeChanged();
                                }}
                                className="w-auto"
                            />
                            <span>
                                {md.paymentMethod != "Credit Card" || (
                                    <span className="text-sm">(3%)</span>
                                )}
                                :
                            </span>
                        </div>
                    }
                >
                    <div className="text-right">
                        <AnimatedNumber value={md.pricing?.ccc || 0} />
                    </div>
                </LineContainer>

                <LineContainer label="Total">
                    <div className="text-right">
                        <AnimatedNumber value={md.pricing?.grandTotal || 0} />
                    </div>
                </LineContainer>
                <Footer />
            </div>
        </div>
    );
}
interface InputProps {
    value;
    label?;
    name?;
    type?: "date";
    numberProps?: NumericFormatProps;
    lg?: boolean;
    readOnly?: boolean;
    onChange?;
    children?;
}
function Input({
    value,
    label,
    name,
    lg,
    onChange,
    children,
    ...props
}: InputProps) {
    const zus = useFormDataStore();
    return (
        <LineContainer lg={lg} label={label}>
            {props.type == "date" ? (
                <>
                    <DatePicker
                        className=" midday w-auto border-b border-none p-0 px-1 uppercase whitespace-nowrap"
                        hideIcon
                        value={value as any}
                        setValue={(e) => {
                            zus.dotUpdate(name, e);
                            onChange?.(e);
                        }}
                    />
                </>
            ) : props.numberProps ? (
                <NumberInput
                    {...props.numberProps}
                    className="text-end min-w-16"
                    value={value as any}
                    readOnly={props.readOnly}
                    onValueChange={(e) => {
                        const val = e.floatValue || "";
                        zus.dotUpdate(name, val);
                        onChange?.(val);
                    }}
                />
            ) : (
                <LabelInput
                    className=" midday uppercase"
                    value={value as any}
                    onChange={(e) => {
                        zus.dotUpdate(name, e.target.value);
                    }}
                />
            )}
            {children}
        </LineContainer>
    );
}
function LineContainer({ label, lg = false, className = "", children }) {
    return (
        <div
            className={cn(
                "items-center gap-4 font-mono$ uppercase",
                label && "grid grid-cols-5"
            )}
        >
            <div className="col-span-3 flex justify-end text-muted-foreground">
                {!label ||
                    (typeof label === "string" ? (
                        <Label className="">{label}:</Label>
                    ) : (
                        label
                    ))}
            </div>
            <div className={cn(lg && "col-span-2", "flex flex-1")}>
                {children}
            </div>
        </div>
    );
}
export function Select<T>({
    name,
    options,
    valueKey,
    titleKey,
    Item,
    SelectItem: SelItem,
    value,
    ...props
}: FormSelectProps<T> & { value; name }) {
    const state = useFormDataStore();
    function itemValue(option) {
        if (!option) return option;
        if (Number.isInteger(option)) option = String(option);

        return typeof option == "object" ? option[valueKey] : option;
    }
    function itemText(option) {
        if (!option) return option;
        return typeof option == "string"
            ? option
            : titleKey == "label"
            ? option[titleKey] || option["text"]
            : option[titleKey];
    }
    const isPlaceholder = !value && !props.placeholder;
    return (
        <BaseSelect
            onValueChange={(e) => {
                state.dotUpdate(name, e);
                props.onSelect?.(e as any);
            }}
            value={value}
        >
            <SelectTrigger
                noIcon
                className="uppercases midday relative  h-7 w-auto min-w-[16px] border-none bg-transparent p-0 font-mono$"
            >
                {isPlaceholder && (
                    <div className="pointer-events-none absolute inset-0">
                        <div className="h-full w-full bg-[repeating-linear-gradient(-60deg,#DBDBDB,#DBDBDB_1px,transparent_1px,transparent_5px)] dark:bg-[repeating-linear-gradient(-60deg,#2C2C2C,#2C2C2C_1px,transparent_1px,transparent_5px)]" />
                    </div>
                )}

                <SelectValue
                    // className="whitespace-nowrap border-none p-0 font-mono$ uppercase"
                    placeholder={props.placeholder}
                >
                    <span>
                        {itemText(options?.find((o) => itemValue(o) == value))}
                    </span>
                </SelectValue>
            </SelectTrigger>

            <SelectContent className="">
                <ScrollArea className="max-h-[40vh] overflow-auto">
                    {options?.map((option, index) =>
                        SelItem ? (
                            <SelItem option={option} key={index} />
                        ) : (
                            <SelectItem key={index} value={itemValue(option)}>
                                {Item ? (
                                    <Item option={option} />
                                ) : (
                                    <>{itemText(option)}</>
                                )}
                            </SelectItem>
                        )
                    )}
                </ScrollArea>
            </SelectContent>
        </BaseSelect>
    );
}

// --- Content from: ai/sales-form/hpt-class.ts ---
import { formatMoney } from "@/lib/use-number";

import { GroupFormClass } from "./group-form-class";
import { ComponentHelperClass } from "./step-component-class";
type SizeForm = ReturnType<
    HptClass["getHptForm"]
>["doors"][number]["sizeList"][number];
export class HptClass extends GroupFormClass {
    constructor(public itemStepUid) {
        super(itemStepUid);
    }
    public getDoorStepForm() {
        return Object.entries(this.zus.kvStepForm).filter(
            ([uid, data]) =>
                uid.startsWith(`${this.itemUid}-`) && data.title == "Door",
        )?.[0]?.[1];
    }
    public tabChanged(value) {
        this.dotUpdateItemForm("groupItem._.tabUid", value);
    }
    public getHptForm() {
        const doors = this.getSelectedDoors();

        const config = this.getRouteConfig();
        const itemForm = this.getItemForm();

        const resp = {
            doors: doors.map((door) => {
                const priceModel = this.getDoorPriceModel(door.uid);
                return {
                    ...door,
                    cls: new ComponentHelperClass(this.stepUid, door.uid),
                    sizeList: priceModel.heightSizeList?.map((hsl) => {
                        const path = `${door.uid}-${hsl.size}`;
                        const selected = this.isDoorSelected(path);
                        const basePrice =
                            priceModel.formData?.priceVariants?.[hsl.size]
                                ?.price;
                        return {
                            path,
                            title: hsl.size,
                            basePrice,
                            salesPrice: this.calculateSales(basePrice),
                            selected,
                        };
                    }),
                };
            }),
            config,
            pricedSteps: this.getPricedSteps(),
            // tabUid: itemForm.groupItem?._?.tabUid,
        };

        // if (resp.doors.every((s) => s.uid != resp.tabUid)) {
        //     resp.tabUid = resp.doors?.[0]?.uid;
        //     this.dotUpdateItemForm("groupItem._.tabUid", resp.tabUid);
        // }

        return resp;
    }
    public getStepProductUid() {
        return this.getItemForm()?.groupItem?.doorStepProductId;
    }
    public get tabUid() {
        return this.getItemForm()?.groupItem?._?.tabUid;
    }
    public getSelectedDoors() {
        const itemForm = this.getItemForm();
        const doorStep = this.getDoorStepForm();

        const selectionComponentUids = Array.from(
            new Set(itemForm.groupItem?.itemIds?.map((s) => s.split("-")[0])),
        );
        return selectionComponentUids
            .map((componentUid) => {
                const component = this.getComponentFromSettingsByStepId(
                    doorStep?.stepId,
                    componentUid,
                );
                return component;
            })
            .filter(Boolean);
    }

    public isDoorSelected(uid) {
        return this.getItemForm()?.groupItem?.form?.[uid]?.selected;
    }
    public getComponentPrice() {
        const itemForm = this.getItemForm();
        return itemForm?.groupItem?.pricing?.components?.salesPrice;
    }

    public addHeight(size: SizeForm) {
        const path = size.path;
        const config = this.getRouteConfig();
        if (this.getGroupItemForm(path)) {
            this.dotUpdateGroupItemFormPath(path, "selected", true);
            this.dotUpdateGroupItemFormPath(path, "qty.lh", "");
            this.dotUpdateGroupItemFormPath(path, "qty.rh", "");
            this.dotUpdateGroupItemFormPath(path, "qty.total", "");
        } else {
            const componentPrice = this.getComponentPrice();
            const salesPrice = size.salesPrice; //this.calculateSales(size.basePrice?.price);
            const estimatedComponentPrice = formatMoney(
                salesPrice + componentPrice,
            );
            this.dotUpdateGroupItemForm(path, {
                qty: {
                    lh: "",
                    rh: "",
                    total: "",
                },
                selected: true,
                swing: "",
                stepProductId: this.getStepProductUid(),
                pricing: {
                    addon: "",
                    itemPrice: {
                        basePrice: size.basePrice,
                        salesPrice,
                    },
                    customPrice: "",
                    componentPrice,
                    totalPrice: 0,
                    unitPrice: formatMoney(estimatedComponentPrice),
                },
                meta: {
                    description: "",
                    produceable: true,
                    taxxable: true,
                    // noHandle: config?.noHandle,
                },
            });
        }
    }
}

// --- Content from: ai/sales-form/save-shelf-helper.ts ---
import { SalesFormItem } from "../../../types";
import { ItemHelperClass } from "./item-helper-class";
import { SaveSalesClass } from "./save-sales-class";

interface Props {
    ctx: SaveSalesClass;
    formItem: SalesFormItem;
    itemId;
}
export function saveShelfHelper({ ctx, formItem, itemId, ...props }: Props) {
    const shelfItems = formItem.shelfItems;
    const itemCtx = new ItemHelperClass(ctx, itemId);
    itemCtx.generateNonDoorItem();
}

// --- Content from: ai/sales-form/group-form-class.ts ---
import { FieldPath, FieldPathValue } from "react-hook-form";
import {
    ZusGroupItemForm,
    ZusGroupItemFormPath,
} from "../../../_common/_stores/form-data-store";
import { StepHelperClass } from "./step-component-class";
import { dotObject } from "@/app/(clean-code)/_common/utils/utils";

export class GroupFormClass extends StepHelperClass {
    constructor(public itemStepUid) {
        super(itemStepUid);
    }
    public dotGetGroupItemFormValue<K extends FieldPath<ZusGroupItemFormPath>>(
        lineUid,
        path: K
    ): FieldPathValue<ZusGroupItemFormPath, K> {
        return dotObject.pick(
            path,
            this.getItemForm()?.groupItem?.form?.[lineUid]
        );
    }
    public dotUpdateGroupItemForm<K extends FieldPath<ZusGroupItemForm>>(
        path: K,
        value: FieldPathValue<ZusGroupItemForm, K>
    ) {
        this.zus.dotUpdate(
            `kvFormItem.${this.itemUid}.groupItem.form.${path}`,
            value as any
        );
    }

    public dotUpdateGroupItemFormPath<
        K extends FieldPath<ZusGroupItemFormPath>
    >(path, pathName: K, value: FieldPathValue<ZusGroupItemFormPath, K>) {
        this.zus.dotUpdate(
            `kvFormItem.${this.itemUid}.groupItem.form.${path}.${pathName}`,
            value as any
        );
    }
    public getGroupItemForm(path) {
        return this.getItemForm()?.groupItem?.form?.[path];
    }
    public removeGroupItem(path) {
        this.dotUpdateGroupItemFormPath(path, "selected", false);
        this.calculateTotalPrice();
    }
    public updateGroupItemForm(path, newData: ZusGroupItemFormPath) {
        const oldData = this.getGroupItemForm(path);
        const dotOldData = dotObject.dot(oldData);
        const dotNewData = dotObject.dot(newData);
        for (const [key, value] of Object.entries(dotNewData)) {
            if (dotOldData[key] !== value) {
                this.dotUpdateGroupItemFormPath(path, key as any, value);
            }
        }
    }
    public get selectCount() {
        return Object.values(this.getItemForm()?.groupItem?.form).filter(
            (s) => s.selected
        ).length;
    }
}

// --- Content from: ai/sales-form/page copy.tsx ---
import { getSalesBookFormUseCase } from "@/app-deps/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { FormClient } from "../../_components/form-client";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

export async function generateMetadata(props) {
    const params = await props.params;
    return constructMetadata({
        title: `Edit Order | ${params.slug} - gndprodesk.com`,
    });
}
export default async function Page(props) {
    const params = await props.params;
    let slug = params.slug;
    // await fixUndefinedOrderIdAction(slug, "order");
    const data = await getSalesBookFormUseCase({
        type: "order",
        slug: params.slug,
    });
    return (
        <FPage
            className=""
            title={`Edit Order | ${data.order.orderId?.toUpperCase()}`}
        >
            <FormClient data={data} />
        </FPage>
    );
}


// --- Content from: ai/sales-form/helper-class.ts ---
import { Prisma } from "@/db";
import { __isProd } from "@/lib/is-prod-server";
import { formatMoney } from "@/lib/use-number";
import dayjs from "dayjs";
import { isEqual, isNaN } from "lodash";

import { SalesFormFields, SalesMeta } from "../../../types";
import { calculatePaymentDueDate } from "../../utils/sales-utils";
import { generateSalesId } from "./sales-id-dta";
import { SaveSalesClass } from "./save-sales-class";

export class SaveSalesHelper {
    constructor(public ctx?: SaveSalesClass) {}

    public createRel(newId, oldId?) {
        const resp: any = {};
        if (newId) {
            resp.connect = { id: newId };
            return resp;
        }
        if (oldId) {
            if (oldId != newId && !newId) resp.disconnect = { id: oldId };
        }
        if (newId && (newId != oldId || this.ctx?.query?.copy)) {
            resp.connect = { id: newId };
        }
        return resp;
    }
    public async composeSalesForm(form: SalesFormFields) {
        const md = form.metaData;
        const meta: Partial<SalesMeta> = {
            ccc: md.pricing.ccc,
            discount: md.pricing.discount,
            deliveryCost: Number(md.pricing?.delivery),
            labor_cost: md.pricing.labour,
            po: md.po,
            qb: md.qb,
            payment_option: md.paymentMethod,
            laborConfig: md?.salesLaborConfig,
        };
        const sd = this.ctx.data;

        const updateData = {
            // title: ,
            subTotal: md.pricing.subTotal,
            grandTotal: md.pricing.grandTotal,
            paymentTerm: md.paymentTerm,
            deliveryOption: md.deliveryMode,
            meta: meta as any,
            amountDue: formatMoney(md.pricing.grandTotal - md.pricing.paid),
            paymentDueDate: null,
            goodUntil: this.convertDate(md.goodUntil),
            tax: md.pricing.taxValue,
            isDyke: true,
            type: md.type,
            salesProfile: md.salesProfileId
                ? {
                      connect: {
                          id: md.salesProfileId,
                      },
                  }
                : undefined,
            customer: this.createRel(sd.customerId),
            billingAddress: this.createRel(sd.billingAddressId),
            shippingAddress: this.createRel(sd.shippingAddressId),
            createdAt: md.createdAt,
            // shippingAddress: {
            //     connect: sd.shippingAddressId
            //         ? { id: sd.shippingAddressId }
            //         : undefined,
            //     disconnect:
            //         md.sad != sd.shippingAddressId
            //             ? {
            //                   id: md.sad,
            //               }
            //             : undefined,
            // },
        } satisfies Prisma.SalesOrdersUpdateInput;

        if (md.type == "order") {
            if (md.paymentTerm == "None")
                updateData.paymentDueDate = md.paymentDueDate;
            else
                updateData.paymentDueDate = calculatePaymentDueDate(
                    md.paymentTerm,
                    md.createdAt,
                );
        }
        if (md.id) {
            return {
                data: updateData,
                id: md.id,
                updateId: md.id,
            };
        } else {
            // const gord = await this.generateOrderId(md.type);
            const orderId = await generateSalesId(md.type);

            const { salesProfile, ...rest } = updateData;
            const createData = {
                ...rest,
                status: "",
                orderId,
                slug: orderId,
                id: this.ctx.nextIds.salesId,
                // createdAt,
                isDyke: true,
                // salesRepId: md.salesRepId,
                salesRep: {
                    connect: {
                        id: md.salesRepId,
                    },
                },

                salesProfile,
                // customerProfileId: md.salesProfileId,
            } satisfies Prisma.SalesOrdersCreateInput;
            return {
                id: createData.id,
                data: createData,
            };
        }
    }
    public composeTax() {
        const form = this.ctx.form;
        const tax = form.metaData.tax;
        if (!tax) return;
        const updateTax = {
            tax: form.metaData.pricing.taxValue,
            taxxable: form.metaData.pricing.taxxable,
            taxConfig: tax
                ? {
                      connect: {
                          taxCode: tax.taxCode,
                      },
                  }
                : undefined,
        } satisfies Prisma.SalesTaxesUpdateInput;
        if (!tax?.salesTaxId && tax) {
            const createTax = {
                taxCode: form.metaData.tax.taxCode,
                salesId: this.ctx.salesId,
                taxxable: form.metaData.pricing.taxxable,
                tax: form.metaData.pricing.taxValue,
            } satisfies Prisma.SalesTaxesCreateManyInput;
            this.ctx.data.tax = {
                data: createTax,
            };
        } else {
            this.ctx.data.tax = {
                data: updateTax,
                updateId: form.metaData.tax.salesTaxId,
                id: form.metaData.tax.salesTaxId,
            };
        }
    }
    public compare(data1, data2) {
        const equals = isEqual(data1, data2);
        return equals;
        // return data1 == data2;
    }

    public convertDate(date) {
        if (date instanceof Date) return date.toISOString();
        // if (!date || typeof date == "string")
        return date;
    }
    public getLineIndex(itemUid, data: SalesFormFields) {
        return data.sequence;
    }
    public nextId<K extends keyof (typeof this)["ctx"]["nextIds"]>(
        k: K,
    ): number {
        let id = this.ctx.nextIds[k as any];
        this.ctx.nextIds[k as any] += 1;
        return id;
    }

    public safeInt(val, def = null) {
        const v = Number(val);
        if (isNaN(v)) return def;
        return v;
    }
    public getUnusedIds() {
        const oldData = this.ctx.oldFormState;

        const idStack = {
            itemIds: [],
            stepFormIds: [],
            hptIds: [],
            salesDoorIds: [],
        };
        Object.values(oldData.kvFormItem).map((data) => {
            // Object.entries(data.groupItem?.form || )
            idStack.hptIds.push(data.groupItem?.hptId);
            if (data.id) idStack.itemIds.push(data.id);
            Object.values(data?.groupItem?.form || {}).map((f) => {
                idStack.itemIds.push(f.meta.salesItemId);
                idStack.salesDoorIds.push(f.doorId);
            });
        });
        Object.values(oldData.kvStepForm)?.map((stepForm) => {
            idStack.stepFormIds.push(stepForm.stepFormId);
        });
        this.ctx.data.idStack = idStack;
        this.getDeleteIds(2, idStack.itemIds);
        this.getDeleteIds(3, idStack.stepFormIds);
        this.getDeleteIds(4, idStack.hptIds);
        this.getDeleteIds(5, idStack.salesDoorIds);
    }
    public getDeleteIds(priority, idStack) {
        const stacks = this.ctx.data.stacks;
        const stackIds = stacks
            .filter((s) => s.priority == priority)
            ?.map((s) => s.updateId)
            .filter(Boolean);
        const deleteIds = idStack
            ?.filter(Boolean)
            ?.filter((s) => !stackIds.includes(s));

        if (deleteIds?.length)
            this.ctx.data.deleteStacks.push({
                ids: deleteIds,
                priority,
            });
    }
    public groupByPriorityAndId() {
        return this.ctx.data.stacks.reduce<
            Record<
                number,
                {
                    priority: any;
                    update: { id?; data? }[];
                    create: { id?; data? }[];
                }
            >
        >((acc, stack) => {
            if (!stack.priority) return acc; // Skip items without a priority
            if (!acc[stack.priority])
                acc[stack.priority] = {
                    update: [],
                    create: [],
                    priority: stack.priority,
                };
            // stack.table[stack.pr]

            const sd = { id: stack.updateId, data: stack.data };
            if (sd.id) {
                acc[stack.priority].update.push(sd); // Group under 'update' if id exists
            } else {
                acc[stack.priority].create.push(sd); // Group under 'create' if id is undefined
            }
            return acc;
        }, {});
    }
    public createStack(formData, priority) {
        if (!formData) return;
        const id = formData.id;
        const isUpdate = !formData.data?.id;
        this.ctx.data.stacks.push({
            priority,
            id,
            updateId: isUpdate ? id : null,
            data: formData.data,
        });
    }
}
type FormItem = SalesFormFields["kvFormItem"][""];
type GroupItemForm = FormItem["groupItem"]["form"][""];

// --- Content from: ai/sales-form/components-section-index.tsx ---
import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { updateComponentsSortingAction } from "@/actions/update-components-sorting";
import { DeleteRowAction } from "@/components/_v1/data-table/data-table-row-actions";
import { Icons } from "@/components/_v1/icons";
import { Menu } from "@/components/(clean-code)/menu";
import { _modal } from "@/components/common/modal/provider";
import { CustomComponentForm } from "@/components/forms/sales-form/custom-component";
import { useSortControl } from "@/hooks/use-sort-control";
import { cn } from "@/lib/utils";
import { closestCorners } from "@dnd-kit/core";
import {
  BoxSelect,
  CheckCircle,
  ExternalLink,
  Filter,
  Folder,
  Info,
  LineChart,
  LucideVariable,
  Variable,
  VariableIcon,
} from "lucide-react";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Skeleton } from "@gnd/ui/skeleton";
import { Sortable, SortableItem } from "@gnd/ui/sortable";

import {
  useFormDataStore,
  ZusComponent,
} from "../../_common/_stores/form-data-store";
import { ComponentHelperClass } from "../../_utils/helpers/zus/step-component-class";
import { zusDeleteComponents } from "../../_utils/helpers/zus/zus-step-helper";
import { ComponentImg } from "../../../../../../../components/forms/sales-form/component-img";
import { openComponentModal } from "../modals/component-form";
import { openEditComponentPrice } from "../modals/component-price-modal";
import { openSectionSettingOverride } from "../modals/component-section-setting-override";
import { openComponentVariantModal } from "../modals/component-visibility-modal";
import { openDoorPriceModal } from "../modals/door-price-modal";
import DoorSizeModal from "../modals/door-size-modal";
import { openDoorSizeSelectModal } from "../modals/door-size-select-modal/open-modal";
import { openStepPricingModal } from "../modals/step-pricing-modal";
import { UseStepContext, useStepContext } from "./molding-step-ctx";
import { CustomComponentAction } from "./custom-component.action";
import SearchBar from "./search-bar";
import { Tabs } from "@gnd/ui/custom/tabs";
import { DoorSuppliers } from "@/components/forms/sales-form/door-suppliers";
import { DoorSupplierBadge } from "@/components/forms/sales-form/door-supplier-badge";
import { SuperAdminGuard } from "@/components/auth-guard";
import { ComponentItemCard } from "../../../../../../../components/forms/sales-form/component-item-card";

interface Props {
  itemStepUid;
}
export function ComponentsSection({ itemStepUid }: Props) {
  const ctx = useStepContext(itemStepUid);
  const isDoor = ctx.cls.isDoor();
  const door = ctx.cls?.getDoorStepForm2();
  const supplier = door?.form?.formStepMeta;
  const [tab, setTab] = useState("doors");
  if (!isDoor) return <Content itemStepUid={itemStepUid} />;
  // return (
  //     <div className="grid gap-4">
  //         <div className="flex flex-1 justify-end">
  //             <DoorSupplierBadge itemStepUid={itemStepUid} />
  //         </div>
  //         <Content itemStepUid={itemStepUid} />
  //     </div>
  // );
  return (
    <SuperAdminGuard
      Fallback={
        <div className="grid gap-4">
          <div className="flex flex-1 justify-end">
            <DoorSupplierBadge itemStepUid={itemStepUid} />
          </div>
          <Content itemStepUid={itemStepUid} />
        </div>
      }
    >
      <div className="py-4">
        <Tabs name="doors" value={tab} onValueChange={setTab}>
          <Tabs.Items className="px-4">
            <Tabs.Item value="doors">
              <span>Doors</span>
              <Tabs.Content>
                <Content itemStepUid={itemStepUid} />
              </Tabs.Content>
            </Tabs.Item>
            <Tabs.Item value="suppliers">
              <span>Suppliers</span>
              <Tabs.Content>
                <div className="min-h-screen">
                  <DoorSuppliers itemStepUid={itemStepUid} />
                </div>
              </Tabs.Content>
            </Tabs.Item>
            <div className="flex flex-1 justify-end">
              <DoorSupplierBadge itemStepUid={itemStepUid} />
            </div>
          </Tabs.Items>
          {/* <TabsList>
                    <TabsTrigger value="doors">Doors</TabsTrigger>
                    <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
                </TabsList>
                <TabsContent value="doors">
                    <Content itemStepUid={itemStepUid} />
                </TabsContent> */}
        </Tabs>
      </div>
    </SuperAdminGuard>
  );
}
function Content({ itemStepUid }) {
  const ctx = useStepContext(itemStepUid);
  const { items, sticky, cls, props } = ctx;

  return (
    <div className="grid gap-4">
      <ScrollArea
        ref={sticky.containerRef}
        className="smax-h-[80vh] sm:max-h-[200vh] relative h-full p-4 pb-20"
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
          {!items.length &&
            Array(10)
              .fill(null)
              .map((_, i) => (
                <div
                  className="flex min-h-[25vh] flex-col rounded-lg border xl:min-h-[35vh]"
                  key={i}
                >
                  <Skeleton className="flex-1" />
                  <Skeleton className="h-10" />
                </div>
              ))}
          {items?.map((component, index) => (
            <Fragment key={component.id}>
              <ComponentItemCard
                ctx={ctx}
                itemIndex={index}
                key={component.uid}
                component={component}
              />
            </Fragment>
          ))}
          {/* <CustomComponent ctx={ctx} /> */}
          <CustomComponentForm itemStepUid={itemStepUid} />
        </div>

        <FloatingAction ctx={ctx} />
      </ScrollArea>
    </div>
  );
}

function FloatingAction({ ctx }: { ctx: UseStepContext }) {
  const {
    stepUid,
    items,
    sticky: { actionRef, isFixed, fixedOffset },
    selectionState,
  } = ctx;
  const isDoor = ctx.cls.isDoor();
  const zus = useFormDataStore();
  const selectionUids = () =>
    Object.entries(selectionState?.uids)
      .filter(([a, b]) => {
        return b;
      })
      .map(([a, b]) => a) as string[];
  const batchDeleteAction = useCallback(() => {
    zusDeleteComponents({
      zus,
      stepUid,
      productUid: selectionUids(),
    }).then((c) => {
      ctx.clearSelection();
      ctx.cls.refreshStepComponentsData();
    });
  }, [stepUid, ctx]);
  const editVisibility = useCallback(() => {
    const uids = selectionUids();
    openComponentVariantModal(new ComponentHelperClass(stepUid, uids[0]), uids);
    ctx.clearSelection();
  }, [selectionState, stepUid, ctx]);
  const hasSelections = ctx.cls.getItemForm()?.groupItem?.qty?.total > 0;
  return (
    <>
      <div
        ref={actionRef}
        style={isFixed ? { left: `${fixedOffset}px` } : {}}
        className={cn(
          isFixed
            ? "fixed bottom-2 sm:bottom-12 left-1/2 -translate-x-1/2 transform"
            : "absolute bottom-4 left-1/2 -translate-x-1/2 transform",
          "z-10 bg-secondary"
        )}
      >
        <div className="flex items-center gap-4 rounded-lg border p-2 px-4 shadow">
          {selectionState?.count ? (
            <>
              <span className="font-mono$ text-sm font-semibold uppercase">
                {selectionState?.count} selected
              </span>
              <SearchBar ctx={ctx} />
              <Menu>
                <Menu.Item onClick={editVisibility} icon="settings">
                  Edit Visibility
                </Menu.Item>
                <DeleteRowAction
                  menu
                  // loadingText="Delete"
                  action={batchDeleteAction}
                />
              </Menu>
              <Button
                onClick={() => {
                  ctx.clearSelection();
                }}
                size="sm"
                className="h-7 text-sm"
                variant="secondary"
              >
                Unmark all
              </Button>
            </>
          ) : (
            <>
              <span className="font-mono$ text-sm font-semibold uppercase">
                {items?.length} components
              </span>{" "}
              <SearchBar ctx={ctx} />
              <Menu Icon={Icons.menu}>
                <Menu.Item
                  Icon={Folder}
                  SubMenu={ctx.tabs?.map((tb) => (
                    <Menu.Item
                      key={tb.tab}
                      shortCut={tb.count}
                      Icon={tb.Icon}
                      onClick={() => ctx.setTab(tb.tab as any)}
                      disabled={!tb.count || tb.tab == ctx.tab}
                    >
                      {tb.title}
                    </Menu.Item>
                  ))}
                >
                  Tabs
                </Menu.Item>
                <Menu.Item onClick={() => ctx.selectAll()} Icon={BoxSelect}>
                  Select All
                </Menu.Item>
                {isDoor ? (
                  <>
                    <Menu.Item
                      icon="Export"
                      onClick={() => {
                        _modal.openModal(<DoorSizeModal cls={ctx.cls} />);
                      }}
                    >
                      Door Size Variants
                    </Menu.Item>
                  </>
                ) : (
                  <>
                    <Menu.Item
                      onClick={() => {
                        openStepPricingModal(stepUid);
                      }}
                      icon="dollar"
                    >
                      Pricing
                    </Menu.Item>
                  </>
                )}
                <Menu.Item
                  onClick={() => {
                    openComponentModal(ctx.cls);
                  }}
                  icon="add"
                >
                  Component
                </Menu.Item>
                <Menu.Item
                  onClick={() => {
                    ctx.cls.refreshStepComponentsData(true);
                  }}
                  icon="add"
                >
                  Refresh
                </Menu.Item>
                <CustomComponentAction ctx={ctx} />
              </Menu>
              {!hasSelections || (
                <>
                  <Button
                    onClick={() => {
                      ctx.cls.nextStep();
                    }}
                    size="sm"
                  >
                    Proceed
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// --- Content from: ai/sales-form/sales-pricing-utils.ts ---
import { GetPricingList } from "../data-access/sales-pricing-dta";

export function composeSalesPricing(data: GetPricingList) {
    const priceData: {
        [uid in string]: {
            [depUid in string]: {
                id;
                price;
            };
        };
    } = {};
    data.map((pricing) => {
        const uid = pricing.stepProductUid;
        const depUid = pricing.dependenciesUid || pricing.stepProductUid;
        if (!priceData[uid]) priceData[uid] = {};
        priceData[uid][depUid] = {
            id: pricing.id,
            price: pricing.price,
        };
    });
    return priceData;
}

// --- Content from: ai/sales-form/item-section.tsx ---
import { useMemo } from "react";
import { restoreMissingComponentData } from "@/actions/restore-missing-component-data";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Menu } from "@/components/(clean-code)/menu";
import { swap } from "@/lib/utils";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Input } from "@gnd/ui/input";

import { useFormDataStore } from "../_common/_stores/form-data-store";
import { ItemClass } from "../_utils/helpers/zus/item-class";
import ItemSideView from "./item-side-view";
import { StepSection } from "./step-section";

interface Props {
    uid?: string;
}
export default function ItemSection({ uid }: Props) {
    const zus = useFormDataStore();
    const zItem = zus?.kvFormItem?.[uid];

    const sequence = zus.sequence?.stepComponent?.[uid];
    return (
        <div className="mb-2 sm:rounded-lg bg-background sm:mb-4">
            <Collapsible
                open
                onOpenChange={(e) => {
                    zus.toggleItem(uid);
                }}
            >
                <ItemSectionHeader
                    ignoreCollapse={sequence?.length <= 3}
                    uid={uid}
                />
                <CollapsibleContent className="flex  overflow-auto border">
                    <div className="flex flex-1 flex-col ">
                        {sequence?.map((stepUid, index) => (
                            <StepSection
                                isFirst={index == 0}
                                isLast={sequence?.length - 1 == index}
                                key={index}
                                stepUid={stepUid}
                                ignoreCollapse={sequence?.length <= 3}
                            />
                        ))}
                    </div>
                    <ItemSideView itemUid={uid} />
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}
function ItemSectionHeader({ uid, ignoreCollapse = false }) {
    const zus = useFormDataStore();
    const cls = useMemo(() => {
        const cls = new ItemClass(uid);
        return cls;
    }, [uid]);
    const placeholder = `Item ${cls.itemIndex + 1}`;
    const formItem = cls.formItem;
    const itemSequence = zus.sequence.formItem;
    const restoreMissing = async () => {
        try {
            await restoreMissingComponentData(
                cls.formItem.id,
                cls.formItem.groupItem.hptId
            );
            toast.success(
                "Restore completed. Refresh and Save to get updated invoice."
            );
        } catch (error) {
            toast.error(error.message);
        }
    };
    return (
        <div className="flex items-center gap-4 border p-2 px-4">
            <CollapsibleTrigger asChild className="flex-1">
                <div
                    className="flex "
                    onClick={(e) => {
                        e.preventDefault();
                    }}
                >
                    <Input
                        value={formItem?.title}
                        onChange={(e) => {
                            zus.updateFormItem(uid, "title", e.target.value);
                        }}
                        className="h-8 uppercase"
                        placeholder={placeholder}
                    />
                </div>
            </CollapsibleTrigger>
            {ignoreCollapse || (
                <Button
                    onClick={() => {
                        zus.updateFormItem(
                            uid,
                            "collapsed",
                            !formItem.collapsed
                        );
                    }}
                    className="h-8"
                    size="sm"
                    variant={formItem?.collapsed ? "default" : "secondary"}
                >
                    {formItem.collapsed ? "Expand" : "Collapse"}
                </Button>
            )}
            <Menu>
                <Menu.Item onClick={restoreMissing} icon="copy">
                    Component Doors Restore
                </Menu.Item>
                <Menu.Item icon="copy">Make Copy</Menu.Item>
                <Menu.Item
                    disabled={itemSequence?.length <= 1}
                    icon="move2"
                    SubMenu={itemSequence?.map((seq, ind) => (
                        <Menu.Item
                            onClick={() => {
                                let sequence = zus.sequence.formItem;
                                let currentIndex = cls.itemIndex;
                                let newIndex = ind;
                                swap(sequence, currentIndex, newIndex);
                                zus.dotUpdate("sequence.formItem", sequence);
                            }}
                            key={seq}
                            disabled={ind == cls.itemIndex}
                        >
                            {ind + 1}
                        </Menu.Item>
                    ))}
                >
                    Move To
                </Menu.Item>
            </Menu>
            <ConfirmBtn
                trash
                size="icon"
                onClick={() => {
                    cls.deleteItem();
                }}
            />
        </div>
    );
}

// --- Content from: ai/sales-form/shelf-items.tsx ---
"use client";

import React, { useDeferredValue, useEffect, useState } from "react";
import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import { AnimatedNumber } from "@/components/animated-number";
import Button from "@/components/common/button";
import { ShelfContext, useShelf, useShelfContext } from "@/hooks/use-shelf";
import {
    ShelfItemContext,
    useShelfItem,
    useShelfItemContext,
} from "@/hooks/use-shelf-item";
import { _useAsync } from "@/lib/use-async";

import {
    Combobox,
    ComboboxAnchor,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxTrigger,
} from "@gnd/ui/combobox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { ClearCategoryModal } from "./clear-category";
import { ShelfItemCategoryInput } from "./shelf-item-category-input";
import { ShelfPriceCell } from "./shelf-price-cell";
import { ShelfQtyInput } from "./shelf-qty-input";

export function ShelfItems({ itemStepUid }) {
    const ctx = useShelfContext(itemStepUid);
    return (
        <ShelfContext.Provider value={ctx}>
            {/*  */}
            <div className="">
                <Table className="size-sm">
                    <TableBody>
                        {ctx.shelfItemUids?.map((uid, index) => (
                            <ShelfItemLine
                                index={index}
                                key={uid}
                                shelfUid={uid}
                                isLast={ctx.shelfItemUids?.length - 1 == index}
                            />
                        ))}
                    </TableBody>
                </Table>
                <div className="w-full border-t  p-4">
                    <Button
                        onClick={() => {
                            ctx.newSection();
                        }}
                        className=""
                        size="xs"
                    >
                        <Icons.add className="size-4" />
                        Item Section
                    </Button>
                </div>
            </div>
        </ShelfContext.Provider>
    );
}
export function ShelfItemLine({ shelfUid, index, isLast }) {
    const zus = useFormDataStore();
    const { itemUid, categories } = useShelf();
    const ctx = useShelfItemContext({ shelfUid });
    const { categoryIds, setCategoryIds, filteredTricks, inputValue } = ctx;
    // const [categoryIds, setCategoryIds] = React.useState<string[]>([]);
    const [open, onOpenChange] = useState(false);
    const [openClearCat, setOpenClearCat] = useState(false);

    return (
        <ShelfItemContext.Provider value={ctx}>
            <TableRow className="hover:bg-transparent">
                <TableCell className="flex flex-col">
                    <Table>
                        {index > 0 || (
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Category</TableHead>
                                </TableRow>
                            </TableHeader>
                        )}
                        <TableBody>
                            <TableRow>
                                <TableCell>
                                    <ShelfItemCategoryInput />
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableCell>
                <TableCell className="w-[70%] p-0">
                    <div className="flex flex-col">
                        <Table className="">
                            {index > 0 || (
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Qty</TableHead>
                                        <TableHead align="right">
                                            Total
                                        </TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                            )}
                            <TableBody>
                                {ctx.productUids?.map((puid, puidIndex) => (
                                    <ShelfItemProduct
                                        isLast={
                                            isLast &&
                                            ctx.productUids?.length - 1 ==
                                                puidIndex
                                        }
                                        prodUid={puid}
                                        key={puid}
                                    />
                                ))}
                                <TableRow>
                                    <TableCell>
                                        <div className="flex justify-end">
                                            <Button
                                                onClick={() => {
                                                    ctx.addProduct();
                                                }}
                                            >
                                                <Icons.add className="size-4" />
                                                Add Product
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </TableCell>
            </TableRow>
        </ShelfItemContext.Provider>
    );
}
function ShelfItemProduct({ prodUid, isLast }) {
    const itemCtx = useShelfItem();
    const shelf = useShelf();
    const { productsList: products } = itemCtx;
    const product = itemCtx.products?.[prodUid];
    const { basePrice, salesPrice, qty, customPrice } = product || {};
    useEffect(() => {
        let _salesPrice = Number.isInteger(customPrice)
            ? customPrice
            : salesPrice || 0;
        let totalPrice = qty * _salesPrice;
        // itemCtx.dotUpdateProduct(prodUid, "totalPrice", totalPrice);
        shelf.costCls.updateShelfCosts(shelf.itemUid);
    }, [basePrice, qty, customPrice, prodUid]);
    const [open, onOpenChange] = useState(false);
    const [inputValue, setInputValue] = React.useState(product?.title || "");
    const deferredInputValue = useDeferredValue(inputValue);
    const [isTyping, setIsTyping] = useState(false);
    const filteredProducts = React.useMemo(() => {
        if (!deferredInputValue || !isTyping) return products?.products;
        const normalized = deferredInputValue.toLowerCase();
        const __products = products?.products?.filter((item) =>
            item.title.toLowerCase().includes(normalized)
        );
        return __products;
    }, [deferredInputValue, products, isTyping]);
    const [content, setContent] = React.useState<React.ComponentRef<
        typeof ComboboxContent
    > | null>(null);
    const onInputValueChange = React.useCallback(
        (value: string) => {
            setInputValue(value);
            if (content) {
                (content as any).scrollTop = 0; // Reset scroll position
                //  virtualizer.measure();
            }
        },
        [content]
    );

    return (
        <TableRow className="w-2/3 hover:bg-transparent">
            <TableCell>
                <Combobox
                    open={open}
                    onOpenChange={onOpenChange}
                    value={String(product?.productId)}
                    onValueChange={(e) => {
                        itemCtx.productChanged(prodUid, e);
                        setTimeout(() => {
                            if (e) onOpenChange(false);
                        }, 100);
                    }}
                    inputValue={inputValue}
                    onInputValueChange={onInputValueChange}
                    manualFiltering
                    className="w-full"
                    autoHighlight
                >
                    <ComboboxAnchor className="relative h-full min-h-10 flex-wrap px-3 py-2">
                        <ComboboxInput
                            className="h-auto min-w-20 flex-1 "
                            onFocus={(e) => {
                                onOpenChange(true);
                                setIsTyping(false);
                            }}
                            onBlur={() => {
                                setIsTyping(false);
                            }}
                            onKeyDown={(e) => {
                                setIsTyping(true);
                            }}
                            placeholder="Select product..."
                        />
                        {!product?.productId || (
                            <ComboboxTrigger
                                onClick={(e) => {
                                    e.preventDefault();
                                    setInputValue("");
                                    itemCtx.clearProduct(prodUid);
                                }}
                                className="absolute right-2 top-3"
                            >
                                <Icons.X className="h-4 w-4" />
                            </ComboboxTrigger>
                        )}
                    </ComboboxAnchor>

                    <ComboboxContent
                        ref={(node) => setContent(node as any)}
                        className="relative max-h-[300px] overflow-y-auto overflow-x-hidden"
                    >
                        <ComboboxEmpty>No product found</ComboboxEmpty>
                        {filteredProducts?.map((trick) => (
                            <ComboboxItem
                                key={String(trick.id)}
                                value={String(trick.id)}
                                outset
                            >
                                {trick.title}
                            </ComboboxItem>
                        ))}
                    </ComboboxContent>
                </Combobox>
            </TableCell>
            <TableCell className="w-24">
                <ShelfPriceCell prodUid={prodUid} product={product} />
            </TableCell>
            <TableCell className="w-16">
                <ShelfQtyInput prodUid={prodUid} value={product?.qty} />
            </TableCell>
            <TableCell className="relative w-24">
                <AnimatedNumber value={product?.totalPrice || 0} />
                {/* {!isLast || <Footer />} */}
            </TableCell>
            <TableCell className="w-24">
                <ConfirmBtn
                    trash
                    onClick={() => {
                        itemCtx.deleteProductLine(prodUid);
                    }}
                />
            </TableCell>
        </TableRow>
    );
}
function Footer() {
    return (
        <div className="absolute">
            <AnimatedNumber value={100} />
        </div>
    );
}

// --- Content from: ai/sales-form/step-section.tsx ---
import { useEffect, useMemo, useRef } from "react";
import { Env } from "@/components/env";
import { ShelfItems } from "@/components/forms/sales-form/shelf-items";
import { useIsVisible } from "@/hooks/use-is-visible";
import { formatMoney } from "@/lib/use-number";
import { motion } from "framer-motion";

import { Badge } from "@gnd/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Label } from "@gnd/ui/label";

import { useFormDataStore } from "../_common/_stores/form-data-store";
import { StepHelperClass } from "../_utils/helpers/zus/step-component-class";
import { ComponentsSection } from "./components-section";
import MouldingLineItem from "./moulding-step";
import ServiceLineItem from "./service-step";
import { HptSection } from "@/components/forms/sales-form/hpt/hpt-section";
import { MouldingContent } from "@/components/forms/sales-form/moulding-and-service/moulding-content";

interface Props {
    stepUid?;
    isFirst;
    isLast;
    ignoreCollapse?;
}
export function StepSection({
    stepUid,
    isFirst,
    ignoreCollapse,
    isLast,
}: Props) {
    const zus = useFormDataStore();
    // const stepForm = zus?.kvStepForm?.[stepUid];
    const [uid] = stepUid?.split("-");
    const zItem = zus?.kvFormItem?.[uid];
    const { cls, Render, itemStepUid } = useMemo(() => {
        const cls = new StepHelperClass(stepUid);
        const renderer = {
            isHtp: cls.isHtp(),
            isShelfItems: cls.isShelfItems(),
            isMouldingLineItem: cls.isMouldingLineItem(),
            isServiceLineItem: cls.isServiceLineItem(),
        };
        const ret = {
            cls,
            ...renderer,
            Render: ComponentsSection as any,
            itemStepUid: stepUid,
        };

        if (ret.isHtp) ret.Render = HptSection;
        else if (ret.isShelfItems) ret.Render = ShelfItems;
        // else if (ret.isMouldingLineItem) ret.Render = MouldingContent;
        else if (ret.isMouldingLineItem) ret.Render = MouldingLineItem;
        else if (ret.isServiceLineItem) ret.Render = ServiceLineItem;
        return ret;
    }, [
        stepUid,
        // , zus
    ]);
    if (
        (!zItem.collapsed && zus.currentTab == "invoice") ||
        (zItem.collapsed && (isFirst || isLast)) ||
        ignoreCollapse
    )
        // return <>{stepUid}|</>;
        return (
            <div>
                <div className="">
                    <Collapsible open={zItem.currentStepUid == stepUid}>
                        <StepSectionHeader cls={cls} />
                        <CollapsibleContent className="flex">
                            <Content>
                                <Render itemStepUid={stepUid} />
                            </Content>
                        </CollapsibleContent>
                    </Collapsible>
                </div>
            </div>
        );
}
function Content({ children }) {
    const { isVisible, elementRef } = useIsVisible({});
    useEffect(() => {
        setTimeout(() => {
            if (!isVisible && elementRef.current) {
                const offset = -150; // Adjust this value to your desired offset
                const elementPosition =
                    elementRef.current.getBoundingClientRect().top +
                    window.scrollY;
                const offsetPosition = elementPosition + offset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth",
                });
            }
        }, 300);
    }, []);

    return (
        <motion.div
            ref={elementRef}
            transition={{ duration: 1 }}
            className="w-full"
        >
            {children}
        </motion.div>
    );
}

function StepSectionHeader({ cls }: { cls: StepHelperClass }) {
    const zus = useFormDataStore();
    const stepForm = zus?.kvStepForm?.[cls.itemStepUid];
    //   const cls = useMemo(() => ctx.cls.hasSelections(), [ctx.cls]);
    const { ...stat } = useMemo(() => {
        // const cls = new StepHelperClass(stepUid);
        return {
            hasSelection: cls.hasSelections(),
            selectionCount: cls.getTotalSelectionsCount(),
            selectionQty: cls.getTotalSelectionsQty(),
        };
    }, [cls.itemStepUid]);

    return (
        <CollapsibleTrigger asChild>
            <div className="border border-muted-foreground/20 dark:border-muted-foreground">
                <button
                    className="flex h-8 w-full items-center gap-4 space-x-2  bg-muted-foreground/5 p-1 px-4 text-sm uppercase hover:bg-muted-foreground hover:text-muted"
                    onClick={(e) => {
                        e.preventDefault();
                        cls.toggleStep();
                    }}
                >
                    <Label>{stepForm?.title}</Label>
                    <div className="flex-1"></div>
                    <span className="font-mono$">{stepForm.value}</span>
                    {stepForm.salesPrice ? (
                        <Badge variant="destructive" className="h-5 px-1">
                            ${formatMoney(stepForm.salesPrice)}
                        </Badge>
                    ) : null}
                    {!stat.hasSelection || (
                        <>
                            <Badge variant="destructive" className="h-5 px-1">
                                selection: {stat.selectionCount}
                            </Badge>
                            <Badge variant="destructive" className="h-5 px-1">
                                qty: {stat.selectionQty}
                            </Badge>
                        </>
                    )}
                </button>
            </div>
        </CollapsibleTrigger>
    );
}

// --- Content from: ai/sales-form/costing-class.ts ---
import { dotObject, dotSet } from "@/app/(clean-code)/_common/utils/utils";
import { PricingMetaData } from "@/app/(clean-code)/(sales)/types";
import { formatMoney } from "@/lib/use-number";
import { addPercentage, dotArray, percentageValue, sum } from "@/lib/utils";
import { toast } from "sonner";

import { ZusGroupItem } from "../../../_common/_stores/form-data-store";
import { SettingsClass } from "./settings-class";
import { laborRate } from "@/utils/sales-utils";

export class CostingClass {
    constructor(public setting?: SettingsClass) {}
    public get salesMultiplier() {
        return this.setting.dotGet("metaData.salesMultiplier") || 1;
    }
    public calculateSales(price) {
        if (!price) return price;

        const value = formatMoney(price * this.salesMultiplier);
        return value;
    }
    public calculateCost(sales) {
        return formatMoney(sales / this.salesMultiplier);
    }
    public salesProfileChanged() {
        const profile = this.setting.currentProfile();
        const multiplier = profile?.coefficient
            ? formatMoney(1 / profile.coefficient)
            : 1;
        this.setting.zus.dotUpdate("metaData.salesMultiplier", multiplier);
        // this.updateAllGroupedCost();
        Object.entries(this.setting.zus.kvFormItem).map(([itemUid, data]) => {
            this.updateComponentCost(itemUid, true);
        });
        // this.calculateTotalPrice();
        toast.success("Price updated");
    }

    public taxList() {
        return this.setting.dotGet("_taxForm.taxList");
    }
    public shelfItemCostUpdated(itemUid, salesPrice, productId) {
        const data = this.setting.zus;
        if (this.setting.staticZus) return;
        Object.entries(data.kvFormItem).map(([k, formData]) => {
            let subTotal = 0;
            const shelfItems = formData?.shelfItems;
            shelfItems?.lineUids?.map((uid) => {
                const line = shelfItems.lines?.[uid];
                line?.productUids?.map((puid) => {
                    const prod = line?.products?.[uid];
                    if (prod && prod.productId == productId) {
                        prod.salesPrice = salesPrice;

                        prod.totalPrice = formatMoney(
                            prod.salesPrice * prod.qty
                        );
                        data?.dotUpdate(
                            `kvFormItem.${k}.shelfItems.lines.${uid}.products.${puid}`,
                            prod
                        );
                    }
                    subTotal += Number(prod?.totalPrice || 0);
                });
                data?.dotUpdate(
                    `kvFormItem.${k}.shelfItems.subTotal`,
                    subTotal
                );
            });
        });
        this.calculateTotalPrice();
    }
    public updateShelfCosts(
        itemUid = this.setting.itemUid,
        forceUpdate = false
    ) {
        const data = this.setting.zus;
        if (this.setting.staticZus) return;
        const shelf = data.kvFormItem[itemUid]?.shelfItems;
        let subTotal = 0;
        shelf?.lineUids.map((uid) => {
            const line = shelf?.lines?.[uid];
            line?.productUids?.map((puid) => {
                let prod = line?.products?.[puid];
                if (!prod) return;
                // let oldTotal = prod.totalPrice;
                prod.salesPrice = this.calculateSales(prod.basePrice);
                let price = prod.salesPrice;
                if (prod.customPrice) {
                    price = prod.customPrice;
                }
                prod.totalPrice = formatMoney(price * prod.qty);
                data.dotUpdate(
                    `kvFormItem.${itemUid}.shelfItems.lines.${uid}.products.${puid}`,
                    prod
                );
                subTotal += prod.totalPrice;
            });
        });
        data.dotUpdate(`kvFormItem.${itemUid}.shelfItems.subTotal`, subTotal);
        this.calculateTotalPrice();
    }
    public groupComponentCost(groupItem, itemUid) {
        const data = this.setting.zus;
        let totalBasePrice = 0;
        let totalFlatRate = 0;
        Object.entries(data.kvStepForm).map(([k, stepData]) => {
            if (k.startsWith(`${itemUid}-`)) {
                if (!stepData.flatRate)
                    totalBasePrice += stepData?.basePrice || 0;
                else totalFlatRate += stepData?.basePrice || 0;
            }
        });
        const ds = dotSet(groupItem);
        ds.set("pricing.components.basePrice", totalBasePrice);
        ds.set(
            "pricing.components.salesPrice",
            this.calculateSales(totalBasePrice)
        );
        ds.set("pricing.flatRate", totalFlatRate);
    }
    public updateComponentCost(
        itemUid = this.setting.itemUid,
        forceUpdate = false
    ) {
        const data = this.setting.zus;
        // if (this.setting.staticZus) return;
        const itemForm = data.kvFormItem[itemUid];
        if (itemForm?.shelfItems?.lineUids) {
            this.updateShelfCosts(itemUid, forceUpdate);
            return;
        }
        let totalBasePrice = 0;
        let totalFlatRate = 0;

        Object.entries(data.kvStepForm).map(([k, stepData]) => {
            if (k.startsWith(`${itemUid}-`)) {
                if (!stepData.flatRate)
                    totalBasePrice += stepData?.basePrice || 0;
                else totalFlatRate += stepData?.basePrice || 0;
            }
        });
        const totalSalesPrice = this.calculateSales(totalBasePrice);

        const pricing = itemForm?.groupItem?.pricing;
        if (
            ((totalBasePrice ||
                pricing?.components?.basePrice ||
                totalFlatRate ||
                pricing?.flatRate) &&
                (pricing?.components?.basePrice != totalBasePrice ||
                    pricing?.flatRate != totalFlatRate)) ||
            forceUpdate
        ) {
            // update component price
            let groupItem = itemForm.groupItem;
            if (!groupItem)
                groupItem = {
                    itemType: this.setting.getItemType(),
                    form: {},
                    itemIds: [],
                    qty: {},
                    pricing: {
                        flatRate: totalFlatRate,
                        components: {
                            basePrice: totalBasePrice,
                            salesPrice: totalSalesPrice,
                        },
                        total: {},
                    },
                };
            else {
                const ds = dotSet(groupItem);
                ds.set("pricing.components.basePrice", totalBasePrice);
                ds.set("pricing.flatRate", totalFlatRate);
                ds.set("pricing.components.salesPrice", totalSalesPrice);
            }

            if (groupItem.form)
                Object.entries(groupItem.form || {}).map(([k, kform]) => {
                    // groupItem.pricing.flatRate
                    if (kform.pricing?.itemPrice)
                        kform.pricing.itemPrice.salesPrice =
                            this.calculateSales(
                                kform.pricing.itemPrice?.basePrice
                            );
                });
            this.saveGroupItem(groupItem, itemUid);
            this.updateGroupedCost(itemUid);
            this.calculateTotalPrice();
        }
    }
    public updateGroupedCost(itemUid = this.setting.itemUid) {
        const data = this.setting.zus;

        const itemForm = data.kvFormItem[itemUid];
        let groupItem = itemForm.groupItem;
        if (!groupItem) return;
        if (!groupItem.pricing)
            groupItem.pricing = {
                flatRate: 0,
                components: {
                    basePrice: 0,
                    salesPrice: 0,
                },
                total: {
                    basePrice: 0,
                    salesPrice: 0,
                },
            };

        this.estimateGroupPricing(groupItem, itemUid);
    }
    public estimateGroupPricing(
        groupItem: ZusGroupItem,
        itemUid = this.setting.itemUid
    ) {
        groupItem.pricing.total = {
            // flatRate: 0,
            basePrice: 0,
            salesPrice: 0,
        };
        this.groupComponentCost(groupItem, itemUid);
        let noHandle = this.setting.getRouteConfig(itemUid)?.noHandle;
        Object.entries(groupItem?.form).map(([uid, formData]) => {
            const handleSum = sum([formData.qty.lh, formData.qty.rh]);
            const qty = noHandle ? formData.qty?.total || handleSum : handleSum;
            if (noHandle) formData.qty.lh = formData.qty.rh = 0;
            formData.qty.total = qty;
            this.getEstimatePricing(groupItem, formData);
        });
        this.saveGroupItem(groupItem, itemUid);
    }
    public saveGroupItem(groupItem, itemUid) {
        const staticData = this.setting.staticZus;
        if (!staticData)
            this.setting.zus.dotUpdate(
                `kvFormItem.${itemUid}.groupItem`,
                groupItem
            );
        else staticData.kvFormItem[itemUid].groupItem = groupItem;
    }
    public getEstimatePricing(gi, fd) {
        const zus = this.setting.zus;
        let groupItem: (typeof zus.kvFormItem)[number]["groupItem"] = gi;
        let formData: (typeof groupItem)["form"][number] = fd;
        const cPrice = formData.pricing?.customPrice as any;
        console.log({ cPrice, groupItem });
        const customPricing = cPrice || (cPrice == 0 && cPrice !== "");
        const pll = [
            groupItem?.pricing?.components?.salesPrice,
            formData?.pricing?.itemPrice?.salesPrice,
            groupItem?.pricing?.flatRate,
        ];
        const pl = customPricing ? cPrice : sum(pll);

        const priceList = [pl, formData.pricing?.addon];
        const unitPrice = sum(priceList);
        const qty = Number(formData.qty.total);
        if (!formData.pricing) formData.pricing = {} as any;
        formData.pricing.laborQty = qty;

        const totalPrice = formatMoney(sum(priceList) * qty);
        formData.pricing.unitPrice = unitPrice;
        formData.pricing.totalPrice = totalPrice;

        if (formData.selected)
            groupItem.pricing.total.salesPrice += formData.pricing.totalPrice;
        return {
            unitPrice,
            totalPrice,
        };
    }
    public updateAllGroupedCost() {
        const data = this.setting.zus;
        Object.entries(data.kvFormItem).map(([itemUid, itemData]) => {
            this.updateGroupedCost(itemUid);
        });
        this.calculateTotalPrice();
    }
    public softCalculateTotalPrice(overrides: PricingMetaData = {}) {
        const data = this.setting.zus;

        const estimate = {
            ...data.metaData.pricing,
            ...overrides,
        };

        // const extraDiscount = data?.metaData?.extraCosts?.Discount?.amount;
        const extraDiscount = sum(
            data?.metaData?.extraCosts?.filter((a) => a.type == "Discount"),
            "amount"
        );
        const discount = extraDiscount || Number(estimate.discount) || 0;
        const taxxableDiscount = Math.min(discount, estimate.taxxable);
        const nonTaxxableDiscount =
            taxxableDiscount == estimate.taxxable &&
            discount != taxxableDiscount
                ? sum([discount, -1 * taxxableDiscount])
                : 0;
        let subTotalAfterDiscount = sum([estimate.subTotal, discount * -1]);

        let taxxable = sum([estimate.taxxable, -1 * taxxableDiscount]);
        const taxProfile = this.currentTaxProfile();
        estimate.taxValue = taxProfile
            ? percentageValue(taxxable, taxProfile.percentage)
            : 0;
        const subGrandTot = sum([subTotalAfterDiscount, estimate.taxValue]);

        const Labor = sum(
            Object.entries(data.kvFormItem).map(([itemUid, itemData]) => {
                return sum(
                    Object.entries(itemData?.groupItem?.form || {}).map(
                        ([k, d]) =>
                            sum([d?.pricing?.laborQty]) *
                            sum([
                                laborRate(
                                    data?.metaData?.salesLaborConfig?.rate,
                                    d?.pricing?.unitLabor
                                ),
                            ])
                    )
                );
            })
        );

        const extraCosts = sum(
            data.metaData.extraCosts
                ?.filter(
                    (a) =>
                        a.type != "CustomTaxxable" &&
                        a.type != "Discount" &&
                        a.type != "Labor"
                )
                .map((a) => a.amount)
        );
        if (data.metaData.paymentMethod == "Credit Card") {
            estimate.ccc = percentageValue(
                sum([subGrandTot, extraCosts, Labor]),
                3
            );
        } else estimate.ccc = 0;
        estimate.grandTotal = formatMoney(
            sum([
                estimate.labour,
                estimate.delivery,
                Labor,
                extraCosts,
                subGrandTot,
                estimate.ccc || 0,
            ])
        );
        const labor = this.getLaborCosts();
        if (labor.index > -1)
            if (this.setting?.staticZus) {
                this.setting.staticZus.metaData.pricing = estimate;
                this.setting.staticZus.metaData.extraCosts[labor.index].amount =
                    Labor;
            } else {
                this.setting.zus.dotUpdate("metaData.pricing", estimate);
                this.setting.zus.dotUpdate(
                    `metaData.extraCosts.${labor?.index}.amount`,
                    Labor
                );
            }
    }
    public calculateTotalPrice() {
        const data = this.setting.zus;
        const estimate = {
            subTotal: 0,
            taxxable: 0,
        };
        Object.entries(data.kvFormItem).map(([itemUid, itemData]) => {
            const groupItem = itemData.groupItem;
            if (itemData.shelfItems) {
                const shelfSubTotal = Number(
                    itemData.shelfItems?.subTotal || 0
                );
                estimate.subTotal += shelfSubTotal;
                estimate.taxxable += shelfSubTotal;
            } else
                Object.entries(groupItem?.form || {}).map(([uid, formData]) => {
                    if (!formData.selected) return;
                    const isService = groupItem.type == "SERVICE";
                    const price = Number(formData.pricing?.totalPrice || 0);
                    const taxxable =
                        !isService || (isService && formData.meta.taxxable);
                    estimate.subTotal += price;
                    if (taxxable) estimate.taxxable += price;
                });
        });
        this.softCalculateTotalPrice(estimate);
    }
    public currentTaxProfile() {
        return this.setting.zus.metaData?.tax;
    }
    public getLaborCosts() {
        const cost = this.setting.zus?.metaData?.extraCosts?.find(
            (a) => a.type == "Labor"
        );
        const index = this.setting.zus.metaData.extraCosts.indexOf(cost);
        return { cost, index };
    }
    public taxCodeChanged() {
        const taxProfile = this.taxList().find(
            (tax) => tax.taxCode == this.setting.dotGet("metaData.tax.taxCode")
        );
        // this.setting?.zus.dotUpdate("metaData.tax.taxCode", taxProfile.taxCode);
        this.setting?.zus.dotUpdate("metaData.tax.title", taxProfile?.title);
        this.setting?.zus.dotUpdate(
            "metaData.tax.percentage",
            taxProfile?.percentage
        );

        this.calculateTotalPrice();
    }
}

// --- Content from: ai/sales-form/hpt-section.tsx ---
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import Money from "@/components/_v1/money";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Menu } from "@/components/(clean-code)/menu";
import { AnimatedNumber } from "@/components/animated-number";
import { WageInput } from "@/components/forms/sales-form/hpt/wage-input";
import { cn } from "@/lib/utils";
import { Notebook, Repeat } from "lucide-react";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { DropdownMenuShortcut } from "@gnd/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { Door } from "./hpt-door";

import {
    HptContext,
    HptContextProvider,
    HptLineContextProvider,
    useHpt,
    useHptLine,
} from "@/components/forms/sales-form/context";
import { PriceEstimateCell } from "@/components/forms/sales-form/hpt/price-estimate-cell";
import { HptNote } from "@/components/forms/sales-form/hpt/hpt-note";
import {
    LineInput,
    LineSwitch,
} from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/line-input";
import { HptAddDoorSize } from "./hpt-add-door-size";
import { Checkbox } from "@gnd/ui/checkbox";

interface Props {
    itemStepUid;
}
export function HptSection({ itemStepUid }: Props) {
    return (
        <HptContextProvider
            args={[
                {
                    itemStepUid,
                },
            ]}
        >
            <Content />
        </HptContextProvider>
    );
}
function Content() {
    const ctx = useHpt();
    return (
        <div className="">
            <Tabs
                onValueChange={(e) => {
                    ctx.hpt.tabChanged(e);
                    // ctx.setTab(e);
                }}
                value={ctx.hpt.tabUid}
            >
                <TabsList className="bg-transparent">
                    {ctx.doors?.map((door) => (
                        <TabsTrigger
                            asChild
                            key={door.uid}
                            value={door.uid}
                            className="bg-white p-0"
                        >
                            <div className="">
                                <Button
                                    size="xs"
                                    className={cn(
                                        "border-b-2 border-b-transparent uppercase",
                                        ctx.hpt.tabUid == door.uid &&
                                            "rounded-b-none border-muted-foreground"
                                    )}
                                    variant={
                                        ctx.hpt.tabUid == door.uid
                                            ? "secondary"
                                            : "ghost"
                                    }
                                >
                                    <TextWithTooltip
                                        className="max-w-[260px]"
                                        text={door.title}
                                    />
                                </Button>
                                <div
                                    className={cn(
                                        // ctx.hpt.tabUid != door.uid &&
                                        "hidden"
                                    )}
                                >
                                    <Menu>
                                        <Menu.Item Icon={Repeat}>
                                            Swap Door
                                        </Menu.Item>
                                    </Menu>
                                </div>
                            </div>
                        </TabsTrigger>
                    ))}
                </TabsList>
                {ctx.doors?.map((door, i) => (
                    <TabsContent key={door.uid} value={door.uid}>
                        <DoorSizeTable door={door} sn={i + 1} />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
interface DoorSizeTable {
    door: HptContext["doors"][number];
    sn;
}
function DoorSizeTable({ door, sn }: DoorSizeTable) {
    const ctx = useHpt();

    const itemType = ctx?.hpt?.getItemForm()?.groupItem?.itemType;
    const isSlab = itemType === "Door Slabs Only";
    return (
        <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-4">
            <div className="xl:col-span-3">
                <Table className="table-fixed   p-4 font-medium">
                    <TableHeader className="text-xs">
                        <TableRow className="uppercase">
                            <TableHead className="font-mono$ w-8">#</TableHead>
                            <TableHead className="w-36">Size</TableHead>
                            {ctx.config.hasSwing && (
                                <TableHead className="w-28">Swing</TableHead>
                            )}
                            {!isSlab || (
                                <TableHead className="w-16">PROD</TableHead>
                            )}
                            {ctx.config.noHandle ? (
                                <TableHead
                                    className="w-24 text-center"
                                    align="center"
                                >
                                    <span className="">Qty</span>
                                </TableHead>
                            ) : (
                                <>
                                    <TableHead className="w-24">Lh</TableHead>
                                    <TableHead className="w-24">Rh</TableHead>
                                </>
                            )}
                            <TableHead className="w-28">Estimate</TableHead>
                            <TableHead className="w-28 whitespace-nowrap">
                                Labor/Qty
                            </TableHead>
                            {/* <TableHead className="w-28">Addon/Qty</TableHead> */}
                            <TableHead className="w-28">Line Total</TableHead>
                            <TableHead className=""></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {door.sizeList.map((sl, i) => (
                            <DoorSizeRow
                                doorIndex={sn - 1}
                                sn={i + 1}
                                lineUid={sl.path}
                                key={i}
                            />
                        ))}
                    </TableBody>
                    <TableFooter className="bg-accent">
                        <TableRow>
                            <TableCell>
                                <HptAddDoorSize doorIndex={sn - 1} />
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
            <div className="hidden xl:block">
                <Door door={door} />
            </div>
        </div>
    );
}
function DoorSizeRow({ lineUid, sn, doorIndex }: { lineUid; sn; doorIndex }) {
    return (
        <HptLineContextProvider
            args={[
                {
                    lineUid,
                    sn,
                },
            ]}
        >
            <DoorSizeRowContent doorIndex={doorIndex} sizeIndex={sn - 1} />
        </HptLineContextProvider>
    );
}
function DoorSizeRowContent({ doorIndex, sizeIndex }) {
    const ctx = useHpt();
    const line = useHptLine();
    const { lineUid, zDoor, sizeForm, size, sn, valueChanged } = line;
    const { isSlab, showNote, setShowNote } = ctx;

    if (!zDoor?.selected) return <></>;
    // return (
    //     <tr>
    //         <td colSpan={7}>
    //             {JSON.stringify({
    //                 zDoor,
    //                 sizeForm,
    //                 lineUid,
    //                 size,
    //                 priceList: ctx?.door?.sizePrice?.[0]?.path,
    //             })}
    //         </td>
    //     </tr>
    // );

    return (
        <>
            <TableRow
                className={cn(
                    // !sizeForm?.selected && "hidden",
                    "hover:bg-transparent"
                )}
            >
                <TableCell className="font-mono$"></TableCell>
                <TableCell className="font-mono$ text-sm font-semibold">
                    {size.size}
                </TableCell>
                {!isSlab || (
                    <TableCell>
                        <LineSwitch
                            cls={ctx.hpt}
                            name="prodOverride.production"
                            lineUid={lineUid}
                        />
                    </TableCell>
                )}
                {ctx.config.hasSwing && (
                    <TableCell>
                        <LineInput
                            cls={ctx.hpt}
                            name="swing"
                            lineUid={lineUid}
                        />
                    </TableCell>
                )}
                {ctx.config.noHandle ? (
                    <TableCell>
                        <LineInput
                            cls={ctx.hpt}
                            name="qty.total"
                            lineUid={lineUid}
                            className="w-16 text-center"
                            type="number"
                            valueChanged={valueChanged}
                            mask
                            qtyInputProps={{
                                min: 0,
                            }}
                        />
                    </TableCell>
                ) : (
                    <>
                        <TableCell className="">
                            <LineInput
                                cls={ctx.hpt}
                                name="qty.lh"
                                lineUid={lineUid}
                                type="number"
                                valueChanged={valueChanged}
                                mask
                                qtyInputProps={{
                                    min: 0,
                                }}
                            />
                        </TableCell>
                        <TableCell className="">
                            <LineInput
                                cls={ctx.hpt}
                                name="qty.rh"
                                lineUid={lineUid}
                                type="number"
                                valueChanged={valueChanged}
                                mask
                                qtyInputProps={{
                                    min: 1,
                                }}
                            />
                        </TableCell>
                    </>
                )}
                <TableCell className="">
                    <PriceEstimateCell />
                </TableCell>
                <TableCell>
                    <WageInput />
                </TableCell>
                <TableCell>
                    <AnimatedNumber value={zDoor?.pricing?.totalPrice || 0} />
                </TableCell>
                <TableCell
                    align="right"
                    className="flex items-center justify-end"
                >
                    <Button
                        variant={showNote ? "default" : "outline"}
                        size="xs"
                        className=""
                        onClick={(e) => {
                            setShowNote(!showNote);
                        }}
                    >
                        <Notebook className="size-4" />
                    </Button>
                    <ConfirmBtn
                        disabled={ctx.hpt.selectCount == 1}
                        onClick={() => {
                            ctx.hpt.removeGroupItem(size.path);
                        }}
                        trash
                        size="icon"
                    />
                </TableCell>
            </TableRow>
            <HptNote />
        </>
    );
}

// --- Content from: ai/sales-form/zus-form-helper.ts ---
import { GetSalesBookForm } from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import {
    DykeDoorType,
    SalesFormZusData,
} from "@/app/(clean-code)/(sales)/types";
import { formatMoney } from "@/lib/use-number";
import { generateRandomString } from "@/lib/utils";
import dayjs from "dayjs";

import { getFormState } from "../../../_common/_stores/form-data-store";
import { CostingClass } from "./costing-class";
import { SettingsClass } from "./settings-class";
import { StepHelperClass } from "./step-component-class";

export function zhInitializeState(data: GetSalesBookForm, copy = false) {
    const profile = data.order?.id
        ? data.salesProfile
        : data.data?.defaultProfile;
    const salesMultiplier = profile?.coefficient
        ? formatMoney(1 / profile.coefficient)
        : 1;

    function basePrice(sp) {
        if (!sp) return sp;
        return formatMoney(sp / salesMultiplier);
    }
    const selectedTax = data._taxForm?.selection?.[0];
    if (copy && selectedTax) selectedTax.salesTaxId = null;
    const isLegacy =
        dayjs("2025-02-12").diff(dayjs(data._rawData?.createdAt), "days") > 0;
    function customPrice(price) {
        if (!price && isLegacy) {
            return "";
        }
        return price;
    }

    // if (!data.order?.extraCosts) data.order.extraCosts = [];

    const resp: SalesFormZusData = {
        // data,
        setting: data.salesSetting,
        pricing: data.pricing,
        profiles: data.data.profiles,
        _taxForm: data._taxForm,
        sequence: {
            formItem: [],
            stepComponent: {},
            multiComponent: {},
        },
        kvFormItem: {},
        kvStepForm: {},

        // kvFilteredStepComponentList: {},
        kvStepComponentList: {},
        currentTab: !data.order?.id ? "info" : "invoice",
        metaData: {
            debugMode: false,
            salesRepId: data.order?.salesRepId || data.order.salesRep?.id,
            type: data.order?.type as any,
            id: copy ? null : data.order?.id,
            salesId: copy ? null : data.order?.orderId,
            tax: selectedTax,
            createdAt: data.order?.createdAt,
            paymentTerm: data.order?.paymentTerm as any,
            paymentDueDate: data.order?.paymentDueDate,
            goodUntil: data.order?.goodUntil,
            paymentMethod: data.order?.meta?.payment_option,
            pricing: {
                dueAmount: data?.order?.amountDue,
                discount: data.order?.meta?.discount,
                delivery: null, // data.order?.meta?.deliveryCost,
                labour: data.order?.meta?.labor_cost,
                taxValue: data.order?.tax,
                taxCode: selectedTax?.taxCode,
                ccc: data.order?.meta?.ccc,
                subTotal: data.order?.subTotal,
                grandTotal: data.order?.grandTotal,
                paid: copy ? 0 : data.paidAmount || 0,
            },
            laborConfig: data?.order?.id ? data?.laborConfig : ({} as any),
            salesLaborConfig: data?.order?.id
                ? data?.order?.meta?.laborConfig || {}
                : {
                      //   rate: data?.laborConfig?.rate,
                      //   id: data?.laborConfig?.id,
                  },
            salesMultiplier,
            deliveryMode: data.order.deliveryOption as any,
            po: data.order?.meta?.po,
            qb: data.order?.meta?.qb,
            salesProfileId: profile?.id,
            // cad: data.customer?.id,
            customer: {
                id: data.customer?.id,
            },
            billing: {
                id: data.billingAddressId,
                customerId: data.customerId,
            },
            shipping: {
                id: data.shippingAddressId,
                customerId: data.customerId,
            },
            extraCosts: data.order.extraCosts,
            // bad: data.billingAddressId,
            // sad: data.shippingAddressId,
            primaryPhone: data.customer?.phoneNo,
        },
        formStatus: "ready",
        oldGrandTotal: data?._rawData?.grandTotal,
    };

    data.itemArray.map((item) => {
        const uid = generateRandomString(4);

        resp.sequence.formItem.push(uid);
        resp.kvFormItem[uid] = {
            collapsed: !item.expanded,
            uid,
            id: copy ? null : item.item.id,
            title: item?.item?.dykeDescription,
        };

        resp.sequence.stepComponent[uid] = [];
        let noHandle = true;
        // let doorStepUid, mouldingComponentUid;
        let itemType: DykeDoorType;
        let fallBackDoorStepProd;
        item.formStepArray.map((fs, i) => {
            // if (fs.step.title == "Door") doorStepUid = fs.step.uid;
            const componentUid = fs.item?.prodUid;
            // data.salesSetting.stepsByKey[''].components.find()
            const c = Object.entries(data.salesSetting.stepsByKey)
                .map(([k, s]) =>
                    s.components.find((s) => s.uid == componentUid),
                )
                .filter(Boolean)[0];
            const stepMeta = fs.step.meta;
            const suid = `${uid}-${fs.step.uid}`;
            const stp = (resp.kvStepForm[suid] = {
                componentUid,
                title: fs.step.title,
                value: fs.item?.value,
                salesPrice: fs.item?.price,
                basePrice: fs.item?.basePrice || basePrice(fs.item?.price),
                stepFormId: copy ? null : fs.item.id,
                stepId: fs.step.id,
                meta: stepMeta as any,
                salesOrderItemId: item.item.id,
                componentId: fs.component?.id,
                sectionOverride: fs.component?.meta?.sectionOverride,
                flatRate: fs?.item?.meta?.flatRate,
                formStepMeta: fs?.item?.meta,
            });
            if (stp.title == "Item Type") {
                itemType = stp.value as any;
                noHandle =
                    resp.setting.composedRouter[stp.componentUid]?.config
                        ?.noHandle;
            }
            if (stp.title == "Door") {
                fallBackDoorStepProd = Object.values(
                    data.salesSetting.stepsByKey,
                )
                    .map((s) => s.components)
                    .flat()
                    .find((s) => s.uid == stp.componentUid);
            }
            resp.sequence.stepComponent[uid].push(suid);
            resp.kvFormItem[uid].currentStepUid = suid;
        });
        if (
            !resp.kvFormItem[uid].groupItem &&
            !item.item?.shelfItemsData?.lineUids?.length
        )
            resp.kvFormItem[uid].groupItem = {
                groupUid: item.multiComponent?.uid,
                hptId: item.item.housePackageTool?.id,
                itemType,
                pricing: {
                    flatRate: 0,
                    components: {
                        basePrice: 0,
                        salesPrice: 0,
                    },
                    total: {
                        basePrice: 0,
                        salesPrice: 0,
                    },
                },
                itemIds: [],
                form: {},
                qty: {
                    lh: 0,
                    rh: 0,
                    total: 0,
                },
            };
        // resp.kvFormItem[uid].groupItem
        function pushItemId(itemId) {
            resp.kvFormItem[uid].groupItem.itemIds?.push(itemId);
        }
        type GroupType = (typeof resp.kvFormItem)[""]["groupItem"];
        function setType(type: GroupType["type"]) {
            resp.kvFormItem[uid].groupItem.type = type;
        }

        function addFormItem(formId, formData: GroupType["form"][""]) {
            formData.primaryGroupItem =
                formData.meta.salesItemId == item.item.id;
            const form = resp.kvFormItem[uid].groupItem.form;
            form[formId] = formData;
        }
        if (item.item.shelfItemsData?.lineUids?.length)
            resp.kvFormItem[uid].shelfItems = item.item.shelfItemsData;
        else {
            Object.entries(item.multiComponent.components).map(([id, data]) => {
                let sp =
                    item.item?.housePackageTool?.stepProduct ||
                    data.stepProduct;

                if (!sp && fallBackDoorStepProd) {
                    sp = fallBackDoorStepProd;
                }
                const stepProdUid =
                    sp?.uid ||
                    item.item.housePackageTool?.door?.stepProducts?.[0]?.uid;
                const stepProductId = sp?.id;

                const doorCount = Object.keys(data._doorForm).length;

                resp.kvFormItem[uid].groupItem.hptId = copy
                    ? null
                    : item.item?.housePackageTool?.id;
                const dt = item.item?.meta?.doorType;

                if (doorCount) {
                    setType("HPT");
                    resp.kvFormItem[uid].groupItem.doorStepProductId =
                        stepProductId;
                    resp.kvFormItem[uid].groupItem.doorStepProductUid = sp?.uid;
                    Object.entries(data._doorForm).map(([formId, doorForm]) => {
                        pushItemId(formId);

                        addFormItem(formId, {
                            doorId: copy ? null : doorForm.id,
                            pricing: {
                                itemPrice: {
                                    salesPrice: doorForm.jambSizePrice,
                                    basePrice: basePrice(
                                        doorForm.jambSizePrice,
                                    ),
                                },
                                unitLabor: doorForm?.meta?.unitLabor,
                                laborQty: doorForm?.meta?.laborQty,
                                unitPrice: doorForm.unitPrice,
                                customPrice: customPrice(
                                    doorForm?.meta?.overridePrice,
                                ),
                                addon: doorForm.doorPrice,
                            },
                            prodOverride: doorForm.meta?.prodOverride,
                            meta: {
                                salesItemId: copy ? null : data.itemId,
                                // noHandle,
                            },
                            hptId: copy ? null : doorForm.housePackageToolId,
                            selected: true,
                            swing: doorForm.swing,
                            qty: {
                                lh: doorForm.lhQty,
                                rh: doorForm.rhQty,
                                total: doorForm.totalQty,
                            },
                            stepProductId: {
                                id: doorForm.stepProductId,
                                fallbackId: sp?.id,
                            },
                        });
                    });
                } else if (dt == "Moulding" || !!item?.item?.housePackageTool) {
                    const formId = `${id}`;

                    pushItemId(formId);

                    setType("MOULDING");
                    const m: any = data.priceTags?.moulding;
                    const overridePrice = m?.overridePrice || m?.overridPrice;
                    addFormItem(formId, {
                        hptId: copy ? null : data.hptId,
                        mouldingProductId: data.stepProduct?.dykeProductId,
                        selected: true,
                        meta: {
                            salesItemId: copy ? null : data.itemId,
                            // noHandle,
                        },
                        qty: {
                            total: data.qty,
                        },
                        pricing: {
                            customPrice: customPrice(overridePrice),
                            itemPrice: {
                                basePrice: data.priceTags?.moulding?.basePrice,
                                salesPrice:
                                    data.priceTags?.moulding?.salesPrice ||
                                    data.priceTags?.moulding?.price,
                            },
                            unitPrice: data.priceTags?.moulding?.price,
                            addon: data.priceTags?.moulding?.addon,
                        },
                        stepProductId: {
                            id: data.stepProduct?.id,
                        },
                    });
                } else {
                    const formId = `${data.uid}`;
                    pushItemId(formId);
                    setType("SERVICE");
                    addFormItem(formId, {
                        pricing: {
                            itemPrice: {},
                            unitPrice: data.unitPrice,
                            customPrice: customPrice(data.unitPrice),
                            addon: 0,
                        },
                        selected: true,

                        qty: {
                            total: data.qty,
                        },
                        meta: {
                            description: data.description,
                            produceable: data.production,
                            taxxable: data.tax,
                            salesItemId: copy ? null : data.itemId,
                            // noHandle,
                        },
                        stepProductId: null,
                    });
                }
            });
        }

        // shelfItems.map(si => {})
        const setting = new SettingsClass("", uid, "", resp as any);
        const costCls = new CostingClass(setting);
        costCls.updateComponentCost();
        costCls.updateGroupedCost();
    });
    const costCls = new CostingClass(
        new SettingsClass("", "", "", resp as any),
    );
    costCls.calculateTotalPrice();
    return resp;
}
export function zhHarvestDoorSizes(data: SalesFormZusData, itemUid) {
    const form = data.kvFormItem[itemUid];
    let heightStepUid;
    const stepVar = Object.entries(data.kvStepForm)
        .filter(([k, d]) => k?.startsWith(`${itemUid}-`))
        .map(([itemStepUid, frm]) => {
            if (frm.title == "Height") heightStepUid = itemStepUid;
            return {
                variation: frm?.meta?.doorSizeVariation,
                itemStepUid,
            };
        })
        .find((v) => v.variation);

    if (!stepVar?.variation) return null;
    const validSizes = stepVar.variation
        .map((c) => {
            const rules = c.rules;
            const valid = rules.every(
                ({ componentsUid, operator, stepUid }) => {
                    const selectedComponentUid =
                        data.kvStepForm[`${itemUid}-${stepUid}`]?.componentUid;
                    return (
                        !componentsUid?.length ||
                        (operator == "is"
                            ? componentsUid?.some(
                                  (a) => a == selectedComponentUid,
                              )
                            : componentsUid?.every(
                                  (a) => a != selectedComponentUid,
                              ))
                    );
                },
            );
            return {
                widthList: c.widthList,
                valid,
            };
        })
        .filter((c) => c.valid);

    const stepCls = new StepHelperClass(heightStepUid);
    const visibleComponents = stepCls.getVisibleComponents();
    const sizeList: {
        size: string;
        height: string;
        width: string;
        takeOffSize: string;
    }[] = [];
    visibleComponents?.map((c) => {
        validSizes.map((s) => {
            s.widthList.map((w) => {
                sizeList.push({
                    size: `${w} x ${c.title}`,
                    width: w,
                    height: c.title,
                    takeOffSize: [w, c.title].join("").split("-").join(""),
                });
            });
        });
    });
    return {
        sizeList,
        height: stepCls.getStepForm()?.value,
    };
}
export function zhItemUidFromStepUid(stepUid) {
    const [uid] = stepUid?.split("-");
    return uid;
}
export function zhAddItem() {
    const state = getFormState();
    const uid = generateRandomString(4);
    const _sequence = state.sequence;
    _sequence.formItem.push(uid);
    const kvFormItem = state.kvFormItem;
    kvFormItem[uid] = {
        collapsed: false,
        uid,
        id: null,
        title: "",
    };
    const rootStep = state.setting.rootStep;
    const itemStepUid = `${uid}-${rootStep.uid}`;
    const kvStepForm = state.kvStepForm;
    kvStepForm[itemStepUid] = {
        componentUid: "",
        title: rootStep.title,
        value: "",
        meta: rootStep.meta,
        stepId: rootStep.id,
    };
    kvFormItem[uid].currentStepUid = itemStepUid;
    _sequence.stepComponent[uid] = [itemStepUid];
    state.dotUpdate("sequence", _sequence);
    state.dotUpdate("kvFormItem", kvFormItem);
    state.dotUpdate("kvStepForm", kvStepForm);
}

// --- Content from: ai/sales-form/page.tsx ---
import FPage from "@/components/(clean-code)/fikr-ui/f-page";

import { FormClient } from "../_components/form-client";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { createSalesBookFormUseCase } from "@/app-deps/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";

export async function generateMetadata({ params }) {
    return constructMetadata({
        title: `Create Quote - gndprodesk.com`,
    });
}
export default async function CreateOrderPage({}) {
    const data = await createSalesBookFormUseCase({
        type: "quote",
    });

    return (
        <FPage className="" title="Create Quote">
            <FormClient data={data} />
        </FPage>
    );
}

// --- Content from: ai/sales-form/hpt-note.tsx ---
import { doorItemControlUid } from "@/app-deps/(clean-code)/(sales)/_common/utils/item-control-utils";
import { useHpt, useHptLine } from "../context";
import { noteTagFilter } from "@/modules/notes/utils";
import { TableCell, TableRow } from "@gnd/ui/table";
import Note from "@/modules/notes";

export function HptNote({}) {
    const ctx = useHptLine();
    const { hpt, itemForm, isSlab, showNote, config } = useHpt();
    const { size, sizeForm } = ctx;
    const salesId = hpt?.zus?.metaData?.id;
    const itemId = itemForm?.id;
    const controlUid = doorItemControlUid(sizeForm?.doorId, size.size);
    const __noteTagFilter =
        salesId && itemId && sizeForm?.doorId
            ? [
                  noteTagFilter("itemControlUID", controlUid),
                  noteTagFilter("salesItemId", itemId),
                  noteTagFilter("salesId", salesId),
              ]
            : null;
    const colSpan =
        6 +
        (isSlab ? 1 : 0) +
        (config.hasSwing ? 1 : 0) +
        (config.noHandle ? 1 : 2);
    return (
        <>
            {!showNote || (
                <TableRow className="hover:bg-white">
                    <TableCell colSpan={colSpan} className="">
                        {__noteTagFilter ? (
                            <Note
                                admin
                                subject={"Production Note"}
                                headline=""
                                statusFilters={["public"]}
                                typeFilters={["production", "general"]}
                                tagFilters={__noteTagFilter}
                            />
                        ) : (
                            <div className="flex text-center font-mono$ p-2 items-center text-red-600">
                                <span>
                                    To access item note, you need to first save
                                    your invoice
                                </span>
                            </div>
                        )}
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

// --- Content from: ai/sales-form/moulding-class.ts ---
import { ZusSales } from "../../../_common/_stores/form-data-store";
import { GroupFormClass } from "./group-form-class";
import { StepHelperClass } from "./step-component-class";

export class MouldingClass extends GroupFormClass {
    constructor(public itemStepUid) {
        super(itemStepUid);
    }
    public getMouldingStepForm() {
        const itemSteps = this.getItemStepForms();
        const msf = itemSteps.find((data) =>
            this.isMultiSelectTitle(data.title),
        );
        return msf;
    }

    public getMouldingLineItemForm() {
        const mouldings = this.getSelectedMouldings();

        const resp = {
            mouldings: mouldings.map((m) => {
                const priceModel = this.getCurrentComponentPricingModel(m?.uid);
                return {
                    ...m,
                    basePrice: priceModel?.pricing,
                };
            }),
            pricedSteps: this.getPricedSteps(),
        };
        return resp;
    }
    public getSelectedMouldings() {
        const itemForm = this.getItemForm();
        const mouldingStep = this.getMouldingStepForm();
        const selectionComponentUids = Array.from(
            new Set(itemForm.groupItem?.itemIds?.map((s) => s)),
        );
        return selectionComponentUids.map((componentUid) => {
            const component = this.getComponentFromSettingsByStepId(
                mouldingStep?.stepId,
                componentUid,
            );
            return component;
        });
    }
}

