import { useState } from "react";
import { Menu } from "@/components/(clean-code)/menu";

import { useFormDataStore } from "../../_common/_stores/form-data-store";
import { UseStepContext } from "./ctx";

export function CustomComponentAction({ ctx }: { ctx: UseStepContext }) {
    const zus = useFormDataStore();
    const stepForm = ctx.cls.getStepForm();
    const customMode = stepForm?.meta?.custom;
    // useEffect(() => {
    //     setCustomMode(stepForm?.meta?.custom);
    // }, []);
    return (
        <Menu.Item
            onClick={() => {
                zus.dotUpdate(
                    `kvStepForm.${ctx.stepUid}.meta.custom`,
                    !customMode,
                );
            }}
            icon="add"
        >
            {customMode ? "Disable Custom" : "Enable Custom"}
        </Menu.Item>
    );
}
