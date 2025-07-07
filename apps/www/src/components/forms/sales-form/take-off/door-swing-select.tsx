import { doorSwings } from "@/utils/constants";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import { useHpt, useHptLine } from "../context";

export function DoorSwingSelect({}) {
    const line = useHptLine();
    const hpt = useHpt();
    const swing = line?.sizeForm?.swing;

    return (
        <Select
            onValueChange={(e) => {
                line.setValue("swing", e);
            }}
        >
            <SelectTrigger>
                <SelectValue
                    className="text-center"
                    placeholder="Swing"
                    defaultValue={swing}
                />
            </SelectTrigger>
            <SelectContent>
                {doorSwings?.map((s) => (
                    <SelectItem key={s} value={s}>
                        {s}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
