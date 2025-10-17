import { openDoorSizeSelectModal } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-select-modal/open-modal";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/custom/icons";
import { useHpt } from "../context";
import { Menu } from "@gnd/ui/custom/menu";
import { useMemo } from "react";
import { Check } from "lucide-react";
import { cn } from "@gnd/ui/cn";
import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { Badge } from "@gnd/ui/badge";

export function HptAddDoorSize({ doorIndex }) {
    const ctx = useHpt();
    const zus = useFormDataStore();

    const door = ctx.doors?.[doorIndex];
    const sizeList = door?.sizeList;

    return (
        <>
            <Menu
                noSize
                Trigger={
                    <Button>
                        <Icons.add className="mr-2 size-4" />
                        <span>Size</span>
                    </Button>
                }
            >
                {sizeList?.map((size, li) => {
                    const form = ctx.itemForm.groupItem?.form?.[size?.path];
                    const selected = form?.selected;
                    return (
                        <Menu.Item
                            onClick={(e) => {
                                e.stopPropagation();
                                ctx.hpt.dotUpdateGroupItemFormPath(
                                    size.path,
                                    "selected",
                                    !selected,
                                );
                                ctx.hpt.dotUpdateGroupItemFormPath(
                                    size.path,
                                    "pricing.itemPrice.salesPrice",
                                    size.salesPrice,
                                );
                                // console.log({ door });
                                ctx.hpt.dotUpdateGroupItemFormPath(
                                    size.path,
                                    "stepProductId.id",
                                    door?.id,
                                );
                            }}
                            disabled={!size?.basePrice}
                            className={cn(selected && "bg-muted")}
                            key={li}
                        >
                            <Check
                                className={cn(
                                    "size-4 mr-2",
                                    selected || "opacity-20",
                                )}
                            />
                            <span>{size.title}</span>
                            <Badge>{size?.salesPrice}</Badge>
                        </Menu.Item>
                    );
                })}
            </Menu>
            {/* <Button onClick={addDoorSize}>
                <Icons.add className="mr-2 size-4" />
                <span>Size</span>
            </Button> */}
        </>
    );
}

