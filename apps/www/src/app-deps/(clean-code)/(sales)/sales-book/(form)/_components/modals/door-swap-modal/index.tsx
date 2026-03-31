import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, EyeOff } from "lucide-react";
import Modal from "@/components/common/modal";
import { _modal } from "@/components/common/modal/provider";
import { toast } from "sonner";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";

import { getFormState } from "../../../_common/_stores/form-data-store";
import { useStepContext } from "../../components-section/ctx";
import SearchBar from "../../components-section/search-bar";
import { HptContext } from "@/components/forms/sales-form/context";
import { ComponentItemCard } from "../../../../../../../../components/forms/sales-form/component-item-card";
import { ComponentHelperClass } from "../../../_utils/helpers/zus/step-component-class";
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
) {
    const doorItemStepUid = ensureStepInSequence(cls, cls.stepUid);
    const doorHelper = new ComponentHelperClass(
        doorItemStepUid,
        component.uid,
        component,
    );

    doorHelper.selectComponent(true);
    const composed = composeDoor(doorHelper, swapDoor);
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

    function closeModal() {
        _modal.close();
    }

    function handleDoorPick(component) {
        if (!component?._metaData?.visible && component?.variations?.length) {
            setSelectedDoor(component);
            setVariationIndex(0);
            setView("visibility");
            return;
        }

        swapDoorWithPreservedRows(cls, component, door);
        closeModal();
    }

    function handleProceed() {
        if (!selectedDoor) return;

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
            selectConfiguredStepComponent(
                cls,
                first.stepUid,
                first.componentUid,
                false,
            );
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
        swapDoorWithPreservedRows(cls, selectedDoor, door);
        closeModal();
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
