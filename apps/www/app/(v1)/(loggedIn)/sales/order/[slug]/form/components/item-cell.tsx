import React, { useContext, useEffect, useRef, useState } from "react";
import { SalesFormCtx } from "@/app/(v1)/(loggedIn)/sales/_actions/sales-form";
import AutoComplete from "@/components/_v1/auto-complete-tw";
import { deepCopy } from "@/lib/deep-copy";
import { openComponentModal } from "@/lib/sales/sales-invoice-form";
import { ISalesOrder, ISalesOrderForm } from "@/types/sales";
import { useFormContext } from "react-hook-form";

import { FormField } from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";
import { TableCell } from "@gnd/ui/table";

import { _getSalesItemPriceByProfile } from "../_actions/get-item-price";
import { InvoiceItemRowContext } from "../invoice-item-row-context";

export default function ItemCell({
    rowIndex,
    form,
    ctx,
}: {
    rowIndex;
    form;
    ctx?: SalesFormCtx;
}) {
    const { register } = form;
    // const orderItemComponentSlice = useAppSelector(
    //   (state) => state.orderItemComponent
    // );
    const { baseKey } = useContext(InvoiceItemRowContext);
    const _form = useFormContext<ISalesOrderForm>();
    // const baseKey = `items.${rowIndex}`;
    const isComponent = form.watch(`${baseKey}.meta.isComponent`);
    const item = form.watch(baseKey);
    const getCellValue = () => form.getValues(`items.${rowIndex}.description`);
    const [cellValue, setCellValue] = useState(getCellValue() || undefined);
    // const input = useRef();
    const [focused, setFocused] = useState(false);
    const [hover, setHover] = useState(false);
    useEffect(() => {
        setCellValue(getCellValue() || undefined);
    }, [rowIndex]);
    return (
        <TableCell
            onMouseEnter={(e) => setHover(true)}
            onMouseLeave={(e) => setHover(false)}
            onClick={() => {
                if (isComponent) openComponentModal(deepCopy(item), rowIndex);
                else {
                    // input?.current?.focus();
                }
            }}
            id="description"
            className="w-auto cursor-pointer p-0 px-1 py-0.5"
        >
            {/* <Input
        className="h-8 w-full p-1 font-medium"
        {...register(`${baseKey}.description`)}
      /> */}
            {isComponent == true ? (
                <button className="min-h-[32px]  w-full rounded-md border border-input p-1 font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <div
                        // dangerouslySetInnerHTML={{
                        //   __html: form.getValues(`${baseKey}.description`),
                        // }}
                        className="line-clamp-2s relative w-full p-0.5 text-start text-sm font-medium uppercase text-primary"
                    >
                        {form.getValues(`${baseKey}.description`)}
                    </div>
                </button>
            ) : (
                // <Input
                //     // ref={input}
                //     className="h-8 w-full p-1 font-medium uppercase"
                //     // {...register(`${baseKey}.description`)}
                //     value={cellValue}
                //     onChange={(e) => {
                //         setCellValue(e.target.value);
                //         form.setValue(
                //             `items.${rowIndex}.description`,
                //             e.target.value
                //         );
                //     }}
                // />
                <FormField<ISalesOrder>
                    name={`items.${rowIndex}.description`}
                    control={form.control}
                    render={({ field }) => (
                        <AutoComplete
                            {...field}
                            onFocus={(e) => {
                                // console.log(e);
                                setFocused(true);
                            }}
                            perPage={25}
                            onBlur={(e) => setFocused(false)}
                            options={focused ? ctx?.items : []}
                            itemText={"description"}
                            itemValue={"description"}
                            fluid
                            onSelect={async (e) => {
                                // console.log(e as any);
                                let data = (e as any)?.data as any;
                                const price = await _getSalesItemPriceByProfile(
                                    data?.description,
                                );
                                console.log(price);
                                if (price) {
                                    form.setValue(
                                        `items.${rowIndex}.price`,
                                        data?.price,
                                    );
                                    if (
                                        !form.getValues(`items.${rowIndex}.qty`)
                                    )
                                        form.setValue(
                                            `items.${rowIndex}.qty`,
                                            1,
                                        );
                                }
                            }}
                            // form={form}
                            uppercase
                            hideEmpty
                            // formKey={`items.${rowIndex}.description`}
                            allowCreate
                        />
                    )}
                />
            )}
        </TableCell>
    );
}
