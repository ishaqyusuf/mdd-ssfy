import { useContext } from "react";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import Money from "@/components/_v1/money";
import FormCheckbox from "@/components/common/controls/form-checkbox";
import FormInput from "@/components/common/controls/form-input";

import { TableCell } from "@gnd/ui/table";

import {
    DykeItemFormContext,
    useDykeForm,
} from "../../../../../_hooks/form-context";
import { useMultiComponentItem } from "../../../../../_hooks/use-multi-component-item";
import PriceBreakDownCell from "../price-breakdown-cell";

interface Props {
    componentTitle;
    mdf;
}
export default function LineItemSection({ componentTitle, mdf }: Props) {
    const form = useDykeForm();

    const item = useContext(DykeItemFormContext);
    const componentItem = useMultiComponentItem(componentTitle);
    const rootKey = `itemArray.${item.rowIndex}.item`;
    const isMoulding = item.isType.moulding;

    const itemData = componentItem.item.get.data();
    const component =
        itemData.multiComponent.components[componentItem.componentTitle];

    return (
        <>
            <TableCell className="w-[400px]">
                {isMoulding ? (
                    componentTitle
                ) : (
                    <FormInput
                        size="sm"
                        list
                        control={form.control}
                        name={
                            `${componentItem.multiComponentComponentTitleKey}.description` as any
                        }
                    />
                )}
            </TableCell>
            {item.isType.service && (
                <>
                    <TableCell className="w-[50px]">
                        <FormCheckbox
                            control={form.control}
                            switchInput
                            list
                            name={
                                `${componentItem.multiComponentComponentTitleKey}.tax` as any
                            }
                        />
                    </TableCell>
                    <TableCell className="w-[50px]">
                        <FormCheckbox
                            control={form.control}
                            switchInput
                            list
                            name={
                                `${componentItem.multiComponentComponentTitleKey}.production` as any
                            }
                        />
                    </TableCell>
                </>
            )}
            <TableCell className="w-[150px]">
                <FormInput
                    type="number"
                    list
                    size="sm"
                    control={form.control}
                    name={
                        `${componentItem.multiComponentComponentTitleKey}.qty` as any
                    }
                />
            </TableCell>
            {isMoulding && componentItem.calculatedPriceMode && (
                <PriceBreakDownCell componentItem={componentItem} />
            )}
            <TableCell className="w-[150px]">
                <FormInput
                    type="number"
                    list
                    size="sm"
                    control={form.control}
                    name={
                        `${componentItem.multiComponentComponentTitleKey}.${
                            isMoulding
                                ? "priceTags.moulding.addon"
                                : "unitPrice"
                        }` as any
                    }
                />
            </TableCell>
            <TableCell className="w-[150px]">
                <Money value={componentItem.totalPrice} />
            </TableCell>
            <TableCell className="flex w-[50px]">
                <ConfirmBtn
                    onClick={() => componentItem.removeLine(mdf.removeTab)}
                    size="icon"
                />
                {/* {isMoulding && (
                    <ItemPriceFinder
                        moldingId={component?.toolId}
                        componentTitle={componentTitle}
                        componentItem={componentItem}
                    />
                )} */}
            </TableCell>
        </>
    );
}
