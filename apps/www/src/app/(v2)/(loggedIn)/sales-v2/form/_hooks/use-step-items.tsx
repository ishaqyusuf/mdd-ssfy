"use client";

import {
    IStepProducts,
    StepProductProps,
} from "../components/step-items-list/item-section/step-products";

import { getMouldingStepProduct } from "../_action/get-dyke-step-product";

import { createContext, useContext, useEffect, useState } from "react";
import { DykeItemFormContext, useDykeCtx, useDykeForm } from "./form-context";
import { DykeDoorType, DykeStep } from "../../type";
import {
    getSlabDoorTypes,
    getStepProduct,
} from "../_action/get-dyke-step-product";
import { toast } from "sonner";
import { getNextDykeStepAction } from "../_action/get-next-dyke-step";
import {
    _deleteDuplicateDoorSteps,
    getDykeStepDoors,
} from "../_action/get-dyke-step-doors";

import { SaveStepProductExtra } from "../_action/save-step-product";

import { calculateComponentPrices } from "../components/step-items-list/item-section/step-products/calculate-prices";

import { generateRandomString } from "@/lib/utils";
import DeleteItemModal from "../components/modals/delete-item-modal";
import { useModal } from "@/components/common/modal/provider";
import { LegacyDykeFormStepType } from "@/app/(clean-code)/(sales)/sales-book/(form)/_hooks/legacy/use-dyke-form-step";
import StepComponentModal from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/modals/step-component-modal/step-component-modal";

