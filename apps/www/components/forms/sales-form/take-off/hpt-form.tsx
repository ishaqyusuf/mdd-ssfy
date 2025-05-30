import { useState } from "react";
import { useTakeoffItem } from "./context";
import { useCreateContext } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/hpt-step/ctx";
import { ComponentHelperClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import { composeDoor } from "@/lib/sales/compose-door";
import { updateDoorGroupForm } from "@/lib/sales/update-door-form";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { Button } from "@gnd/ui/button";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { cn } from "@gnd/ui/cn";
import { Badge } from "@gnd/ui/badge";
import NumberFlow from "@number-flow/react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@gnd/ui/select";
import { NumberInput } from "@/components/currency-input";
import { AnimatedNumber } from "@/components/animated-number";

export function HptForm({}) {
    const item = useTakeoffItem();
    const [handle, setHandle] = useState("lh");
    const hptUid = [...item.stepSequence]?.reverse()?.[0];
    const ctx = useCreateContext(hptUid);
    const { itemForm, doors } = ctx;
    const path = itemForm?.groupItem?.itemIds?.[0];
    const componentClass = new ComponentHelperClass(hptUid, item.doorUid);
    const door = composeDoor(componentClass);
    const sizeForm = itemForm?.groupItem?.form?.[path];
    const size = door?.sizePrice?.find((s) => s.path == path);

    function selectSize(_path) {
        const oldPath = path;
        const size = door.sizePrice?.find((a) => a.takeOffSize == _path);

        const oldSize = door.sizePrice?.find((a) => a.path == oldPath);
        componentClass.dotUpdateItemForm("groupItem.itemIds", [size.path]);
        const groupItem = itemForm.groupItem;
        const op = itemForm.groupItem?.form?.[oldPath];
        ctx.zus.removeKey(
            `kvFormItem.${item.itemUid}.groupItem.form.${oldPath}`,
        );
        ctx.zus.dotUpdate(
            `kvFormItem.${item.itemUid}.groupItem.form.${size?.path}`,
            { ...(op || {}) },
        );
        updateDoorGroupForm(
            componentClass,
            {
                [size.path]: {
                    basePrice: size?.basePrice,
                    salesPrice: size?.salesPrice,
                    qty: op?.qty || ({} as any),
                    swing: op?.swing,
                },
            },
            null,
            false,
            {
                forceSelect: true,
            },
        );
    }
    // ctx.
    if (!door?.sizePrice?.length) return null;
    return (
        <div className="gap-2 flex justify-end">
            <table className="">
                <thead className="text-sm uppercase font-mono tracking-wider font-medium text-muted-foreground">
                    <tr className="text-xs">
                        <th className="p-1 px-2" align="left">
                            Size
                        </th>
                        <th className="p-1 px-2" align="left">
                            Swing
                        </th>
                        <th className="p-1 px-2" align="left">
                            Qty
                        </th>
                        <th className="p-1 px-2" align="right">
                            Unit Cost
                        </th>
                        <th className="p-1 px-2">Labor Cost</th>
                        <th className="p-1 px-2">Total Cost</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            {/* <NumberInput placeholder="Size" className="w-28" /> */}
                            <Popover>
                                <PopoverTrigger className="flex-1 overflow-hidden relative">
                                    {/* <NumberInput
                                        readOnly
                                        thousandSeparator={false}
                                        value={size?.takeOffSize}
                                        className="w-12 text-center"
                                    /> */}
                                    <Button
                                        variant="outline"
                                        className="border hover:border-border font-mono uppercase tracking-wider   font-bold h-6 px-2 w-16"
                                    >
                                        <div className="flex-1 flex">
                                            {size?.takeOffSize || "Size"}
                                        </div>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    align="start"
                                    className="w-auto p-0"
                                >
                                    <ComboboxDropdown
                                        className=""
                                        listClassName={cn()}
                                        onSelect={(data) => {
                                            selectSize(data?.label);
                                        }}
                                        headless
                                        items={door?.sizePrice?.map((c) => ({
                                            label: c.takeOffSize,
                                            id: c.path,
                                            data: c,
                                        }))}
                                        placeholder="Select"
                                        renderListItem={(item) => (
                                            <>
                                                <div className="flex w-full">
                                                    {item.item?.label}
                                                    <div className="flex-1"></div>
                                                    <Badge
                                                        className="h-5 px-1"
                                                        variant="success"
                                                    >
                                                        <NumberFlow
                                                            prefix="$"
                                                            value={
                                                                item.item?.data
                                                                    ?.salesPrice
                                                            }
                                                        />
                                                    </Badge>
                                                </div>
                                            </>
                                        )}
                                    />
                                </PopoverContent>
                            </Popover>
                        </td>
                        <td>
                            <div className="">
                                <Select
                                    value={handle}
                                    onValueChange={(e) => {
                                        setHandle(e);
                                        console.log(e);
                                    }}
                                >
                                    <SelectTrigger className="h-6 uppercase">
                                        {handle}
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="lh">LH</SelectItem>
                                        <SelectItem value="rh">RH</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </td>
                        <td>
                            <NumberInput className="w-12 text-center" />
                        </td>
                        <td align="right">
                            <AnimatedNumber
                                value={sizeForm?.pricing?.unitPrice}
                            />
                        </td>
                        <td align="right">
                            <AnimatedNumber
                                value={sizeForm?.pricing?.totalPrice || 0}
                            />
                        </td>
                        <td align="right">
                            <AnimatedNumber
                                value={sizeForm?.pricing?.totalPrice || 0}
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
