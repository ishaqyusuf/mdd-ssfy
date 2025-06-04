import { useState } from "react";
import { GroupedItemContext, useGroupedItem } from "../context";
import { useTakeoffItem } from "../take-off/context";
import { Table } from "@gnd/ui/table";
import { MouldingContent } from "./moulding-content";
import { ServiceContent } from "./service-content";

export function MouldingAndService({}) {
    const item = useTakeoffItem();
    const itemType = item.itemForm?.groupItem?.itemType;
    return (
        <GroupedItemContext
            args={[
                {
                    stepSequence: item.stepSequence,
                    itemType: item.itemForm?.groupItem?.itemType,
                },
            ]}
        >
            {itemType == "Services" ? (
                <ServiceContent />
            ) : itemType == "Moulding" ? (
                <MouldingContent />
            ) : null}
        </GroupedItemContext>
    );
}
