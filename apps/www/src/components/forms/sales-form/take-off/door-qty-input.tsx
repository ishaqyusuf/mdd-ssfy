import { NumberInput } from "@/components/currency-input";
import { useHpt, useHptLine } from "../context";

interface Props {
    name: "total" | "lh" | "rh";
    suffix?: string;
}

export function DoorQtyInput({ name, suffix }: Props) {
    const line = useHptLine();
    const hpt = useHpt();
    const value = line?.sizeForm?.qty?.[name];
    return (
        <NumberInput
            className="text-center w-16"
            value={value}
            suffix={` ${suffix}`}
            placeholder={name?.toUpperCase()}
            onValueChange={(e) => {
                let value =
                    e.floatValue == undefined ? null : e.floatValue || null;

                line.setValue(`qty.${name}`, value);
                line.valueChanged();
            }}
        />
    );
}
