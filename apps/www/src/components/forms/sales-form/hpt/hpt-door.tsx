import { ComponentImg } from "@/components/forms/sales-form/component-img";
import {
    getDoorItemTypeOptions,
    openDoorItemTypeSwapModal,
    openDoorSwapModal,
} from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-swap-modal";
import Button from "@/components/common/button";
import { HptContext, useHpt } from "@/components/forms/sales-form/context";

interface DoorProps {
    door: HptContext["doors"][number];
}
export function Door({ door }: DoorProps) {
    const ctx = useHpt();
    const itemTypeOptions = getDoorItemTypeOptions(ctx.hpt.itemUid, door.uid);

    return (
        <div className="flex gap-4s flex-col h-full items-end">
            <div className="flex flex-col items-end gap-2">
                <Button
                    size="xs"
                    onClick={() => {
                        openDoorSwapModal(door, ctx.hpt.itemUid);
                    }}
                >
                    Change Door
                </Button>
                {itemTypeOptions.length > 1 ? (
                    <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => {
                            openDoorItemTypeSwapModal(door, ctx.hpt.itemUid);
                        }}
                    >
                        Swap Item Type ({itemTypeOptions.length})
                    </Button>
                ) : null}
            </div>
            <div className="w-2/3">
                <ComponentImg noHover aspectRatio={0.7} src={door.img} />
            </div>
        </div>
    );
}
