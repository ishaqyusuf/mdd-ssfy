import Money from "@/components/_v1/money";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";
import { cn } from "@/lib/utils";

import { TableCell, TableRow } from "@gnd/ui/table";

import { useDykeCtx } from "../../../../../_hooks/form-context";
import {
    useMultiComponentItem,
    useMultiComponentSizeRow,
} from "../../../../../_hooks/use-multi-component-item";
import { SizeForm } from "../../../../modals/select-door-heights";
import ItemPriceFinder from "../../item-price-finder";
import PriceBreakDownCell from "../price-breakdown-cell";

interface Props {
    size: SizeForm[string];
    componentItem: ReturnType<typeof useMultiComponentItem>;
}
export default function HousePackageSizeLineItem({
    size,
    componentItem,
}: Props) {
    const ctx = useDykeCtx();
    const sizeRow = useMultiComponentSizeRow(componentItem, size);
    const { form, prices, doorConfig } = componentItem;
    const itemData = componentItem.item.get.data();

    const hpt = itemData.item?.housePackageTool;
    return (
        <TableRow>
            <TableCell>{size.dimFt}</TableCell>
            {componentItem.isComponent.hasSwing && (
                <TableCell className="">
                    <FormSelect
                        size="sm"
                        options={["In Swing", "Out Swing"]}
                        control={form.control}
                        name={`${sizeRow.keys.swing}` as any}
                    />
                </TableCell>
            )}
            <TableCell className="">
                <FormInput
                    type="number"
                    list
                    className="w-[75px] sm:w-auto"
                    size="sm"
                    control={form.control}
                    name={`${sizeRow.keys.lhQty}` as any}
                />
            </TableCell>
            {!componentItem.isComponent.multiHandles ? (
                <></>
            ) : (
                <>
                    <TableCell>
                        <FormInput
                            size="sm"
                            type="number"
                            list
                            className="w-[75px] sm:w-auto"
                            control={form.control}
                            name={`${sizeRow.keys.rhQty}` as any}
                        />
                    </TableCell>
                </>
            )}
            {/* <TableCell>{size.dimFt?.replaceAll("in", '"')}</TableCell> */}
            {componentItem.calculatedPriceMode ? (
                <PriceBreakDownCell
                    componentItem={componentItem}
                    sizeRow={sizeRow}
                />
            ) : (
                <></>
            )}
            <TableCell className={cn(ctx.dealerMode && "hidden")}>
                <div className="flex max-w-[300px] flex-col items-stretch justify-center divide-y">
                    <div className="flex justify-between pt-1">
                        {prices.map((p) => (
                            <div className="flex-1" key={p.title}>
                                <div className="mx-1">
                                    <FormInput
                                        size="sm"
                                        type="number"
                                        className={cn(
                                            prices.length == 1 && "w-[80px]",
                                        )}
                                        control={form.control}
                                        name={
                                            `${
                                                sizeRow.keys[p.key as any]
                                            }` as any
                                        }
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </TableCell>

            <TableCell className="shidden lg:table-cell">
                <Money value={sizeRow.lineTotal} />
            </TableCell>
            <TableCell></TableCell>
        </TableRow>
    );
}
