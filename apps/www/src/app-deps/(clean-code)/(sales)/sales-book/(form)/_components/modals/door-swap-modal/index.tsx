import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, EyeOff, Search } from "lucide-react";
import Modal from "@/components/common/modal";
import { _modal } from "@/components/common/modal/provider";
import { toast } from "sonner";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { cn } from "@/lib/utils";

import { getFormState } from "../../../_common/_stores/form-data-store";
import { useStepContext } from "../../components-section/ctx";
import SearchBar from "../../components-section/search-bar";
import { HptContext } from "@/components/forms/sales-form/context";
import { ComponentItemCard } from "../../../../../../../../components/forms/sales-form/component-item-card";
import { ComponentHelperClass } from "../../../_utils/helpers/zus/step-component-class";
import { StepHelperClass } from "../../../_utils/helpers/zus/step-component-class";
import { composeDoor } from "@/lib/sales/compose-door";
import { updateDoorGroupForm } from "@/lib/sales/update-door-form";

export type Door = HptContext["doors"][number];

type VariationRule = {
    stepUid: string;
    operator: "is" | "isNot";
    componentsUid: string[];
};

export const openDoorSwapModal = (door: Door, itemUid) => {
    const zus = getFormState();
    const itemStepUid = Object.entries(zus.kvStepForm)?.find(
        ([k, v]) => v.title == "Door" && k?.startsWith(itemUid),
    )?.[0];
    if (itemStepUid)
        _modal.openModal(
            <DoorSwapModal itemStepUid={itemStepUid} door={door} />,
        );
    else toast.error("Door step not found");
};

function getDoorStepItemStepUid(itemUid: string, zus = getFormState()) {
    return Object.entries(zus.kvStepForm)?.find(
        ([k, v]) => v.title == "Door" && k?.startsWith(itemUid),
    )?.[0];
}

function getItemTypeStepItemStepUid(itemUid: string, zus = getFormState()) {
    return Object.entries(zus.kvStepForm)?.find(
        ([k, v]) => v.title == "Item Type" && k?.startsWith(itemUid),
    )?.[0];
}

function dedupeOptions(options) {
    return options.filter((option, index) => {
        const duplicates = options.filter(
            (candidate) =>
                candidate.uid == option.uid || candidate.title == option.title,
        );
        if (duplicates.length <= 1) return true;
        const preferredIndex = duplicates.findIndex(
            (candidate) => candidate.variations?.length > 0,
        );
        if (preferredIndex >= 0) return duplicates[preferredIndex]?.uid == option.uid;
        return duplicates[0]?.uid == option.uid;
    });
}

function resolveVariationOptions(
    cls: ComponentHelperClass,
    component,
    variationIndex,
) {
    const variantData = cls.getComponentVariantData();
    const variation = component?.variations?.[variationIndex];
    if (!variation?.rules?.length) return [];

    return variation.rules.map((rule: VariationRule, index) => {
        const stepOptions = dedupeOptions(
            variantData?.componentsByStepUid?.[rule.stepUid] || [],
        );
        const options =
            rule.operator == "isNot"
                ? stepOptions.filter(
                      (option) => !rule.componentsUid?.includes(option.uid),
                  )
                : stepOptions.filter((option) =>
                      rule.componentsUid?.includes(option.uid),
                  );

        return {
            key: `${rule.stepUid}-${index}`,
            stepUid: rule.stepUid,
            stepTitle:
                variantData?.steps?.find((step) => step.uid == rule.stepUid)
                    ?.title || rule.stepUid,
            operator: rule.operator,
            options,
        };
    });
}

function captureDoorSelectionSnapshot(cls: ComponentHelperClass, door: Door) {
    const form = cls.getItemForm()?.groupItem?.form || {};
    const prefix = `${door.uid}-`;
    const snapshot = {};
    (door?.sizeList || []).forEach((size) => {
        const sizeKey = size.path?.startsWith(prefix)
            ? size.path.slice(prefix.length)
            : size.path?.split("-").slice(1).join("-");
        const formData = form[size.path];
        if (!formData?.selected) return;
        snapshot[sizeKey] = {
            qty: formData.qty || {},
            swing: formData.swing || "",
        };
    });
    return snapshot;
}

