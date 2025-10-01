import {
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
import { UseStepContext, useStepContext } from "./ctx";
import { CustomComponentAction } from "./custom-component.action";
import SearchBar from "./search-bar";
import { Tabs } from "@gnd/ui/custom/tabs";
import { DoorSuppliers } from "@/components/forms/sales-form/door-suppliers";
import { DoorSupplierBadge } from "@/components/forms/sales-form/door-supplier-badge";
import { SuperAdminGuard } from "@/components/auth-guard";

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
    return (
        <div className="grid gap-4">
            <div className="flex flex-1 justify-end">
                <DoorSupplierBadge itemStepUid={itemStepUid} />
            </div>
            <Content itemStepUid={itemStepUid} />
        </div>
    );
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
    const sortMode = useSortControl();
    const [savingSort, startSavingSort] = useTransition();
    const onSorted = async (e: typeof items) => {
        startSavingSort((async () => {
            ctx.setItems(e);
            const data = e

                .map((i, _i) => ({
                    prevIndex: i._metaData.sortIndex,
                    componentId: i.id,
                    sortUid: i?._metaData?.sortUid,
                    sortIndex: _i,
                }))
                .filter((a) => {
                    if (a.sortIndex > 0) {
                        return a.sortIndex != a.prevIndex;
                    }
                    return a.prevIndex == null || a.prevIndex != a.sortIndex;
                });

            await updateComponentsSortingAction({
                list: data,
            });
            cls.refreshStepComponentsData(true);
        }) as any);
    };
    return (
        <div className="grid gap-4">
            <ScrollArea
                ref={sticky.containerRef}
                className="smax-h-[80vh] sm:max-h-[200vh] relative h-full p-4 pb-20"
            >
                <Sortable
                    orientation="mixed"
                    collisionDetection={closestCorners}
                    value={items}
                    onValueChange={onSorted}
                    overlay={
                        <div className="size-full rounded-md bg-primary/10" />
                    }
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
                            <SortableItem
                                key={component.id}
                                value={component.id}
                                asTrigger
                                className={cn(savingSort && "grayscale")}
                                asChild
                            >
                                {sortMode && !savingSort ? (
                                    <div className="  flex flex-col">
                                        <Component
                                            sortMode={sortMode}
                                            ctx={ctx}
                                            itemIndex={index}
                                            key={component.uid}
                                            component={component}
                                        />
                                    </div>
                                ) : (
                                    <Component
                                        sortMode={sortMode}
                                        ctx={ctx}
                                        itemIndex={index}
                                        key={component.uid}
                                        component={component}
                                    />
                                )}
                                {/* </div> */}
                            </SortableItem>
                        ))}
                        {/* <CustomComponent ctx={ctx} /> */}
                        <CustomComponentForm itemStepUid={itemStepUid} />
                    </div>
                </Sortable>
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
        openComponentVariantModal(
            new ComponentHelperClass(stepUid, uids[0]),
            uids,
        );
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
                    "z-10 bg-secondary",
                )}
            >
                <div className="flex items-center gap-4 rounded-lg border p-2 px-4 shadow">
                    {selectionState?.count ? (
                        <>
                            <span className="font-mono text-sm font-semibold uppercase">
                                {selectionState?.count} selected
                            </span>
                            <SearchBar ctx={ctx} />
                            <Menu>
                                <Menu.Item
                                    onClick={editVisibility}
                                    icon="settings"
                                >
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
                            <span className="font-mono text-sm font-semibold uppercase">
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
                                            onClick={() =>
                                                ctx.setTab(tb.tab as any)
                                            }
                                            disabled={
                                                !tb.count || tb.tab == ctx.tab
                                            }
                                        >
                                            {tb.title}
                                        </Menu.Item>
                                    ))}
                                >
                                    Tabs
                                </Menu.Item>
                                <Menu.Item
                                    onClick={() => ctx.selectAll()}
                                    Icon={BoxSelect}
                                >
                                    Select All
                                </Menu.Item>
                                {isDoor ? (
                                    <>
                                        <Menu.Item
                                            icon="Export"
                                            onClick={() => {
                                                _modal.openModal(
                                                    <DoorSizeModal
                                                        cls={ctx.cls}
                                                    />,
                                                );
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
export function Component({
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
            component,
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
                    "h-full w-full overflow-hidden  rounded-lg border hover:bg-muted",
                    (multiSelect && cls.multiSelected()) ||
                        stepForm?.componentUid == component.uid
                        ? "border-muted-foreground bg-muted"
                        : "hover:border-muted-foreground/50",
                    sortMode &&
                        "border-dashed border-muted-foreground hover:border-muted-foreground",
                )}
                onClick={!sortMode ? selectComponent : undefined}
            >
                <div className="flex h-full flex-col">
                    <div className="flex-1 relative">
                        <ComponentImg
                            noHover={sortMode}
                            aspectRatio={4 / 2}
                            src={component.img}
                        />
                        <div className="absolute bottom-0 right-0">
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
                                <SuperAdminGuard>
                                    {!component?.statistics || (
                                        <span className="flex gap-1">
                                            <LineChart className="size-4" />
                                            {component?.statistics}
                                        </span>
                                    )}
                                </SuperAdminGuard>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col p-2">
                        <Label className="text-start uppercase">
                            {component.title}
                        </Label>
                    </div>
                </div>
            </button>

            {component.productCode ? (
                <div className="s-rotate-90 -translate-y-1/2s top-1/2s absolute left-4 top-4 transform text-xs font-bold uppercase tracking-wider  text-muted-foreground">
                    {component.productCode}
                </div>
            ) : null}

            <div
                className={cn(
                    "absolute left-0 top-0 m-4 flex items-center gap-2",
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
                        !component?.sectionOverride?.overrideMode && "hidden",
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
                          : "hidden bg-muted dark:bg-muted-foreground group-hover:flex",
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
                                                component,
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
