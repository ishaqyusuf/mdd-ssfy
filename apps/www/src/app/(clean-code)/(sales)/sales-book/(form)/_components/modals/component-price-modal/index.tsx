import { createContext, useContext, useMemo } from "react";
import { saveComponentPricingUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-pricing-use-case";
import FormInput from "@/components/common/controls/form-input";
import Modal from "@/components/common/modal";
import { _modal } from "@/components/common/modal/provider";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@gnd/ui/badge";
import { Form } from "@gnd/ui/form";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { useFormDataStore } from "../../../_common/_stores/form-data-store";
import { ComponentHelperClass } from "../../../_utils/helpers/zus/step-component-class";

interface Props {
    cls: ComponentHelperClass;
}

const Context = createContext<ReturnType<typeof useInitContext>>(null);
const useCtx = () => useContext(Context);
const pricingOptions = ["Single Pricing", "Multi Pricing"] as const;
type PricingOption = (typeof pricingOptions)[number];
export function openEditComponentPrice(cls: ComponentHelperClass) {
    _modal.openModal(<ComponentPriceModal cls={cls} />);
}
export function useInitContext(cls: ComponentHelperClass) {
    const memoied = useMemo(() => {
        const step = cls.getStepForm();
        const priceModel = cls.getComponentPriceModel(cls.componentUid);

        return {
            step,
            priceModel,
        };
    }, [cls]);

    const form = useForm<ReturnType<typeof cls.getComponentPriceModel>>({
        defaultValues: memoied.priceModel,
    });
    async function save() {
        const data = form.getValues("pricing");
        // const updates = ;
        const priceUpdate = await saveComponentPricingUseCase(
            Object.entries(data)
                .filter(([k, val]) => {
                    const prevPrice = memoied.priceModel.pricing?.[k]?.price;
                    return val?.price != prevPrice;
                })
                .map(([dependenciesUid, data]) => ({
                    id: data.id,
                    price: data.price ? Number(data.price) : null,
                    dependenciesUid,
                    dykeStepId: cls.getStepForm().stepId,
                    stepProductUid: cls.componentUid,
                })),
        );
        await cls.fetchUpdatedPrice();
        _modal.close();
        toast.success("Pricing Updated.");
    }

    return {
        form,
        priceModel: memoied.priceModel,
        cls,
        save,
    };
}
export default function ComponentPriceModal({ cls }: Props) {
    const ctx = useInitContext(cls);
    return (
        <Context.Provider value={ctx}>
            <Modal.Content>
                <Modal.Header
                    title={ctx.cls?.getComponent?.title || "Component Price"}
                    subtitle={"Edit component price"}
                />
                <Form {...ctx.form}>
                    {ctx.priceModel?.priceVariants?.length > 7 ? (
                        <>
                            <Tabs>
                                <TabsList>
                                    <TabsTrigger value="priceList">
                                        Price List
                                    </TabsTrigger>
                                    <TabsTrigger value="groupPricing">
                                        Grouped Pricing
                                    </TabsTrigger>
                                </TabsList>
                                <ScrollArea className="-mr-6 max-h-[50vh] overflow-auto">
                                    <TabsContent value="priceList">
                                        <MainTab />
                                    </TabsContent>
                                    <TabsContent value="groupPricing">
                                        <GroupPriceTab />
                                    </TabsContent>
                                </ScrollArea>
                            </Tabs>
                        </>
                    ) : (
                        <MainTab />
                    )}
                </Form>
                <Modal.Footer submitText="Save" onSubmit={ctx.save} />
            </Modal.Content>
        </Context.Provider>
    );
}
function GroupPriceTab({}) {
    return <></>;
}
function MainTab({}) {
    const ctx = useCtx();
    return (
        <>
            {ctx.priceModel?.priceVariants?.map((variant, index) => (
                <div
                    key={index}
                    className={cn(
                        "flex items-center gap-4 border-b py-2",
                        variant.current && "bg-emerald-50",
                    )}
                >
                    <div className="flex-1">
                        {variant?.title?.map((title) => (
                            <Badge className="" variant="outline" key={title}>
                                {title}
                            </Badge>
                        ))}
                    </div>
                    <div className="w-28">
                        <FormInput
                            prefix="$"
                            control={ctx.form.control}
                            size="sm"
                            name={`pricing.${variant.path}.price`}
                        />
                    </div>
                </div>
            ))}
        </>
    );
}