function applyDoorSelectionSnapshot(selections, snapshot = {}) {
    Object.entries(snapshot).forEach(([sizeKey, data]: [string, any]) => {
        const path = Object.keys(selections).find((selectionPath) =>
            selectionPath.endsWith(`-${sizeKey}`),
        );
        if (!path) return;
        selections[path] = {
            ...selections[path],
            swing: data.swing || "",
            qty: {
                lh: data?.qty?.lh || "",
                rh: data?.qty?.rh || "",
                total: data?.qty?.total || "",
            },
        };
    });
    return selections;
}

function captureCommonStepSelectionSnapshot(cls: ComponentHelperClass) {
    const snapshot = {};
    (cls.getItemStepSequence() || []).forEach((itemStepUid) => {
        const stepForm = cls.zus.kvStepForm[itemStepUid];
        const [, stepUid] = itemStepUid.split("-");
        if (!stepForm?.componentUid) return;
        if (stepForm.title == "Item Type" || stepForm.title == "Door") return;
        snapshot[stepUid] = {
            itemStepUid,
            componentUid: stepForm.componentUid,
        };
    });
    return snapshot;
}

function getSelectableItemSteps(itemUid: string, zus = getFormState()) {
    const sequence = zus.sequence.stepComponent?.[itemUid] || [];
    return sequence
        .map((itemStepUid) => {
            const stepForm = zus.kvStepForm[itemStepUid];
            const [, stepUid] = itemStepUid.split("-");
            return {
                itemStepUid,
                stepUid,
                title: stepForm?.title || zus.setting.stepsByKey?.[stepUid]?.title,
                componentUid: stepForm?.componentUid || "",
                stepId: stepForm?.stepId,
            };
        })
        .filter((step) => step.title && step.title != "Door");
}

function getMissingSelectableItemSteps(itemUid: string, zus = getFormState()) {
    return getSelectableItemSteps(itemUid, zus).filter((step) => !step.componentUid);
}

function restoreCommonStepSelections(
    cls: ComponentHelperClass,
    snapshot: Record<string, { itemStepUid: string; componentUid: string }>,
) {
    Object.entries(snapshot).forEach(([stepUid, data]) => {
        const itemStepUid = `${cls.itemUid}-${stepUid}`;
        const stepForm = cls.zus.kvStepForm[itemStepUid];
        if (!stepForm) return;
        const component =
            cls.getComponentFromSettingsByStepId(stepForm.stepId, data.componentUid) ||
            cls.zus.setting.stepsByKey?.[stepUid]?.components?.find(
                (candidate) => candidate.uid == data.componentUid,
            );
        if (!component) return;
        const helper = new ComponentHelperClass(itemStepUid, component.uid, component);
        helper.selectComponent(true);
    });
}

function sortSequenceBySettings(cls: ComponentHelperClass, itemStepUids: string[]) {
    const order = new Map(
        (cls.zus.setting.steps || []).map((step, index) => [step.uid, index]),
    );
    return Array.from(new Set(itemStepUids)).sort((left, right) => {
        const leftStepUid = left.split("-")[1];
        const rightStepUid = right.split("-")[1];
        return (order.get(leftStepUid) ?? 999) - (order.get(rightStepUid) ?? 999);
    });
}

function ensureStepInSequence(cls: ComponentHelperClass, stepUid: string) {
    const itemStepUid = `${cls.itemUid}-${stepUid}`;
    const settingsStep = cls.zus.setting.stepsByKey?.[stepUid];
    const currentSequence = cls.getItemStepSequence() || [];
    const nextSequence = currentSequence.includes(itemStepUid)
        ? currentSequence
        : sortSequenceBySettings(cls, [...currentSequence, itemStepUid]);

    cls.zus.dotUpdate(`sequence.stepComponent.${cls.itemUid}`, nextSequence);
    if (!cls.zus.kvStepForm[itemStepUid] && settingsStep) {
        cls.zus.dotUpdate(`kvStepForm.${itemStepUid}`, {
            componentUid: null,
            meta: settingsStep.meta,
            flatRate: false,
            title: settingsStep.title,
            stepId: settingsStep.id,
            value: "",
        });
    }
    return itemStepUid;
}

