import { useMemo } from "react";
import { restoreMissingComponentData } from "@/actions/restore-missing-component-data";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Menu } from "@/components/(clean-code)/menu";
import { swap } from "@/lib/utils";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Input } from "@gnd/ui/input";

import { useFormDataStore } from "../_common/_stores/form-data-store";
import { ItemClass } from "../_utils/helpers/zus/item-class";
import ItemSideView from "./item-side-view";
import { StepSection } from "./step-section";

interface Props {
    uid?: string;
}
export default function ItemSection({ uid }: Props) {
    const zus = useFormDataStore();
    const zItem = zus?.kvFormItem?.[uid];

    const sequence = zus.sequence?.stepComponent?.[uid];

    return (
        <div className="mb-2 sm:rounded-lg bg-background sm:mb-4">
            <Collapsible
                open
                onOpenChange={(e) => {
                    zus.toggleItem(uid);
                }}
            >
                <ItemSectionHeader uid={uid} />
                <CollapsibleContent className="flex sm:max-h-[120vh] overflow-auto border">
                    <div className="flex flex-1 flex-col ">
                        {sequence?.map((stepUid, index) => (
                            <StepSection
                                isFirst={index == 0}
                                isLast={sequence?.length - 1 == index}
                                key={index}
                                stepUid={stepUid}
                            />
                        ))}
                    </div>
                    <ItemSideView itemUid={uid} />
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}
function ItemSectionHeader({ uid }) {
    const zus = useFormDataStore();
    const cls = useMemo(() => {
        const cls = new ItemClass(uid);
        return cls;
    }, [uid]);
    const placeholder = `Item ${cls.itemIndex + 1}`;
    const formItem = cls.formItem;
    const itemSequence = zus.sequence.formItem;
    const restoreMissing = async () => {
        try {
            await restoreMissingComponentData(
                cls.formItem.id,
                cls.formItem.groupItem.hptId,
            );
            toast.success(
                "Restore completed. Refresh and Save to get updated invoice.",
            );
        } catch (error) {
            toast.error(error.message);
        }
    };
    return (
        <div className="flex items-center gap-4 border p-2 px-4">
            <CollapsibleTrigger asChild className="flex-1">
                <div
                    className="flex "
                    onClick={(e) => {
                        e.preventDefault();
                    }}
                >
                    <Input
                        value={formItem?.title}
                        onChange={(e) => {
                            zus.updateFormItem(uid, "title", e.target.value);
                        }}
                        className="h-8 uppercase"
                        placeholder={placeholder}
                    />
                </div>
            </CollapsibleTrigger>
            <Button
                onClick={() => {
                    zus.updateFormItem(uid, "collapsed", !formItem.collapsed);
                }}
                className="h-8"
                size="sm"
                variant={formItem?.collapsed ? "default" : "secondary"}
            >
                {formItem.collapsed ? "Expand" : "Collapse"}
            </Button>
            <Menu>
                <Menu.Item onClick={restoreMissing} icon="copy">
                    Component Doors Restore
                </Menu.Item>
                <Menu.Item icon="copy">Make Copy</Menu.Item>
                <Menu.Item
                    disabled={itemSequence?.length <= 1}
                    icon="move2"
                    SubMenu={itemSequence?.map((seq, ind) => (
                        <Menu.Item
                            onClick={() => {
                                let sequence = zus.sequence.formItem;
                                let currentIndex = cls.itemIndex;
                                let newIndex = ind;
                                swap(sequence, currentIndex, newIndex);
                                zus.dotUpdate("sequence.formItem", sequence);
                            }}
                            key={seq}
                            disabled={ind == cls.itemIndex}
                        >
                            {ind + 1}
                        </Menu.Item>
                    ))}
                >
                    Move To
                </Menu.Item>
            </Menu>
            <ConfirmBtn
                trash
                size="icon"
                onClick={() => {
                    cls.deleteItem();
                }}
            />
        </div>
    );
}
