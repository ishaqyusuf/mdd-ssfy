import { useMemo } from "react";
import { saveComponentPricingUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-pricing-use-case";
import {
    createCustomComponentUseCase,
    updateCustomComponentUseCase,
} from "@/app/(clean-code)/(sales)/_common/use-case/step-component-use-case";
import AutoComplete from "@/components/_v1/common/auto-complete";
import Button from "@/components/common/button";
import FormInput from "@/components/common/controls/form-input";
import { NumberInput } from "@/components/currency-input";
import { LabelInput } from "@/components/label-input";
import { generateRandomString } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Form } from "@gnd/ui/form";

import { useFormDataStore } from "../../_common/_stores/form-data-store";
import { ComponentHelperClass } from "../../_utils/helpers/zus/step-component-class";
import { UseStepContext } from "./ctx";

interface Props {
    ctx: UseStepContext;
}
export function CustomComponent({ ctx }: Props) {
    const zus = useFormDataStore();
    const stepForm = ctx.cls.getStepForm();
    const form = useForm({
        defaultValues: {
            title: undefined,
            basePrice: undefined,
            salesPrice: undefined,
        },
    });
    const [basePrice, title] = form.watch(["basePrice", "title"]);
    const customInputs = useMemo(
        () => ctx.stepComponents?.filter((s) => s._metaData.custom),
        [ctx.stepComponents],
    );
    const hasCost = useMemo(
        () => ctx.items?.filter((s) => s.salesPrice)?.length > 0,
        [ctx.items],
    );
    async function _continue() {
        const data = form.getValues();

        let cls: ComponentHelperClass;
        let eProd = customInputs?.find((s) => s.title == data.title);
        const productUid = eProd?.uid || generateRandomString(5);
        const priceModel = ctx.cls.getComponentPriceModel(productUid);
        // const pm = ctx.cls.getComponentPriceModel(generateRandomString());
        let currentPricingId = Object.entries(priceModel.priceVariants).find(
            ([k, d]) => d.current,
        )[0];
        const current = priceModel.priceVariants?.[currentPricingId];
        const currentPricingModel = priceModel?.pricing?.[currentPricingId];

        // return;

        if (!data.title) {
            toast.error("Invalid custom input");
            return;
        }

        if (!eProd) {
            eProd = (await createCustomComponentUseCase({
                title: data.title,
                price: data.basePrice ? +data.basePrice : null,
                stepId: stepForm?.stepId,
            })) as any;
            cls = new ComponentHelperClass(
                ctx.cls.itemStepUid,
                eProd.uid,
                eProd,
            );
            ctx.cls.addStepComponent(eProd);
        } else {
            if (eProd.basePrice != data.basePrice && data.basePrice) {
                eProd = await updateCustomComponentUseCase({
                    price: +data.basePrice,
                    id: eProd.id,
                });
                cls = new ComponentHelperClass(
                    ctx.cls.itemStepUid,
                    eProd.uid,
                    eProd,
                );
            }
        }
        if (eProd) {
            if (currentPricingModel?.price != data.basePrice) {
                await saveComponentPricingUseCase([
                    {
                        id: currentPricingModel?.id,
                        price: data.basePrice,
                        dykeStepId: ctx.cls.getStepForm().stepId,
                        stepProductUid: productUid,
                        dependenciesUid: current?.path,
                    },
                ]);
                await cls.fetchUpdatedPrice();
            }
            await cls.refreshStepComponentsData(true);
            if (!cls)
                cls = new ComponentHelperClass(ctx.cls.itemStepUid, eProd.uid);
        }
    }
    return (
        <Form {...form}>
            <div className="group relative flex min-h-[25vh]  flex-col  gap-4 p-2 xl:min-h-[40hv]">
                <LabelInput
                    placeholder="Custom Component"
                    value={title}
                    className="border-border uppercase"
                    onChange={(e) => {
                        form.setValue("title", e.target.value);
                    }}
                />
                {hasCost ? (
                    <NumberInput
                        prefix="$"
                        placeholder="Base Price"
                        value={basePrice}
                        onValueChange={(values) => {
                            form.setValue("basePrice", values.floatValue);
                        }}
                    />
                ) : null}
                <div className="flex justify-end">
                    <Button size="xs" onClick={_continue}>
                        Continue
                    </Button>
                </div>
            </div>
        </Form>
    );
}