function ensureStepFormsForSequence(
    cls: ComponentHelperClass,
    itemStepUids: string[],
) {
    itemStepUids.forEach((itemStepUid) => {
        const [, stepUid] = itemStepUid.split("-");
        const settingsStep = cls.zus.setting.stepsByKey?.[stepUid];
        if (!settingsStep || cls.zus.kvStepForm[itemStepUid]) return;
        cls.zus.dotUpdate(`kvStepForm.${itemStepUid}`, {
            componentUid: null,
            meta: settingsStep.meta,
            flatRate: false,
            title: settingsStep.title,
            stepId: settingsStep.id,
            value: "",
        });
    });
}

function selectedSettingsComponent(cls: ComponentHelperClass, itemStepUid: string) {
    const stepForm = cls.zus.kvStepForm[itemStepUid];
    const [, stepUid] = itemStepUid.split("-");
    if (!stepForm?.componentUid) return null;
    return (
        cls.getComponentFromSettingsByStepId(stepForm.stepId, stepForm.componentUid) ||
        cls.zus.setting.stepsByKey?.[stepUid]?.components?.find(
            (component) => component.uid == stepForm.componentUid,
        )
    );
}

function buildConfiguredSequence(cls: ComponentHelperClass) {
    const currentSequence = cls.getItemStepSequence() || [];
    const rootItemStepUid = currentSequence[0];
    if (!rootItemStepUid) return currentSequence;

    const rootStepForm = cls.zus.kvStepForm[rootItemStepUid];
    const rootComponentUid = rootStepForm?.componentUid;
    if (!rootComponentUid) return currentSequence;

    const routeMap = cls.zus.setting.composedRouter?.[rootComponentUid]?.route || {};
    const nextSequence = [rootItemStepUid];
    const seen = new Set(nextSequence);
    let currentStepUid = rootItemStepUid.split("-")[1];
    let nextStepUid = routeMap[rootComponentUid];

    while (nextStepUid) {
        const itemStepUid = `${cls.itemUid}-${nextStepUid}`;
        if (seen.has(itemStepUid)) break;
        nextSequence.push(itemStepUid);
        seen.add(itemStepUid);
        const selectedComponent = selectedSettingsComponent(cls, itemStepUid);
        currentStepUid = nextStepUid;
        nextStepUid = selectedComponent?.redirectUid || routeMap[currentStepUid];
    }

    return nextSequence;
}

function treeShakeSequence(cls: ComponentHelperClass) {
    const currentSequence = cls.getItemStepSequence() || [];
    const nextSequence = buildConfiguredSequence(cls);
    ensureStepFormsForSequence(cls, nextSequence);
    const removedSteps = currentSequence.filter(
        (itemStepUid) => !nextSequence.includes(itemStepUid),
    );
    cls.deleteStepsForm(removedSteps);
    cls.zus.dotUpdate(`sequence.stepComponent.${cls.itemUid}`, nextSequence);
}

function buildDraftZus(itemUid: string, draftSelections, zus = getFormState()) {
    const cloned = JSON.parse(JSON.stringify(zus));
    Object.entries(draftSelections || {}).forEach(([stepUid, componentUid]) => {
        const itemStepUid = `${itemUid}-${stepUid}`;
        if (!cloned.kvStepForm[itemStepUid] || !componentUid) return;
        cloned.kvStepForm[itemStepUid].componentUid = componentUid;
    });
    return cloned;
}

function getDraftStepComponents(itemUid: string, itemStepUid: string, draftSelections) {
    const draftZus = buildDraftZus(itemUid, draftSelections);
    const helper = new StepHelperClass(itemStepUid, draftZus as any);
    const [, stepUid] = itemStepUid.split("-");
    const settingsStep = draftZus.setting.stepsByKey?.[stepUid];
    const components = helper.filterStepComponents(settingsStep?.components || []);
    return components.filter((component) => component?._metaData?.visible);
}

