import { useState } from "react";
import { GroupedItemContext, useGroupedItem } from "../context";
import { useTakeoffItem } from "../take-off/context";
import { Table } from "@gnd/ui/table";
import { MouldingContent } from "./moulding-content";
import { ServiceContent } from "./service-content";

export function MouldingAndService({}) {
    const item = useTakeoffItem();
    const groupItem = item.itemForm?.groupItem;
    const itemType =
        groupItem?.itemType ||
        (groupItem?.type == "MOULDING"
            ? "Moulding"
            : groupItem?.type == "SERVICE"
              ? "Services"
              : null);
    return (
        <GroupedItemContext
            args={[
                {
                    stepSequence: item.stepSequence,
                    itemType,
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
