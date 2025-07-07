import { DatePicker } from "@/components/_v1/date-range-picker";

import { ISalesOrder } from "@/types/sales";
import { Dot } from "lucide-react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

export default function SupplierCell({
    InputHelper,
    rowHover,
    index,
    suppliers,
}) {
    const [hover, setHover] = useState(false);
    const form = useFormContext<ISalesOrder>();
    const valueKey: any = `items.${index}.supplier`;
    const supplyDateKey: any = `items.${index}.meta.supplyDate`;
    const [supplier, date] = form.watch([valueKey, supplyDateKey]);
    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            className="relative"
        >
            <InputHelper
                index={index}
                formKey={"supplier"}
                options={suppliers}
                watchValue={[supplier]}
            />
            {(!rowHover || !supplier) && (
                <div className="absolute -top-[10px] -right-[10px]">
                    <Dot className="text-muted-foreground" />
                </div>
            )}
            {supplier && rowHover && (
                <div className="absolute  -top-[15px] -right-[15px]">
                    <div className="relative bg-white z-10">
                        {/* <Button
                            variant={"outline"}
                            size={"sm"}
                            className="p-1 h-6"
                        >
                            <Icons.calendar className="size-4 text-muted-foreground" />
                            <span className="text-muted-foreground text-xs ml-2">
                                {!date ? "Set Date" : formatDate(date)}
                            </span>
                        </Button> */}
                        <DatePicker
                            className="h-6 w-auto p-1"
                            // hideIcon={}
                            format="MM/DD/YY"
                            value={date}
                            setValue={async (value) => {
                                form.setValue(supplyDateKey, value);
                                // await updateProductionDate(data.id, value);
                                // setDate(value);
                                // toast.success("Production Due Date Updated!");
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
