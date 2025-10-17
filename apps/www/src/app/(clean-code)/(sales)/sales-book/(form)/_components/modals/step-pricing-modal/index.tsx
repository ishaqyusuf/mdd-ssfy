import { createContext, useContext, useMemo } from "react";
import { updateStepMetaUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/step-component-use-case";
import { ComboxBox } from "@/components/(clean-code)/custom/controlled/combo-box";
import FormSelect from "@/components/common/controls/form-select";
import Modal from "@/components/common/modal";
import { _modal } from "@/components/common/modal/provider";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Form } from "@gnd/ui/form";

import { useFormDataStore } from "../../../_common/_stores/form-data-store";
import { StepHelperClass } from "../../../_utils/helpers/zus/step-component-class";

interface Props {
    stepUid;
}

const Context = createContext<ReturnType<typeof useInitContext>>(null);
const useCtx = () => useContext(Context);
const pricingOptions = ["Single Pricing", "Multi Pricing"] as const;
type PricingOption = (typeof pricingOptions)[number];
export function openStepPricingModal(stepUid) {
    _modal.openModal(<StepPricingModal stepUid={stepUid} />);
}
export function useInitContext(itemStepUid) {
    const cls = useMemo(() => {
        return new StepHelperClass(itemStepUid);
    }, [itemStepUid]);

    const step = cls.getStepForm();
    const data = cls.getComponentVariantData();

    const stepList = data.steps;

    const form = useForm({
        defaultValues: {
            meta: step?.meta,
            pricingOption:
                step?.meta?.priceStepDeps?.length > 0
                    ? "Multi Pricing"
                    : ("Single Pricing" as PricingOption),
        },
    });
    const pricingOption = form.watch("pricingOption");

    async function save() {
        const { meta } = form.getValues();

        if (pricingOption == "Single Pricing") {
            meta.priceStepDeps = [];
        } else {
            if (meta.priceStepDeps?.length == 0 || !meta.priceStepDeps) {
                toast.error(
                    `Multi Pricing requires atleast one price dependencies.`,
                );
                return;
            }
        }
        const resp = await updateStepMetaUseCase(step?.stepId, meta);
        cls.updateStepFormMeta(meta);
        cls.refreshStepComponentsData();
        _modal.close();
        toast.success("Pricing Updated.");
    }

    return {
        form,
        save,
        stepList,
        pricingOption,
    };
}
export default function StepPricingModal({ stepUid }: Props) {
    const ctx = useInitContext(stepUid);
    return (
        <Context.Provider value={ctx}>
            <Modal.Content>
                <Modal.Header
                    title={"Step Pricing"}
                    subtitle={
                        "A component can have a single price or multiple prices based on dependent components."
                    }
                />
                <Form {...ctx.form}>
                    <FormSelect
                        options={[...pricingOptions]}
                        name="pricingOption"
                        label={"Pricing Type"}
                        size="sm"
                        control={ctx.form.control}
                    />
                    {ctx.pricingOption == "Multi Pricing" ? (
                        <ComboxBox
                            maxSelection={999}
                            maxStack={5}
                            options={ctx.stepList}
                            labelKey="title"
                            valueKey="uid"
                            className="w-full"
                            placeholder="Select Steps"
                            label={"Pricing Steps Dependencies"}
                            control={ctx.form.control}
                            name={`meta.priceStepDeps`}
                        />
                    ) : null}
                </Form>
                <Modal.Footer submitText="Save" onSubmit={ctx.save} />
            </Modal.Content>
        </Context.Provider>
    );
}