export const StepItemCtx = createContext<ReturnType<typeof useStepItems>>(
    {} as any,
);
export const useStepItemCtx = () => useContext(StepItemCtx);
export default function useStepItems(stepCtx: LegacyDykeFormStepType) {
    const {
        step: stepForm,
        components: stepProducts,
        stepIndex,
        setComponents: setStepProducts,
    } = stepCtx;
    const form = useDykeForm();

    const item = useContext(DykeItemFormContext);

    let doorType = item.get.doorType();
    const isMoulding = doorType == "Moulding";
    const stepFormTitle = stepForm.step?.title;
    const ctx = useDykeCtx();
    const [step, setStep] = useState<"Door" | "Moulding" | "Slab" | null>(null);

    const [__uid, setUid] = useState<string>();
    useEffect(() => {
        setUid(generateRandomString(4));

        allowsCustom();
        calculateComponentPrices(form, item.rowIndex);
    }, []);
    const t = stepForm?.step?.title;
    const isMultiSection = t == "Moulding" || t == "Door";
    async function selectProduct(
        currentState,
        stepProd?: IStepProducts[0],
        custom = false,
    ) {
        // return;
        let proceed = !stepProd;
        if (isMultiSection && !proceed && stepProd) {
            item.multi.select(
                currentState,
                stepProd as any,
                stepFormTitle,
                () => {
                    selectProduct(false);
                },
            );
            return;
        }
        if (proceed) {
            stepProd = item.multi.validateMultiSelect(
                stepProducts,
                stepFormTitle,
            ) as any;
        }
        if (!stepProd || !stepProd?.product) {
            toast.error("Unable to proceed, no item selected");
            return;
        }
        ctx.startLoadingStep(async () => {
            const val =
                // stepProd?.product?.value ||
                stepProd?.product?.title;

            const hpt = form.getValues(
                `itemArray.${item.rowIndex}.item.housePackageTool`,
            );
            const stepTitle = stepForm.step?.title;

            const data: Partial<DykeStep["item"]> = {
                value: val,
                // qty: stepProd?.product?.qty,
                basePrice: 0,
                price: 0,
                //   price: salesFormUtils.salesProfileCost(form, basePrice),
                stepId: stepProd?.dykeStepId,
                prodUid: stepProd.uid,
                meta: {
                    custom,
                } as any,
                priceData: {},
                // title: stepProd?.product?.description,
            };
            if (!isMultiSection) {
                const baseUnitCost = (data.basePrice =
                    stepProd._metaData?.basePrice);
                const salesUnitCost = (data.price = stepProd._metaData?.price);
                data.priceData = {
                    baseUnitCost,
                    qty: 1,
                    baseTotalCost: baseUnitCost,
                    salesUnitCost,
                    salesTotalCost: salesUnitCost,
                    id: data.priceData?.id || generateRandomString(),
                };
                data.priceId = data.priceData.id;
            }

            switch (stepTitle) {
                case "Height":
                    const _doorType: DykeDoorType = hpt.doorType as any;
                    form.setValue(
                        `itemArray.${item.rowIndex}.item.housePackageTool`,
                        {
                            height: val,
                            totalDoors: 0,
                            totalPrice: 0,
                            doorType: _doorType,
                            _doorForm: {
                                ...(hpt._doorFormDefaultValue as any),
                            },
                            _doorFormDefaultValue: {
                                ...hpt._doorFormDefaultValue,
                            },
                            meta: {
                                priceTags:
                                    _doorType == "Moulding"
                                        ? {
                                              moulding: {
                                                  price: 0,
                                                  addon: 0,
                                              },
                                              components: 0,
                                          }
                                        : {
                                              components: 0,
                                              doorSizePriceTag: {},
                                          },
                            },
                            stepProduct: null as any,
                        },
                    );
                    break;
                case "Jamb Size":
                    form.setValue(
                        `itemArray.${item.rowIndex}.item.housePackageTool.jambSizeId`,
                        stepProd?.dykeProductId,
                    );
                    break;
                case "Door":
                    form.setValue(
                        `itemArray.${item.rowIndex}.item.housePackageTool.dykeDoorId`,
                        stepProd?.dykeProductId,
                    );
                    break;
                case "Specie":
                    break;
                case "Item Type":
                    form.setValue(
                        `itemArray.${item.rowIndex}.multiComponent.components`,
                        {},
                    );
                    form.setValue(
                        `itemArray.${item.rowIndex}.item.meta.doorType`,
                        stepProd?.product?.title as any,
                    );
                    switch (stepProd?.product?.title) {
                        case "Services":
                            await item.multi.initServices();
                            break;
                        case "Shelf Items":
                            form.setValue(
                                `itemArray.${item.rowIndex}.item.housePackageTool`,
                                null as any,
                            );
                            //clean up package tools
                            break;
                        case "Moulding":
                            form.setValue(
                                `itemArray.${item.rowIndex}.item.housePackageTool.moldingId`,
                                stepProd?.dykeProductId,
                            );
                        case "Interior":
                        case "Exterior":
                        case "Bifold":
                        case "Garage":
                        case "Moulding":
                        case "Door Slabs Only":
                            form.setValue(
                                `itemArray.${item.rowIndex}.item.housePackageTool.doorType`,
                                stepProd?.product?.title as any,
                            );
                            doorType = stepProd?.product?.title;
                            break;
                    }
                    break;
                case "Cutdown Height":
                    break;
            }

            const formSteps = form.getValues(
                `itemArray.${item.rowIndex}.item.formStepArray`,
            );
            formSteps[stepIndex].item = data as any;
            form.setValue(
                `itemArray.${item.rowIndex}.item.formStepArray.${stepIndex}.item` as any,
                data,
            );
            // form.setValue(
            //     `itemArray.${item.rowIndex}.item.formStepArray.${stepIndex}.item` as any,
            //     stepProd
            // );
            const seq =
                form.getValues(`itemArray.${item.rowIndex}.stepSequence`) || {};
            const stepSeq = stepProd.meta?.stepSequence;
            if (stepSeq?.length) {
                seq[stepProd.uid] = stepSeq;
                form.setValue(
                    `itemArray.${item.rowIndex}.stepSequence.${stepProd.uid}`,
                    stepSeq as any,
                );
            }
            let nextStepId = null;
            for (let si = stepIndex; si > -1; si--) {
                if (nextStepId) continue;
                const formStep = formSteps[si];
                const formSeq = seq[formStep.item.prodUid];
                if (formSeq) {
                    formSeq.map(({ id: fsId }) => {
                        const existingStep = formSteps.find(
                            (f) => f.step.id == fsId,
                        );

                        if (!existingStep && !nextStepId) nextStepId = fsId;
                    });
                }
            }

            if (nextStepId) {
                stepProd.nextStepId = nextStepId;
            }
            const nextSteps = await getNextDykeStepAction(
                stepForm.step as any,
                nextStepId ? null : (stepProd?.product as any),
                stepProd,
                [],
                doorType,
            );

            if (nextSteps?.length) {
                const currentNextStep = item.formStepArray[stepIndex + 1];
                if (currentNextStep) {
                    if (currentNextStep.step?.id == nextSteps[0]?.step?.id) {
                        item.toggleStep(item.openedStepIndex + 1);
                        return;
                    }
                }
                for (let i = item.formStepArray.length - 1; i > stepIndex; i--)
                    item.removeStep(i);
                item.appendStep(nextSteps as any);
                item.toggleStep(item.openedStepIndex + nextSteps.length);
            } else toast.error("Next step not found");
        });
    }
    const modal = useModal();
    function onCreate(stepItem: IStepProducts[number]) {
        if (stepItem.door) stepItem.product = stepItem.door as any;

        // TODO: set step product on created
        // TODO: sync with component loader to store new or update.

        setStepProducts((cd) => {
            const index = cd.findIndex((c) => c.id == stepItem.id);
            const ret = [...cd];

            if (index > -1) ret[index] = stepItem;
            else ret.push(stepItem);
            return ret;
        });
    }
    function openStepForm(itm?) {
        const {
            id,
            uid,
            custom,
            sortIndex,
            doorId,
            productCode,
            door: { query } = {} as any,
            product: {
                id: prodId,
                createdAt,
                updatedAt,
                value,
                description,
                img,
                meta,
                // query,
                ...prod
            },
            dykeProductId,
            ...stepProd
        }: IStepProducts[0] = itm ||
            stepProducts.filter((s) => !s._metaData.hidden)[0] || {
                dykeStepId: stepForm.step?.id,
                nextStepId: null,
                meta: {},
                _metaData: {},
                product: {
                    meta: {},
                },
            };
        if (!itm) stepProd.meta.deleted = {};
        let _meta: SaveStepProductExtra["_meta"] = {
            isMoulding: doorType == "Moulding",
            doorType: doorType,
            stepTitle: stepFormTitle,
            doorQuery: query,
        };
        const _item = itm
            ? {
                  ...itm,
                  _meta,
              }
            : ({
                  ...stepProd,
                  product: {
                      ...prod,
                      meta: {},
                  },
                  _meta,
              } as any);

        modal.openModal(
            <StepComponentModal
                ctx={stepCtx}
                item={_item}

                // onCreate={onCreate}
                // stepIndex={stepIndex}
                // stepForm={stepForm}
                // root={isRoot}
                // stepTitle={stepFormTitle}
                // mainForm={form}
                // rowIndex={item.rowIndex}
                // moulding={isMoulding && stepFormTitle == "Moulding"}
                // item={_item}
                // products={stepProducts}
            />,
        );
    }

    // async function deleteStepItem(index, stepProd: IStepProducts[0]) {
    //     switch (step) {
    //         case "Door":
    //             await _deleteDoorStep(stepProd);
    //             break;
    //         default:
    //             await _deleteStepItem(stepProd);
    //     }
    //     setStepProducts((current) => {
    //         const prods = [
    //             ...current.slice(0, index),
    //             ...current.slice(index + 1),
    //         ];
    //         return prods;
    //     });
    // }
    const isRoot = stepFormTitle == "Item Type";
    const [allowCustom, setAllowCustom] = useState(false);
    const customsChanged = form.watch(
        "data.settings.dyke.customInputSection.changed",
    );
    useEffect(() => {
        allowsCustom();
    }, [customsChanged]);
    function allowsCustom() {
        const settings = form.getValues(
            "data.settings.dyke.customInputSection.sections",
        );
        const title = stepForm.step.title;
        setAllowCustom(
            settings?.findIndex(
                (s) => s.name?.toLowerCase() == title?.toLowerCase(),
            ) > -1,
        );
    }
    const onDeleteItem = (stepItems) => {
        // setStepProducts((prods) => {
        //     let _prods = [...prods];
        //     stepItems.map((stepItem) => {
        //         let prodIndex = _prods.findIndex((p) => p.uid == stepItem.uid);
        //         if (prodIndex >= 0)
        //             _prods[prodIndex] = stepItem.deletedAt ? null : stepItem;
        //     });
        //     return _prods.filter(Boolean);
        // });
        stepCtx.reloadComponents();
        setUid(generateRandomString(4));
    };
    return {
        onDeleteItem,
        async deleteStepItemModal(items) {
            modal.openModal(
                <DeleteItemModal
                    lineItemIndex={item.rowIndex}
                    stepIndex={stepIndex}
                    invoiceForm={form}
                    stepForm={stepForm}
                    onComplete={onDeleteItem}
                    stepItems={items}
                />,
            );
        },
        stepIndex,
        __uid,
        allowCustom,
        isRoot,
        stepProducts,
        step,
        openStepForm,
        stepForm,
        isMultiSection,
        selectProduct,
        // deleteStepItem,
        ctx,
    };
}
