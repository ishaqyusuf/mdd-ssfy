import { useCallback } from "react";

import { DeleteRowAction } from "@/components/_v1/data-table/data-table-row-actions";
import { Icons } from "@/components/_v1/icons";
import { Menu } from "@/components/(clean-code)/menu";
import { _modal } from "@/components/common/modal/provider";
import { cn } from "@/lib/utils";
import { BoxSelect, Folder } from "lucide-react";

import { Button } from "@gnd/ui/button";

import { useFormDataStore } from "../../_common/_stores/form-data-store";
import { ComponentHelperClass } from "../../_utils/helpers/zus/step-component-class";
import { zusDeleteComponents } from "../../_utils/helpers/zus/zus-step-helper";

import { openComponentModal } from "../modals/component-form";

import { openComponentVariantModal } from "../modals/component-visibility-modal";

import DoorSizeModal from "../modals/door-size-modal";

import { openStepPricingModal } from "../modals/step-pricing-modal";
import { UseStepContext } from "./ctx";
import { CustomComponentAction } from "./custom-component.action";
import SearchBar from "./search-bar";

export function ComponentSectionFooter({ ctx }: { ctx: UseStepContext }) {
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
