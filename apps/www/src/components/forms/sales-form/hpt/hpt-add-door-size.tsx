import { openDoorSizeSelectModal } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-select-modal/open-modal";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/custom/icons";
import { useHpt } from "../context";
import { ComponentHelperClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import { Menu } from "@gnd/ui/custom/menu";
import { useMemo } from "react";
import { Check } from "lucide-react";
import { cn } from "@gnd/ui/cn";

export function HptAddDoorSize({ doorIndex }) {
    const ctx = useHpt();
    const sizeList = ctx.doors?.[doorIndex]?.sizeList;
    const addDoorSize = () => {
        // const s = ctx.hpt.getDoorStepForm2();
        // console.log(s.);
        openDoorSizeSelectModal(ctx.componentClass);
    };
    return (
        <>
            <Menu
                Trigger={
                    <Button onClick={addDoorSize}>
                        <Icons.add className="mr-2 size-4" />
                        <span>Size</span>
                    </Button>
                }
            >
                {sizeList?.map((size, li) => (
                    <Menu.Item
                        onClick={(e) => {
                            e.stopPropagation();
                            ctx.hpt.dotUpdateGroupItemFormPath(
                                size.path,
                                "selected",
                                !size.selected,
                            );
                        }}
                        disabled={!size?.basePrice}
                        className={cn(size.selected && "bg-muted")}
                        key={li}
                    >
                        <Check
                            className={cn(
                                "size-4 mr-2",
                                size.selected || "opacity-20",
                            )}
                        />
                        <span>{size.title}</span>
                    </Menu.Item>
                ))}
            </Menu>
            {/* <Button onClick={addDoorSize}>
                <Icons.add className="mr-2 size-4" />
                <span>Size</span>
            </Button> */}
        </>
    );
}

