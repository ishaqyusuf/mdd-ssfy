import { NumberInput } from "@/components/currency-input";
import { useTakeoffItem } from "../take-off/context";
import { useGroupedItem, useLineItem } from "../context";

export function QtyInput({}) {
    const item = useTakeoffItem();
    const grp = useGroupedItem();
    const { lineUid, lineForm } = useLineItem();

    const value = lineForm?.qty?.total;

    return (
        <NumberInput
            className="text-center w-16"
            value={value}
            placeholder={`QTY`}
            onValueChange={(e) => {
                let value = e.floatValue;
                grp.setValue("qty.total", lineUid, value);
                grp?.valueChanged();
            }}
        />
    );
}
