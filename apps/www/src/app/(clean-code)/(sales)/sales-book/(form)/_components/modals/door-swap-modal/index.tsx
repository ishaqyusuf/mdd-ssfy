import Modal from "@/components/common/modal";
import { _modal } from "@/components/common/modal/provider";
import { toast } from "sonner";

import { ScrollArea } from "@gnd/ui/scroll-area";

import { getFormState } from "../../../_common/_stores/form-data-store";
import { Component } from "../../components-section";
import { useStepContext } from "../../components-section/ctx";
import SearchBar from "../../components-section/search-bar";
import { HptContext } from "@/components/forms/sales-form/context";

export type Door = HptContext["doors"][number];
export const openDoorSwapModal = (door: Door, itemUid) => {
    const zus = getFormState();
    const itemStepUid = Object.entries(zus.kvStepForm)?.find(
        ([k, v]) => v.title == "Door" && k?.startsWith(itemUid),
    )?.[0];
    if (itemStepUid)
        _modal.openModal(
            <DoorSwapModal itemStepUid={itemStepUid} door={door} />,
        );
    else toast.error("Door step not found");
};
export function DoorSwapModal({ door, itemStepUid }) {
    const ctx = useStepContext(itemStepUid);
    const { items, sticky, cls, props } = ctx;
    return (
        <Modal.Content size="xl">
            <Modal.Header title="Select Door" />
            <div className="">
                {/* <ComponentsSection itemStepUid={itemStepUid} /> */}
                <ScrollArea className="h-[75vh]">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
                        {items?.map((component) => (
                            <Component
                                ctx={ctx}
                                key={component.uid}
                                component={component}
                                swapDoor={door}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </div>
            <Modal.Footer>
                <div className="flex w-full justify-center">
                    <SearchBar ctx={ctx} />
                </div>
            </Modal.Footer>
        </Modal.Content>
    );
}
