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
import { Menu } from "@gnd/ui/custom/menu";
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

import { openComponentVariantModal } from "../modals/component-visibility-modal";
import DoorSizeModal from "../modals/door-size-modal";

import { openStepPricingModal } from "../modals/step-pricing-modal";
import { UseStepContext, useStepContext } from "./ctx";
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
            <div
                ref={sticky.containerRef}
                className="relative h-full p-4 pb-28"
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
            </div>
        </div>
    );
}

function FloatingAction({ ctx }: { ctx: UseStepContext }) {
    const {
        stepUid,
        items,
        sticky: { actionRef, isFixed },
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
                className={cn(
                    "left-1/2 z-20 w-fit max-w-[calc(100vw-2rem)] -translate-x-1/2 transform bg-secondary",
                    isFixed
                        ? "fixed bottom-6 z-40"
                        : "sticky bottom-2 sm:bottom-12",
                )}
            >
                <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg border p-2 px-4 shadow">
                    {selectionState?.count ? (
                        <>
                            <span className="font-mono$ text-sm font-semibold uppercase">
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
