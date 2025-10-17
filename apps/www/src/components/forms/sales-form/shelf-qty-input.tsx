"react-hook-form";

import { NumberInput } from "@/components/currency-input";
import { useShelfItem } from "@/hooks/use-shelf-item";

export function ShelfQtyInput({ value, prodUid }) {
    const ctx = useShelfItem();

    return (
        <NumberInput
            value={value}
            onValueChange={(values) => {
                ctx.dotUpdateProduct(prodUid, "qty", values.floatValue);
                // onChange(values.floatValue);
            }}
        />
    );
}
