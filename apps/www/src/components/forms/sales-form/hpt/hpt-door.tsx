import { ComponentImg } from "@/components/forms/sales-form/component-img";
import { openDoorSwapModal } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-swap-modal";
import Button from "@/components/common/button";
import { HptContext, useHpt } from "@/components/forms/sales-form/context";

interface DoorProps {
    door: HptContext["doors"][number];
}
export function Door({ door }: DoorProps) {
    const ctx = useHpt();

    return (
        <div className="flex gap-4s flex-col h-full items-end">
            <div className="">
                <Button
                    size="xs"
                    onClick={() => {
                        openDoorSwapModal(door, ctx.hpt.itemUid);
                    }}
                >
                    Change Door
                </Button>
            </div>
            <div className="w-2/3">
                <ComponentImg noHover aspectRatio={0.7} src={door.img} />
            </div>
        </div>
    );
}
