import Portal from "@/components/_v1/portal";
import { _modal } from "@/components/common/modal/provider";
import { useState } from "react";

import { toast } from "sonner";
import { MenuItem } from "@/components/_v1/data-table/data-table-row-actions";
import { Icons } from "@/components/_v1/icons";
import { Menu } from "@/components/(clean-code)/menu";
import DevOnly from "@/_v2/components/common/dev-only";
import { DykeStepMeta } from "@/app/(v2)/(loggedIn)/sales-v2/type";
import { cn } from "@/lib/utils";
import DependenciesModal from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/modals/deps-modal";
import RestoreComponentsModal from "../../../modals/restore-modal";
import { updateDykeStepMeta } from "../../../../_action/dyke-step-setting";
import HeightSettingsModal from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/modals/height-settings-modal/height-settings-modal";
import { useLegacyDykeFormStep } from "@/app/(clean-code)/(sales)/sales-book/(form)/_hooks/legacy/use-dyke-form-step";

export default function StepMenu({ stepActionNodeId }) {
    const stepCtx = useLegacyDykeFormStep();
    const {
        stepIndex,
        watch: { allowCustom, allowAdd, sortMode, enableSearch },
        step: stepForm,
        mainCtx: { superAdmin },
    } = stepCtx;
    const form = stepCtx.mainCtx.form;
    const rowIndex = stepCtx.itemCtx.rowIndex;

    // const finishSort = async () => {
    //     setSortMode(false);
    //     await sortComponents(
    //         stepProducts.map((prod, index) => {
    //             const data = { sortIndex: index };
    //             return {
    //                 id: prod.id,
    //                 data,
    //             };
    //         })
    //     );
    // };

    function conditionSettings(settingKey: keyof DykeStepMeta) {
        _modal.openModal(
            <DependenciesModal settingKey={settingKey} stepCtx={stepCtx} />
        );
    }
    async function toggleStepSetting(key: keyof typeof stepForm.step.meta) {
        const meta = stepForm.step.meta || {};
        const state = ((meta as any)[key] = !meta[key]);
        await updateDykeStepMeta(stepForm.step.id, meta);
        form.setValue(
            `itemArray.${rowIndex}.item.formStepArray.${stepIndex}.step.meta.${key}` as any,
            state
        );
    }
    return (
        <Portal nodeId={stepActionNodeId}>
            <div className={cn("px-2", !superAdmin && "hidden")}>
                <Menu Icon={Icons.more}>
                    <MenuItem
                        onClick={() => conditionSettings("priceDepencies")}
                    >
                        Pricing Deps
                    </MenuItem>
                    <MenuItem onClick={() => conditionSettings("stateDeps")}>
                        Component Deps
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            _modal.openModal(
                                <RestoreComponentsModal stepCtx={stepCtx} />
                            );
                        }}
                    >
                        Restore Component
                    </MenuItem>
                    <MenuItem onClick={stepCtx.sortToggle}>
                        {sortMode ? "Finish Sort" : "Sort"}
                    </MenuItem>
                    <MenuItem onClick={() => toggleStepSetting("allowCustom")}>
                        {allowCustom ? "Disable " : "Enable "}
                        Custom
                    </MenuItem>
                    <MenuItem onClick={() => toggleStepSetting("enableSearch")}>
                        {enableSearch ? "Disable " : "Enable "}
                        Search
                    </MenuItem>
                    <MenuItem onClick={() => toggleStepSetting("allowAdd")}>
                        {allowAdd ? "Disable " : "Enable "}
                        Add
                    </MenuItem>
                    {stepCtx.isDoor && (
                        <MenuItem
                            onClick={() => {
                                _modal.openSheet(
                                    <HeightSettingsModal ctx={stepCtx} />
                                );
                            }}
                        >
                            Height Settings
                        </MenuItem>
                    )}
                </Menu>
            </div>
        </Portal>
    );
}
