import { useAsyncMemo } from "use-async-memo";
import { useTakeoffItem } from "./context";
import { useStepContext } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/components-section/ctx";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { cn } from "@gnd/ui/cn";

import { ComponentHelperClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import { composeDoor } from "@/lib/sales/compose-door";
import { updateDoorGroupForm } from "@/lib/sales/update-door-form";
import { ComponentItemCard } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/components-section/component-item-card";

export function DoorSelect({ setOpen }) {
    const itemCtx = useTakeoffItem();
    const doorStepForm = Object.entries(itemCtx.zus.kvStepForm).find(
        ([itemStepUid, stepForm]) =>
            stepForm.title == "Door" &&
            itemStepUid?.startsWith(itemCtx.itemUid),
    );
    const stepCtx = useStepContext(doorStepForm[0]);
    function onSelect(cls: ComponentHelperClass) {
        let groupItem = cls.getItemForm().groupItem;
        const door = composeDoor(cls);

        const selections = door.selections;

        const gi = updateDoorGroupForm(cls, selections, null, false);
    }
    return (
        <div className="max-w-2xl">
            <ComboboxDropdown
                className=""
                noSearch
                listClassName={cn(
                    "grid grid-cols-2 gap-4 sm:grid-cols-3 max-h-[500px]",
                )}
                onSelect={(data) => {
                    // const comp = new ComponentHelperClass(
                    //     itemStepUid,
                    //     data.data.uid,
                    //     data.data,
                    // );
                    // comp.selectComponent(true);
                    setOpen(false);
                }}
                headless
                items={stepCtx?.items?.map((c) => ({
                    label: c.title,
                    id: c.id?.toString(),
                    data: c,
                }))}
                placeholder="Select"
                renderListItem={(item) => (
                    <>
                        <ComponentItemCard
                            onSelect={onSelect}
                            ctx={stepCtx}
                            key={item.item.data.uid}
                            component={item.item.data}
                            // swapDoor={door}
                        />
                    </>
                )}
            />
        </div>
    );
}
