import salesFormUtils from "@/app/(clean-code)/(sales)/_common/utils/sales-form-utils";
import { useModal } from "@/components/common/modal/provider";
import { ComponentPrice } from "@/db";
import { timeout } from "@/lib/timeout";
import { generateRandomString, safeFormText } from "@/lib/utils";
import { HousePackageToolMeta } from "@/types/sales";
import { toast } from "sonner";

import { useDoorSizeModal } from "../components/modals/door-size-modal";
import { IStepProducts } from "../components/step-items-list/item-section/step-products";
import { useDykeForm } from "./form-context";

export function useMultiSelector(rowIndex, get) {
    const form = useDykeForm();
    const modal = useModal();

    const sizeModal = useDoorSizeModal(form, rowIndex);
    const multi = {
        async initServices() {
            // const [uid, multiDyke, components] = form.getValues([
            //     `itemArray.${rowIndex}.multiComponent.uid`,
            //     `itemArray.${rowIndex}.multiComponent.multiDyke`,
            //     `itemArray.${rowIndex}.multiComponent.components`,
            // ]);

            // if (!uid) {
            form.setValue(
                `itemArray.${rowIndex}.multiComponent.uid`,
                generateRandomString(4),
            );
            form.setValue(
                `itemArray.${rowIndex}.multiComponent.multiDyke`,
                true,
            );
            form.setValue(`itemArray.${rowIndex}.multiComponent.components`, {
                [generateRandomString(4)]: {
                    checked: true,
                    uid: generateRandomString(4),
                },
            } as any);
            await timeout(1000);
            // }
        },
        watchMultiComponent() {
            return form.watch(
                `itemArray.${rowIndex}.multiComponent.components`,
            );
        },
        watchItemSelected(title): boolean {
            return form.watch(
                `itemArray.${rowIndex}.multiComponent.components.${title}.checked`,
            );
        },
        validateMultiSelect(products: IStepProducts, stepFormTitle) {
            const items = form.getValues(
                `itemArray.${rowIndex}.multiComponent.components`,
            );

            const checkedItems = Object.values(items || {}).filter(
                (b) => b?.checked,
            );
            const isMoulding = stepFormTitle == "Moulding";
            const pkdId = get.packageToolId(
                isMoulding ? "molding" : "dykeDoor",
            );

            if (!checkedItems.length) {
                toast.error("Select atleast one item to proceed");
                return false;
            }
            const checked = Object.entries(items)
                .map(([k, v]) => v?.checked && k)
                .filter(Boolean);
            const prods = products.filter((p) =>
                checked.includes(safeFormText(p.product.title) as any),
            );
            let prod = prods[0];
            if (pkdId) {
                let stillChecked = prods.find((p) => p.dykeProductId == pkdId);
                if (stillChecked) prod = stillChecked;
                form.setValue(
                    `itemArray.${rowIndex}.stillChecked`,
                    stillChecked != null,
                );
            }
            // form.setValue(
            //     `itemArray.${rowIndex}.multiComponent.rowIndex`,
            //     rowIndex
            // );
            form.setValue(
                `itemArray.${rowIndex}.multiComponent.rowIndex`,
                rowIndex,
            );
            return prod;
        },
        select(
            currentState,
            stepProd: IStepProducts[0],
            stepFormTitle,
            onSelect,
        ) {
            const safeTitle = safeFormText(stepProd.product.title);
            const isMoulding = stepFormTitle == "Moulding";
            const basePath =
                `itemArray.${rowIndex}.multiComponent.components.${safeTitle}` as any;
            const uid = form.getValues(`${basePath}.uid` as any);
            form.setValue(`${basePath}.toolId` as any, stepProd.doorId);
            form.setValue(`${basePath}.stepProductId` as any, stepProd.id);
            form.setValue(`${basePath}.stepProduct` as any, stepProd);
            if (isMoulding) {
                form.setValue(
                    `${basePath}.toolId` as any,
                    stepProd.dykeProductId,
                );
                const componentPrice = stepProd._metaData.price || 0;
                // .product.meta?.priced
                // ? stepProd.product.price
                // : 0;
                const priceTags = (
                    isMoulding
                        ? {
                              moulding: {
                                  price: componentPrice,
                                  basePrice: stepProd._metaData?.basePrice,
                                  addon: 0,
                              },
                              components: 0,
                          }
                        : {
                              doorSizePriceTag: {},
                              components: 0,
                          }
                ) as HousePackageToolMeta["priceTags"];

                form.setValue(`${basePath}.priceTags` as any, priceTags);
                const pData =
                    form.getValues(`${basePath}.mouldingPriceData` as any) ||
                    {};
                form.setValue(
                    `${basePath}.mouldingPriceData` as any,
                    salesFormUtils.componentPrice.update(
                        form,
                        pData,
                        stepProd._metaData?.basePrice,
                    ),
                );
            }
            if (!uid)
                form.setValue(
                    `${basePath}.uid` as any,
                    generateRandomString(4),
                );
            if (!isMoulding) {
                // form.setValue(`${basePath}.checked` as any, true);
                // sizeModal.open(safeTitle);
                sizeModal.open(safeTitle, {
                    onProceed: () => {
                        onSelect();
                    },
                });
                // modal.openModal(
                //     <SelectDoorHeightsModal
                //         form={form}
                //         stepProd={stepProd}
                //         productTitle={stepProd?.product?.title as any}
                //         rowIndex={rowIndex}
                //     />
                // );
                return;
            } else form.setValue(`${basePath}.checked` as any, !currentState);
        },
        isChecked(stepProd) {
            const safeTitle = safeFormText(stepProd.product.title);
            return form.getValues(
                `itemArray.${rowIndex}.multiComponent.components.${safeTitle}.checked`,
            );
        },
    };
    return multi;
}