function applyMissingStepSelections(itemUid: string, draftSelections) {
    const doorStepItemStepUid = getDoorStepItemStepUid(itemUid);
    if (!doorStepItemStepUid) return;
    const baseCls = new ComponentHelperClass(doorStepItemStepUid, null as any);
    const preservedCurrentStepUid = baseCls.getItemForm()?.currentStepUid;
    const preservedTabUid = baseCls.getItemForm()?.groupItem?._?.tabUid;
    const steps = getSelectableItemSteps(itemUid);
    steps.forEach((step) => {
        const selectedUid = draftSelections[step.stepUid];
        if (!selectedUid) return;
        const currentStepForm = getFormState().kvStepForm[step.itemStepUid];
        if (currentStepForm?.componentUid == selectedUid) return;
        selectConfiguredStepComponent(baseCls, step.stepUid, selectedUid, false);
        if (preservedCurrentStepUid) {
            baseCls.dotUpdateItemForm("currentStepUid", preservedCurrentStepUid);
        }
        if (preservedTabUid) {
            baseCls.dotUpdateItemForm("groupItem._.tabUid", preservedTabUid);
        }
    });
    treeShakeSequence(baseCls);
    baseCls.dotUpdateItemForm("currentStepUid", preservedCurrentStepUid || null);
    if (preservedTabUid) {
        baseCls.dotUpdateItemForm("groupItem._.tabUid", preservedTabUid);
    }
    baseCls.updateComponentCost();
    baseCls.updateGroupedCost();
    baseCls.calculateTotalPrice();
}

function openMissingStepSelectionsModalIfNeeded(itemUid: string) {
    const missingSteps = getMissingSelectableItemSteps(itemUid);
    if (!missingSteps.length) return false;
    setTimeout(() => {
        _modal.openModal(<MissingStepSelectionsModal itemUid={itemUid} />);
    }, 0);
    return true;
}

function routeContainsDoorStep(zus, rootComponentUid: string, targetStepUid: string) {
    const routeMap = zus.setting.composedRouter?.[rootComponentUid]?.route || {};
    const seen = new Set<string>();
    let current = routeMap[rootComponentUid];
    while (current && !seen.has(current)) {
        if (current == targetStepUid) return true;
        seen.add(current);
        current = routeMap[current];
    }
    return false;
}

export function getDoorItemTypeOptions(itemUid: string, doorUid: string, zus = getFormState()) {
    const itemTypeStepItemStepUid = getItemTypeStepItemStepUid(itemUid, zus);
    const doorStepItemStepUid = getDoorStepItemStepUid(itemUid, zus);
    if (!itemTypeStepItemStepUid || !doorStepItemStepUid) return [];

    const itemTypeHelper = new StepHelperClass(itemTypeStepItemStepUid, zus as any);
    const itemTypeComponents =
        itemTypeHelper.getStepComponents ||
        zus.setting.stepsByKey?.[itemTypeHelper.stepUid]?.components ||
        [];
    const doorStepForm = zus.kvStepForm[doorStepItemStepUid];
    const doorComponent =
        itemTypeHelper.getComponentFromSettingsByStepId(doorStepForm?.stepId, doorUid) ||
        zus.setting.stepsByKey?.[doorStepForm?.stepId]?.components?.find(
            (component) => component.uid == doorUid,
        );

    if (!doorComponent) return [];

    const targetDoorStepUid = doorStepItemStepUid.split("-")[1];

    return itemTypeComponents.filter((itemTypeComponent) => {
        if (!routeContainsDoorStep(zus, itemTypeComponent.uid, targetDoorStepUid)) {
            return false;
        }
        const clonedZus = JSON.parse(JSON.stringify(zus));
        clonedZus.kvStepForm[itemTypeStepItemStepUid] = {
            ...clonedZus.kvStepForm[itemTypeStepItemStepUid],
            componentUid: itemTypeComponent.uid,
            value: itemTypeComponent.title,
            stepId:
                clonedZus.kvStepForm[itemTypeStepItemStepUid]?.stepId ||
                itemTypeComponent.stepId,
        };
        const simulatedDoorHelper = new StepHelperClass(
            doorStepItemStepUid,
            clonedZus as any,
        );
        return !!simulatedDoorHelper.isComponentVisible({
            ...doorComponent,
            _metaData: { ...(doorComponent._metaData || {}) },
        } as any);
    });
}

