import { useEffect } from "react";
import { createCustomDykeStepUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/dyke-steps-use-case";
import salesFormUtils from "@/app/(clean-code)/(sales)/_common/utils/sales-form-utils";
import {
    LegacyDykeFormStepContext,
    useLegacyDykeFormStep,
    useLegacyDykeFormStepContext,
} from "@/app/(clean-code)/(sales)/sales-book/(form)/_hooks/legacy/use-dyke-form-step";
import stepHelpers from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/step-helper";
import { Icons } from "@/components/_v1/icons";
import Button from "@/components/common/button";
import FormInput from "@/components/common/controls/form-input";
import { _modal, useModal } from "@/components/common/modal/provider";
import { useIsVisible } from "@/hooks/use-is-visible";
import { cn } from "@/lib/utils";
import { closestCorners } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { ArchiveRestoreIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Card } from "@gnd/ui/card";
import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";
import { Sortable, SortableItem } from "@gnd/ui/sortable";

import { getStepProduct } from "../../../../_action/get-dyke-step-product";
import { useDykeCtx, useDykeForm } from "../../../../_hooks/form-context";
import { BatchSelectionAction } from "../../../../_hooks/use-prod-batch-action";
import useStepItems, {
    StepItemCtx,
    useStepItemCtx,
} from "../../../../_hooks/use-step-items";
import { DykeItemStepSectionProps } from "../../../item-section/components-section";
import RestoreComponentsModal from "../../../modals/restore-modal";
import { StepProduct } from "./product";
import StepMenu from "./step-trigger";

export interface StepProductProps extends DykeItemStepSectionProps {
    stepActionNodeId;
    // rowIndex;
    // stepProducts: IStepProducts;
    // setStepProducts;
    // allowAdd;
    // allowCustom;
    // sortMode?: boolean;
}
export type IStepProducts = Awaited<ReturnType<typeof getStepProduct>>;
export function StepProducts({
    stepForm,
    stepIndex,
    stepActionNodeId,
}: // rowIndex,
// allowAdd,
// allowCustom,
// // stepProducts,
// sortMode,
// setStepProducts,
StepProductProps) {
    const legacyStepCtx = useLegacyDykeFormStepContext(stepIndex, stepForm);
    const {
        components,
        setComponents,
        itemCtx: { rowIndex },
        watch: { sortMode },
    } = legacyStepCtx;
    const { allowAdd, allowCustom } = legacyStepCtx.watch;
    const stepItemCtx = useStepItems(legacyStepCtx);
    const {
        openStepForm,
        isMultiSection,
        selectProduct,
        ctx,
        // deleteStepItem,
        deleteStepItemModal,
        // allowCustom,
        ...stepCtx
    } = stepItemCtx;

    const form = useDykeForm();
    const dykeCtx = useDykeCtx();
    const { isVisible, elementRef } = useIsVisible({});
    useEffect(() => {
        setTimeout(() => {
            if (!isVisible && elementRef.current) {
                const offset = -150; // Adjust this value to your desired offset
                const elementPosition =
                    elementRef.current.getBoundingClientRect().top +
                    window.scrollY;
                const offsetPosition = elementPosition + offset;
                // elementRef.current.scrollIntoView({
                //     behavior: "smooth",
                //     block: "start",
                // });
                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth",
                });
            }
        }, 300);
    }, []);
    const modal = useModal();

    return (
        <StepItemCtx.Provider value={stepItemCtx}>
            <LegacyDykeFormStepContext.Provider value={legacyStepCtx}>
                <StepMenu stepActionNodeId={stepActionNodeId} />
                <motion.div
                    ref={elementRef}
                    // initial={{ opacity: 0 }}
                    // animate={{ opacity: isVisible ? 1 : 0 }}
                    transition={{ duration: 1 }}
                    style={{}}
                >
                    <Sortable
                        orientation="mixed"
                        collisionDetection={closestCorners}
                        value={legacyStepCtx.components}
                        onValueChange={legacyStepCtx.setComponents}
                        overlay={
                            <div className="size-full rounded-md bg-primary/10" />
                        }
                    >
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                            {components
                                // ?.filter(
                                //     (s) => !s.custom && !s._metaData?.hidden
                                // )
                                .map((item, i) => (
                                    <SortableItem
                                        key={item.id}
                                        value={item.id}
                                        asTrigger={sortMode}
                                        asChild
                                    >
                                        <Card className="flex h-full flex-col border-none bg-red-50">
                                            <StepProduct
                                                className={cn(
                                                    "borno group  relative border-muted-foreground/10",
                                                    !sortMode &&
                                                        "hover:border-muted-foreground",
                                                )}
                                                isMultiSection={isMultiSection}
                                                select={selectProduct}
                                                loadingStep={ctx.loadingStep}
                                                item={item as any}
                                                itemIndex={i}
                                                deleteStepItem={() =>
                                                    deleteStepItemModal([item])
                                                }
                                                openStepForm={openStepForm}
                                                isRoot={stepCtx.isRoot}
                                            />
                                        </Card>
                                    </SortableItem>
                                ))}
                            {allowAdd && dykeCtx.superAdmin && (
                                <div className="p-4">
                                    <button
                                        onClick={() => {
                                            openStepForm();
                                        }}
                                        className={cn(
                                            "flex h-[200px] w-full flex-col items-center justify-center rounded-lg border hover:bg-slate-200 hover:shadow-xl",
                                        )}
                                    >
                                        <Icons.add />
                                    </button>
                                </div>
                            )}
                            {legacyStepCtx.deletedComponents?.length > 0 &&
                                dykeCtx.superAdmin && (
                                    <>
                                        <div className="p-4">
                                            <button
                                                onClick={() => {
                                                    _modal.openModal(
                                                        <RestoreComponentsModal
                                                            stepCtx={
                                                                legacyStepCtx
                                                            }
                                                        />,
                                                    );
                                                }}
                                                className={cn(
                                                    "flex h-[200px] w-full flex-col items-center justify-center rounded-lg border border-red-500 bg-red-50/50 hover:bg-red-50 hover:shadow-xl",
                                                )}
                                            >
                                                <ArchiveRestoreIcon />
                                                <Label className="mt-4">
                                                    Restore
                                                </Label>
                                            </button>
                                        </div>
                                    </>
                                )}
                            {allowCustom && (
                                <>
                                    <CustomInput
                                        currentValue={
                                            (stepForm.item.meta as any)?.custom
                                                ? stepForm.item.value
                                                : ""
                                        }
                                    />
                                </>
                            )}
                        </div>
                    </Sortable>

                    {isMultiSection && (
                        <div className="flex justify-end">
                            <Button onClick={() => selectProduct(false)}>
                                Proceed
                            </Button>
                        </div>
                    )}
                    <div className="flex justify-center">
                        {ctx.loadingStep && (
                            <Icons.spinner className="h-8 w-8 animate-spin" />
                        )}
                    </div>
                </motion.div>
                <BatchSelectionAction />
                {sortMode && (
                    <div className="fixed bottom-0  left-1/2 z-10 mb-16 shadow-xl">
                        <Button
                            onClick={() =>
                                stepHelpers.finishSort(legacyStepCtx)
                            }
                            size="sm"
                        >
                            Finish Sort
                        </Button>
                    </div>
                )}
            </LegacyDykeFormStepContext.Provider>
        </StepItemCtx.Provider>
    );
}
function CustomInput({ currentValue }) {
    const inputForm = useForm({
        defaultValues: {
            value: currentValue,
            price: null,
        },
    });
    const ctx = useLegacyDykeFormStep();
    const stepCtx = useStepItemCtx();
    async function createCustom() {
        const formData = inputForm.getValues();
        const resp = await createCustomDykeStepUseCase({
            price: formData.price,
            dependenciesUid: ctx.dependenciesUid,
            dykeStepId: ctx.step.step.id,
            title: formData.value,
        });
        stepCtx.selectProduct(true, {
            custom: true,
            ...resp.prod,
            product: {
                ...resp.prod.product,
            },
            _metaData: formData.price
                ? {
                      basePrice: formData.price,
                      price: salesFormUtils.salesProfileCost(
                          ctx.mainCtx.form,
                          formData.price,
                      ),
                  }
                : {},
        } as any);
        // ctx.
        //  const value = inputForm.getValues("value")?.trim();
        //  if (!value) toast.error("Invalid value");
        //  else onProceed(value);
    }
    return (
        <Form {...inputForm}>
            <div className="flex ">
                <div className="flex flex-col gap-2">
                    <FormInput
                        name="value"
                        control={inputForm.control}
                        label="Custom"
                    />
                    <FormInput
                        name="price"
                        control={inputForm.control}
                        label="Price"
                        type="number"
                    />
                    <div className="flex justify-end">
                        <Button size="sm" onClick={createCustom}>
                            Continue
                        </Button>
                    </div>
                </div>
            </div>
        </Form>
    );
}
