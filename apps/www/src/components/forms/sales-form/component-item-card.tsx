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
} from "../../../app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { ComponentHelperClass } from "../../../app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import { zusDeleteComponents } from "../../../app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/zus-step-helper";

import { openComponentModal } from "../../../app/(clean-code)/(sales)/sales-book/(form)/_components/modals/component-form";
import { openEditComponentPrice } from "../../../app/(clean-code)/(sales)/sales-book/(form)/_components/modals/component-price-modal";
import { openSectionSettingOverride } from "../../../app/(clean-code)/(sales)/sales-book/(form)/_components/modals/component-section-setting-override";
import { openComponentVariantModal } from "../../../app/(clean-code)/(sales)/sales-book/(form)/_components/modals/component-visibility-modal";
import { openDoorPriceModal } from "../../../app/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-price-modal";
import DoorSizeModal from "../../../app/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-modal";
import { openDoorSizeSelectModal } from "../../../app/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-select-modal/open-modal";
import { openStepPricingModal } from "../../../app/(clean-code)/(sales)/sales-book/(form)/_components/modals/step-pricing-modal";
import {
    UseStepContext,
    useStepContext,
} from "../../../app/(clean-code)/(sales)/sales-book/(form)/_components/components-section/ctx";
import { CustomComponentAction } from "../../../app/(clean-code)/(sales)/sales-book/(form)/_components/components-section/custom-component.action";
import SearchBar from "../../../app/(clean-code)/(sales)/sales-book/(form)/_components/components-section/search-bar";
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
                    "h-full w-full overflow-hiddens  rounded-lg border-2 hover:border-primary-foreground",
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
                            "px-1",
                        )}
                    >
                        <Filter className="size-4 text-muted-foreground/70" />
                    </div>
                    <div
                        className={cn(
                            !component?.sectionOverride?.overrideMode &&
                                "hidden",
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
                    "absolute  left-0 top-0 m-4 flexs hidden items-center gap-2",
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