function selectConfiguredStepComponent(
    cls: ComponentHelperClass,
    stepUid: string,
    componentUid: string,
    takeOff = true,
) {
    const settingsStep = cls.zus.setting.stepsByKey?.[stepUid];
    if (!settingsStep) return null;

    const component =
        cls.getComponentFromSettingsByStepId(settingsStep.id, componentUid) ||
        settingsStep.components?.find((candidate) => candidate.uid == componentUid);
    if (!component) return null;

    const itemStepUid = ensureStepInSequence(cls, stepUid);
    const helper = new ComponentHelperClass(itemStepUid, component.uid, component);
    helper.selectComponent(takeOff);
    return helper;
}

function swapDoorWithPreservedRows(
    cls: ComponentHelperClass,
    component,
    swapDoor: Door,
    preservedSnapshot = {},
) {
    const doorItemStepUid =
        getDoorStepItemStepUid(cls.itemUid, cls.zus as any) ||
        ensureStepInSequence(cls, cls.stepUid);
    const doorHelper = new ComponentHelperClass(
        doorItemStepUid,
        component.uid,
        component,
    );

    doorHelper.selectComponent(true);
    const composed = composeDoor(doorHelper, swapDoor);
    applyDoorSelectionSnapshot(composed.selections, preservedSnapshot);
    updateDoorGroupForm(
        doorHelper,
        composed.selections,
        swapDoor?.sizeList?.map((size) => size.path) || [],
        false,
    );
    treeShakeSequence(doorHelper);
    doorHelper.updateComponentCost();
    doorHelper.updateGroupedCost();
    doorHelper.calculateTotalPrice();
    return doorHelper;
}

function applyVisibilitySelectionsAndSwap(
    cls: ComponentHelperClass,
    nextDoor,
    currentDoor,
    visibilitySelections,
    preservedSnapshot,
) {
    const selectedSteps = Object.entries(visibilitySelections)
        .filter(([, componentUid]) => !!componentUid)
        .map(([stepUid, componentUid]) => ({ stepUid, componentUid }))
        .sort((left, right) => {
            const order = new Map(
                (cls.zus.setting.steps || []).map((step, index) => [
                    step.uid,
                    index,
                ]),
            );
            return (
                (order.get(left.stepUid) ?? 999) -
                (order.get(right.stepUid) ?? 999)
            );
        });

    if (selectedSteps.length) {
        const [first, ...rest] = selectedSteps;
        selectConfiguredStepComponent(cls, first.stepUid, first.componentUid, false);
        rest.forEach((stepSelection) => {
            selectConfiguredStepComponent(
                cls,
                stepSelection.stepUid,
                stepSelection.componentUid,
                true,
            );
        });
    }

    treeShakeSequence(cls);
    swapDoorWithPreservedRows(cls, nextDoor, currentDoor, preservedSnapshot);
}

export const openDoorItemTypeSwapModal = (door: Door, itemUid) => {
    const zus = getFormState();
    const itemStepUid = getDoorStepItemStepUid(itemUid, zus);
    if (!itemStepUid) {
        toast.error("Door step not found");
        return;
    }
    _modal.openModal(
        <DoorItemTypeSwapModal itemStepUid={itemStepUid} door={door} />,
    );
};

