import { useEffect, useMemo, useState } from "react";
import { saveStepComponent } from "@/actions/save-step-component";
import { updateComponentPricingAction } from "@/actions/update-component-pricing-action";
import { useStepContext } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/components-section/ctx";
import { ComponentHelperClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import Button from "@/components/common/button";
import { NumberInput } from "@/components/currency-input";
import { LabelInput } from "@/components/label-input";
import { generateRandomString } from "@/lib/utils";
import { CUSTOM_IMG_ID } from "@/utils/constants";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";

import { Label } from "@gnd/ui/label";

export function CustomComponentForm({ itemStepUid }) {
    const ctx = useStepContext(itemStepUid);
    const customInputs = useMemo(
        () => ctx.stepComponents?.filter((s) => s._metaData.custom),
        [ctx.stepComponents],
    );

    const form = useForm({
        defaultValues: {
            title: undefined,
            basePrice: undefined,
            salesPrice: undefined,
            editMode: true,
            saveData: undefined,
            pricingUpdated: undefined,
        },
    });
    const formData = form.watch();
    async function saveComponentPrice() {
        const uid = formData.saveData.uid;
        const priceModel = ctx.cls.getComponentPriceModel(uid);
        const dependenciesUid = priceModel.priceVariants?.find(
            (d) => d.current,
        )?.path;

        //  let currentPricingId = Object.entries(priceModel.priceVariants).find(
        //     ([k, d]) => d.current,
        // )[0];
        const current = priceModel.pricing?.[dependenciesUid];
        // const currentPricingModel = priceModel?.pricing?.[current?.];

        if (current?.price == formData.basePrice) refreshAndSelectComponent();
        else {
            savePriceAction.execute({
                stepId: ctx.cls.getStepForm().stepId,
                stepProductUid: uid,
                pricings: [
                    {
                        id: current?.id || undefined,
                        price: formData?.basePrice,
                        dependenciesUid,
                    },
                ],
            });
        }
    }
    const savePriceAction = useAction(updateComponentPricingAction, {
        onSuccess(data) {
            form.setValue("pricingUpdated", generateRandomString());
            // refreshAndSelectComponent(data.input.stepProductUid);
        },
        onError(error) {},
    });
    useEffect(() => {
        let data = formData.saveData;
        if (data) {
            ctx.cls.addStepComponent(data);

            if (formData.basePrice) {
                saveComponentPrice();
            } else refreshAndSelectComponent();
        }
    }, [formData.saveData]);
    useEffect(() => {
        if (formData.pricingUpdated) {
            refreshAndSelectComponent();
        }
    }, [formData.pricingUpdated, formData.saveData]);
    // saveAction.hasSucceeded
    const saveAction = useAction(saveStepComponent, {
        onError(e) {},
        onSuccess(data) {
            form.setValue("saveData", data.data);
        },
    });
    const [componentCls, setComponentCls] = useState<ComponentHelperClass>();
    useEffect(() => {
        if (!componentCls) return;
        setTimeout(() => {
            componentCls.selectComponent();
        }, 500);
    }, [componentCls, formData.saveData]);
    async function refreshAndSelectComponent() {
        const uid = formData.saveData.uid;
        await ctx.cls.refreshStepComponentsData(true);
        let cls = new ComponentHelperClass(itemStepUid, uid);
        if (formData?.basePrice) await cls.fetchUpdatedPrice();
        setComponentCls(cls);

        // componentCls.selectComponent();
    }
    function save() {
        let existing = customInputs?.find(
            (i) =>
                i.title?.toLocaleLowerCase() ==
                formData?.title?.toLocaleLowerCase(),
        );

        saveAction.execute({
            id: existing?.id,
            custom: true,
            img: CUSTOM_IMG_ID,
            meta: {},
            name: formData.title,
            stepId: stepForm.stepId,
        });
    }
    const stepForm = ctx.cls.getStepForm();
    if (!stepForm?.meta?.custom) return null;
    return (
        <div className="min-h-[56px] rounded-lg border  font-mono">
            <div className="border-b p-4 py-2">
                <Label>Custom</Label>
            </div>
            <div className="grid gap-4 p-4">
                <div className="grid gap-2">
                    <Label>Component</Label>
                    <LabelInput
                        className="rounded-none border-border uppercase"
                        value={formData.title}
                        onChange={(e) => form.setValue("title", e.target.value)}
                    />
                </div>
                <div className="flex items-center justify-end gap-4">
                    <Label>Cost Price</Label>
                    <NumberInput
                        prefix="$"
                        value={formData.basePrice}
                        className="w-12 rounded-none"
                        onValueChange={(values) => {
                            form.setValue(
                                "basePrice",
                                values.floatValue || null,
                            );
                        }}
                    />
                </div>
                <div className="flex justify-end">
                    <Button
                        disabled={saveAction.isExecuting}
                        onClick={save}
                        size="xs"
                    >
                        Proceed
                    </Button>
                </div>
            </div>
        </div>
    );
}
