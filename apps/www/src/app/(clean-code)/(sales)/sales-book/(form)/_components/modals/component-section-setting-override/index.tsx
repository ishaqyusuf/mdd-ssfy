import { createContext, useContext, useEffect, useMemo } from "react";
import {
    saveComponentVariantUseCase,
    updateSectionOverrideUseCase,
} from "@/app/(clean-code)/(sales)/_common/use-case/step-component-use-case";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import { ComboxBox } from "@/components/(clean-code)/custom/controlled/combo-box";
import FormCheckbox from "@/components/common/controls/form-checkbox";
import FormSelect from "@/components/common/controls/form-select";
import Modal from "@/components/common/modal";
import { _modal } from "@/components/common/modal/provider";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Form } from "@gnd/ui/form";

import { useFormDataStore } from "../../../_common/_stores/form-data-store";
import { ComponentHelperClass } from "../../../_utils/helpers/zus/step-component-class";

interface Props {
    cls: ComponentHelperClass;
}

const Context = createContext<ReturnType<typeof useInitContext>>(null);
const useCtx = () => useContext(Context);
export function openSectionSettingOverride(cls: ComponentHelperClass) {
    _modal.openModal(<ComponentVariantModal cls={cls} />);
}
export function useInitContext(cls: ComponentHelperClass, componentsUid) {
    const [componentUid, ...rest] = componentsUid;
    const stepUid = cls.stepUid;
    const zus = useFormDataStore();

    const component = cls.component;
    const data = cls.getComponentVariantData();
    const step = cls.getStepForm(); // zus.kvStepForm[stepUid];
    const form = useForm({
        defaultValues: {
            variations: component?.variations,
        },
    });
    const varArray = useFieldArray({
        control: form.control,
        name: "variations",
    });
    async function save() {
        const formData = form
            .getValues("variations")
            .filter((c) => c.rules.length);
        await saveComponentVariantUseCase(componentsUid, formData);
        _modal.close();
        toast.success("Component Visibility Updated.");
        cls.updateStepComponentVariants(formData, componentsUid);
        cls.refreshStepComponentsData();
    }
    function addRule() {
        varArray.append({
            rules: [{ componentsUid: [], stepUid: null, operator: "is" }],
        });
    }
    return {
        varArray,
        data,
        step,
        form,
        save,
        addRule,
        componentsUid,
    };
}
export default function ComponentVariantModal({ cls }: Props) {
    const form = useForm({
        defaultValues: cls.component?.sectionOverride || {
            hasSwing: false,
            noHandle: false,
            overrideMode: false,
        },
    });
    const overrideMode = form.watch("overrideMode");
    async function save() {
        const data = form.getValues();
        const resp = await updateSectionOverrideUseCase(cls.component.id, data);
        cls.updateComponentKey("sectionOverride", data, cls.componentUid);
        _modal.close();
        toast.success("Saved");
    }
    return (
        <Modal.Content>
            <Modal.Header
                title={"Edit Component Section Override"}
                subtitle={"Add override rules to this component"}
            />
            <Form {...form}>
                <div className="h-[25vh]">
                    <div className="grid gap-4 pb-4">
                        <FormCheckbox
                            switchInput
                            control={form.control}
                            name={`overrideMode`}
                            label="Activate Component Section Override"
                            description=""
                        />

                        <FormCheckbox
                            switchInput
                            disabled={!overrideMode}
                            control={form.control}
                            name={`noHandle`}
                            label="Single Handle Mode"
                            description="Turn on if this component does not have the LH and RH attribute"
                            className={cn(!overrideMode && "hidden")}
                        />
                        <FormCheckbox
                            disabled={!overrideMode}
                            switchInput
                            control={form.control}
                            className={cn(!overrideMode && "hidden")}
                            name={`hasSwing`}
                            label="Swing Input"
                            description="Turn on if this component does not have swing attribute"
                        />
                    </div>
                </div>
            </Form>
            <Modal.Footer submitText="Save" onSubmit={save} />
        </Modal.Content>
    );
}