export function DoorSwapModal({ door, itemStepUid }) {
    const ctx = useStepContext(itemStepUid);
    const { cls } = ctx;
    const [view, setView] = useState<"doors" | "visibility">("doors");
    const [selectedDoor, setSelectedDoor] = useState<any>(null);
    const [variationIndex, setVariationIndex] = useState(0);
    const [visibilitySelections, setVisibilitySelections] = useState<
        Record<string, string>
    >({});

    const allDoors = useMemo(() => {
        const items = ctx.stepComponents || [];
        return [...items].sort((left, right) => {
            const leftHidden = !left?._metaData?.visible;
            const rightHidden = !right?._metaData?.visible;
            if (leftHidden == rightHidden)
                return (left?.title || "").localeCompare(right?.title || "");
            return leftHidden ? 1 : -1;
        });
    }, [ctx.stepComponents]);

    const filteredDoors = useMemo(() => {
        const q = ctx.q?.trim()?.toLowerCase();
        if (!q) return allDoors;
        return allDoors.filter((component) =>
            [component.title, component.productCode, component.uid]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(q)),
        );
    }, [allDoors, ctx.q]);

    const variationOptions = useMemo(
        () => resolveVariationOptions(cls, selectedDoor, variationIndex),
        [cls, selectedDoor, variationIndex],
    );

    useEffect(() => {
        if (!selectedDoor) return;
        const nextSelections = {};
        variationOptions.forEach((rule) => {
            nextSelections[rule.stepUid] = rule.options?.[0]?.uid || "";
        });
        setVisibilitySelections(nextSelections);
    }, [selectedDoor, variationIndex, variationOptions]);

    const preservedSnapshot = useMemo(
        () => captureDoorSelectionSnapshot(cls, door),
        [cls, door],
    );
    function closeModal() {
        _modal.close();
    }

    function handleDoorPick(component) {
        const autoVariationOptions = resolveVariationOptions(cls, component, 0);
        const canAutoProceed =
            !component?._metaData?.visible &&
            component?.variations?.length == 1 &&
            autoVariationOptions.length > 0 &&
            autoVariationOptions.every((rule) => rule.options.length <= 1);

        if (canAutoProceed) {
            const autoSelections = {};
            autoVariationOptions.forEach((rule) => {
                autoSelections[rule.stepUid] = rule.options?.[0]?.uid || "";
            });
            applyVisibilitySelectionsAndSwap(
                cls,
                component,
                door,
                autoSelections,
                preservedSnapshot,
            );
            closeModal();
            openMissingStepSelectionsModalIfNeeded(cls.itemUid);
            return;
        }

        if (!component?._metaData?.visible && component?.variations?.length) {
            setSelectedDoor(component);
            setVariationIndex(0);
            setView("visibility");
            return;
        }

        swapDoorWithPreservedRows(cls, component, door, preservedSnapshot);
        closeModal();
        openMissingStepSelectionsModalIfNeeded(cls.itemUid);
    }

    function handleProceed() {
        if (!selectedDoor) return;
        applyVisibilitySelectionsAndSwap(
            cls,
            selectedDoor,
            door,
            visibilitySelections,
            preservedSnapshot,
        );
        closeModal();
        openMissingStepSelectionsModalIfNeeded(cls.itemUid);
    }

    return (
        <Modal.Content size="xl">
            <Modal.Header
                title={view == "doors" ? "Swap Door" : "Resolve Door Configuration"}
                subtitle={
                    view == "doors"
                        ? "Browse every door in the system. Doors marked with the hidden icon are outside the current configuration."
                        : "Choose the visibility options needed to make this door fit the current invoice item."
                }
            />
            {view == "doors" ? (
                <>
                    <ScrollArea className="h-[75vh]">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
                                <EyeOff className="size-4" />
                                <span>Out of current configuration</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
                                {filteredDoors?.map((component) => (
                                    <ComponentItemCard
                                        ctx={ctx}
                                        key={component.uid}
                                        component={component}
                                        swapDoor={door}
                                        outOfConfig={!component?._metaData?.visible}
                                        onSelect={() => handleDoorPick(component)}
                                    />
                                ))}
                            </div>
                        </div>
                    </ScrollArea>
                    <Modal.Footer>
                        <div className="flex w-full justify-center">
                            <SearchBar ctx={ctx} />
                        </div>
                    </Modal.Footer>
                </>
            ) : (
                <>
                    <ScrollArea className="h-[65vh]">
                        <div className="space-y-5">
                            <div className="rounded-lg border bg-muted/30 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <Label className="text-sm text-muted-foreground">
                                            Selected door
                                        </Label>
                                        <div className="mt-1 font-semibold uppercase">
                                            {selectedDoor?.title}
                                        </div>
                                    </div>
                                    <Badge variant="secondary">
                                        {variationOptions.length} visibility option
                                        {variationOptions.length == 1 ? "" : "s"}
                                    </Badge>
                                </div>
                            </div>

                            {selectedDoor?.variations?.length > 1 ? (
                                <div className="space-y-2">
                                    <Label>Configuration Set</Label>
                                    <select
                                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                        value={variationIndex}
                                        onChange={(event) =>
                                            setVariationIndex(Number(event.target.value))
                                        }
                                    >
                                        {selectedDoor.variations.map((_, index) => (
                                            <option key={index} value={index}>
                                                Configuration {index + 1}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : null}

                            <div className="space-y-4">
                                {variationOptions.map((rule) => (
                                    <div
                                        key={rule.key}
                                        className="rounded-lg border p-4"
                                    >
                                        <div className="mb-2 flex items-center gap-2">
                                            <Label className="font-semibold">
                                                {rule.stepTitle}
                                            </Label>
                                            <Badge variant="outline">
                                                {rule.operator == "isNot"
                                                    ? "Exclude"
                                                    : "Match"}
                                            </Badge>
                                        </div>
                                        <select
                                            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                            value={visibilitySelections[rule.stepUid] || ""}
                                            onChange={(event) =>
                                                setVisibilitySelections((current) => ({
                                                    ...current,
                                                    [rule.stepUid]:
                                                        event.target.value,
                                                }))
                                            }
                                        >
                                            {rule.options.map((option) => (
                                                <option key={option.uid} value={option.uid}>
                                                    {option.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </ScrollArea>
                    <Modal.Footer>
                        <div className="flex w-full items-center justify-between gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setView("doors")}
                            >
                                <ArrowLeft className="mr-2 size-4" />
                                Back
                            </Button>
                            <Button type="button" onClick={handleProceed}>
                                Proceed
                            </Button>
                        </div>
                    </Modal.Footer>
                </>
            )}
        </Modal.Content>
    );
}

function DoorItemTypeSwapModal({
    door,
    itemStepUid,
}: {
    door: Door;
    itemStepUid: string;
}) {
    const ctx = useStepContext(itemStepUid);
    const { cls } = ctx;
    const itemTypeOptions = useMemo(
        () => getDoorItemTypeOptions(cls.itemUid, door.uid),
        [cls.itemUid, door.uid],
    );
    const preservedSnapshot = useMemo(
        () => captureDoorSelectionSnapshot(cls, door),
        [cls, door],
    );
    const preservedCommonSteps = useMemo(
        () => captureCommonStepSelectionSnapshot(cls),
        [cls],
    );

    function handleSelect(itemTypeComponent) {
        const itemTypeStepItemStepUid = getItemTypeStepItemStepUid(cls.itemUid);
        if (!itemTypeStepItemStepUid) return;
        const itemTypeHelper = new ComponentHelperClass(
            itemTypeStepItemStepUid,
            itemTypeComponent.uid,
            itemTypeComponent,
        );
        itemTypeHelper.selectComponent(false);
        treeShakeSequence(itemTypeHelper);
        restoreCommonStepSelections(itemTypeHelper, preservedCommonSteps);
        swapDoorWithPreservedRows(itemTypeHelper, door, door, preservedSnapshot);
        _modal.close();
        openMissingStepSelectionsModalIfNeeded(cls.itemUid);
    }

    return (
        <Modal.Content size="lg">
            <Modal.Header
                title="Swap Item Type"
                subtitle="Choose a compatible item type for the selected door. The step list will be rebuilt to match the new item type."
            />
            <ScrollArea className="h-[60vh]">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {itemTypeOptions.map((itemTypeComponent) => (
                        <button
                            key={itemTypeComponent.uid}
                            type="button"
                            onClick={() => handleSelect(itemTypeComponent)}
                            className="rounded-lg border p-4 text-left transition hover:border-muted-foreground hover:bg-muted/40"
                        >
                            <div className="font-semibold uppercase">
                                {itemTypeComponent.title}
                            </div>
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </Modal.Content>
    );
}

function MissingStepSelectionsModal({ itemUid }: { itemUid: string }) {
    const [draftSelections, setDraftSelections] = useState<Record<string, string>>(() => {
        const selections = {};
        getSelectableItemSteps(itemUid).forEach((step) => {
            selections[step.stepUid] = step.componentUid || "";
        });
        return selections;
    });
    const [query, setQuery] = useState("");
    const steps = useMemo(() => getSelectableItemSteps(itemUid), [itemUid]);
    const missingSteps = useMemo(
        () => steps.filter((step) => !draftSelections[step.stepUid]),
        [steps, draftSelections],
    );
    const [activeIndex, setActiveIndex] = useState(() => {
        const firstMissingIndex = steps.findIndex((step) => !step.componentUid);
        return firstMissingIndex >= 0 ? firstMissingIndex : 0;
    });
    const activeStep = steps[activeIndex];
    const activeComponents = useMemo(() => {
        if (!activeStep) return [];
        const components = getDraftStepComponents(
            itemUid,
            activeStep.itemStepUid,
            draftSelections,
        );
        if (!query.trim()) return components;
        const q = query.trim().toLowerCase();
        return components.filter((component) =>
            [component.title, component.productCode, component.uid]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(q)),
        );
    }, [activeStep, draftSelections, itemUid, query]);

    function goToNext() {
        setActiveIndex((current) => Math.min(current + 1, steps.length - 1));
    }

    function goToPrev() {
        setActiveIndex((current) => Math.max(current - 1, 0));
    }

    function skipCurrent() {
        goToNext();
    }

    function handleDone() {
        applyMissingStepSelections(itemUid, draftSelections);
        _modal.close();
        if (openMissingStepSelectionsModalIfNeeded(itemUid)) return;
    }

    useEffect(() => {
        setQuery("");
    }, [activeIndex]);

    return (
        <Modal.Content size="xl">
            <Modal.Header
                title="Complete Item Steps"
                subtitle="Fill the missing step selections for this updated item before continuing."
            />
            <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    {steps.map((step, index) => {
                        const selected = !!draftSelections[step.stepUid];
                        return (
                            <button
                                key={step.itemStepUid}
                                type="button"
                                onClick={() => setActiveIndex(index)}
                                className={cn(
                                    "rounded-full px-3 py-2 text-xs font-semibold uppercase transition",
                                    index == activeIndex
                                        ? "ring-2 ring-primary"
                                        : "",
                                    selected
                                        ? "bg-blue-600 text-white"
                                        : "bg-muted text-muted-foreground",
                                )}
                            >
                                {step.title}
                            </button>
                        );
                    })}
                </div>

                {activeStep ? (
                    <>
                        <div className="space-y-2">
                            <Label className="text-base font-semibold uppercase">
                                {activeStep.title}
                            </Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder={`Search ${activeStep.title}`}
                                    className="h-10 w-full rounded-md border bg-background pl-10 pr-3 text-sm"
                                />
                            </div>
                        </div>

                        <ScrollArea className="h-[55vh]">
                            <MissingStepComponentGrid
                                itemStepUid={activeStep.itemStepUid}
                                components={activeComponents}
                                onSelect={(componentUid) => {
                                    setDraftSelections((current) => ({
                                        ...current,
                                        [activeStep.stepUid]: componentUid,
                                    }));
                                }}
                            />
                        </ScrollArea>
                    </>
                ) : null}
            </div>
            <Modal.Footer>
                <div className="flex w-full items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={goToPrev}
                        disabled={activeIndex <= 0}
                    >
                        <ChevronLeft className="mr-2 size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={goToNext}
                        disabled={activeIndex >= steps.length - 1}
                    >
                        <ChevronRight className="mr-2 size-4" />
                    </Button>
                    <div className="flex-1" />
                    <Button type="button" variant="ghost" onClick={skipCurrent}>
                        Skip
                    </Button>
                    <Button type="button" onClick={handleDone}>
                        <Check className="mr-2 size-4" />
                        Done
                    </Button>
                </div>
            </Modal.Footer>
        </Modal.Content>
    );
}

function MissingStepComponentGrid({
    itemStepUid,
    components,
    onSelect,
}: {
    itemStepUid: string;
    components: any[];
    onSelect: (componentUid: string) => void;
}) {
    const ctx = useStepContext(itemStepUid);
    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
            {components.map((component) => (
                <ComponentItemCard
                    key={component.uid}
                    ctx={ctx}
                    component={component}
                    onSelect={() => onSelect(component.uid)}
                />
            ))}
        </div>
    );
}
