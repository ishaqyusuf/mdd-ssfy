import { createContext, useContext, useMemo } from "react";
import { saveComponentPricingUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-pricing-use-case";
import FormInput from "@/components/common/controls/form-input";
import Modal from "@/components/common/modal";
import { _modal } from "@/components/common/modal/provider";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@gnd/ui/badge";
import { Form } from "@gnd/ui/form";
import { ScrollArea } from "@gnd/ui/scroll-area";

import { useFormDataStore } from "../../../_common/_stores/form-data-store";
import { ComponentHelperClass } from "../../../_utils/helpers/zus/step-component-class";

interface Props {
    cls: ComponentHelperClass;
}

const Context = createContext<ReturnType<typeof useInitContext>>(null);
const useCtx = () => useContext(Context);
const pricingOptions = ["Single Pricing", "Multi Pricing"] as const;
type PricingOption = (typeof pricingOptions)[number];
export function openDoorPriceModal(cls: ComponentHelperClass) {
    _modal.openModal(<DoorPriceModal cls={cls} />);
}
export function useInitContext(cls: ComponentHelperClass) {
    const priceModel = cls.getDoorPriceModel(cls.componentUid);

    const form = useForm({
        defaultValues: {
            ...priceModel.formData,
        },
    });
    async function save() {
        const data = form.getValues();
        const oldPv = priceModel.formData.priceVariants;
        const priceUpdate = await saveComponentPricingUseCase(
            Object.entries(data.priceVariants)
                .filter(([k, val]) => {
                    const prevPrice = oldPv?.[k]?.price;
                    return val?.price != prevPrice;
                })
                .map(([dependenciesUid, _data]) => ({
                    id: _data.id,
                    price: _data.price ? Number(_data.price) : null,
                    dependenciesUid,
                    dykeStepId: data.dykeStepId,
                    stepProductUid: data.stepProductUid,
                })),
        );
        await cls.fetchUpdatedPrice();
        _modal.close();
        toast.success("Pricing Updated.");
    }

    return {
        form,
        // priceModel: memoied.priceModel,
        cls,
        save,
        sizeList: priceModel.sizeList,
    };
}
export default function DoorPriceModal({ cls }: Props) {
    const ctx = useInitContext(cls);

    return (
        <Context.Provider value={ctx}>
            <Modal.Content>
                <Modal.Header
                    title={ctx.cls?.getComponent?.title || "Component Price"}
                    subtitle={"Edit door size price"}
                />
                <Form {...ctx.form}>
                    <ScrollArea
                        tabIndex={-1}
                        className="-mx-4 max-h-[50vh] px-4"
                    >
                        {ctx.sizeList?.map((variant, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-4 border-b py-2"
                            >
                                <div className="flex-1">
                                    <Badge className="" variant="outline">
                                        {variant.size}
                                    </Badge>
                                </div>
                                <div className="w-28">
                                    <FormInput
                                        prefix="$"
                                        tabIndex={index + 50}
                                        control={ctx.form.control}
                                        size="sm"
                                        name={`priceVariants.${variant.size}.price`}
                                    />
                                </div>
                            </div>
                        ))}
                    </ScrollArea>
                </Form>
                <Modal.Footer submitText="Save" onSubmit={ctx.save} />
            </Modal.Content>
        </Context.Provider>
    );
}
