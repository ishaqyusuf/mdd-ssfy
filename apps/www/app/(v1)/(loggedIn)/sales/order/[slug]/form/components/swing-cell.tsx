"use client";

import { useEffect, useState } from "react";
import AutoComplete2 from "@/components/_v1/auto-complete-tw";
import { ISalesOrder } from "@/types/sales";

import { FormField } from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";
import { TableCell } from "@gnd/ui/table";

import { SalesInvoiceCellProps } from "./sales-invoice-tr";

export default function SwingCell({
    rowIndex,
    ctx,
    form,
}: SalesInvoiceCellProps) {
    const getSwingValue = () => form.getValues(`items.${rowIndex}.swing`);
    const [swing, setSwing] = useState<string | undefined>(
        getSwingValue() || undefined,
    );
    useEffect(() => {
        // setSwing(getSwingValue() || undefined);
    }, [rowIndex]);
    return (
        <TableCell id="swing" className="p-1">
            <FormField<ISalesOrder>
                name={`items.${rowIndex}.swing`}
                control={form.control}
                render={({ field }) => (
                    <Input className="h-8 w-16  p-1  font-medium" {...field} />
                    // <AutoComplete2
                    //     allowCreate
                    //     fluid
                    //     {...field}
                    //     options={ctx?.swings}
                    // />
                )}
            />

            {/* <Input
        className="h-8 w-16  p-1  font-medium"
        value={swing}
        onChange={(e) => {
          setSwing(e.target.value);
          form.setValue(`items.${rowIndex}.swing`, e.target.value);
        }}
      /> */}
            {/* <AutoComplete
        keyName={`items.${rowIndex}.swing`}
        className="w-24"
        id="swing"
        allowCreate
        form={form}
        list={ctx?.swings}
      /> */}
        </TableCell>
    );
}
