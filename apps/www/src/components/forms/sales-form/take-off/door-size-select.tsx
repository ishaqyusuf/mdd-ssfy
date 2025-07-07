import { Button, buttonVariants } from "@gnd/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { useHpt, useHptLine } from "../context";
import { cn } from "@gnd/ui/cn";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { updateDoorGroupForm } from "@/lib/sales/update-door-form";
import { Badge } from "@gnd/ui/badge";
import NumberFlow from "@number-flow/react";
import { Check } from "lucide-react";
import { updateItemHeight } from "@/lib/sales/update-item-height";

export function DoorSizeSelect({}) {
    const lineContext = useHptLine();
    const { size, lineUid } = lineContext;
    const hptContext = useHpt();
    const { hpt, zus, door, componentClass, itemForm, itemUid } = hptContext;
    const sizePrice = door?.sizePrice;
    if (!sizePrice?.length) return null;
    function selectSize(takeOffSize) {
        const oldPath = lineUid;
        const size = sizePrice?.find((a) => a.takeOffSize == takeOffSize);
        // const oldSize = door?.sizePrice?.find((a) => a.path == oldPath);
        componentClass.dotUpdateItemForm("groupItem.itemIds", [size.path]);
        // const groupItem = itemForm.groupItem;
        const op = itemForm.groupItem?.form?.[oldPath];
        zus.removeKey(`kvFormItem.${itemUid}.groupItem.form.${oldPath}`);
        zus.dotUpdate(`kvFormItem.${itemUid}.groupItem.form.${size?.path}`, {
            ...(op || {}),
        });
        updateItemHeight({
            lineContext,
            hptContext,
            size,
        });
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
    return (
        <ComboboxDropdown
            selectedItem={size ? ({ label: size?.takeOffSize } as any) : null}
            className=""
            listClassName={cn("w-56")}
            popoverProps={{
                className: "!w-56 p-0",
            }}
            onSelect={(data) => {
                selectSize(data?.label);
            }}
            // headless
            items={sizePrice?.map((c) => ({
                label: c.takeOffSize,
                id: c.path,
                data: c,
            }))}
            placeholder="Select"
            renderListItem={({ isChecked, item }) => (
                <div className="flex w-full">
                    <Check
                        className={cn(
                            "mr-2 h-4 w-4",
                            size?.takeOffSize == item?.data?.takeOffSize
                                ? "opacity-100"
                                : "opacity-0",
                        )}
                    />
                    {item?.label}
                    <div className="flex-1"></div>
                    <Badge
                        className="h-5 text-xs px-1"
                        variant={item?.data?.salesPrice ? "success" : "outline"}
                    >
                        <NumberFlow prefix="$" value={item?.data?.salesPrice} />
                    </Badge>
                </div>
            )}
        />
    );
}
