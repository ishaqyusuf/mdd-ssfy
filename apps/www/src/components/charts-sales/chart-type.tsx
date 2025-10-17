import { changeSalesChartTypeAction } from "@/actions/change-sales-chart-type";
import { useOptimisticAction } from "next-safe-action/hooks";
import {
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    Select,
} from "@gnd/ui/select";

type Props = {
    initialValue: string;
    disabled?: boolean;
};
const options = ["sales"];
export function ChartType({ initialValue, disabled }: Props) {
    const { execute, optimisticState } = useOptimisticAction(
        changeSalesChartTypeAction,
        {
            currentState: initialValue,
            updateFn: (_, newState) => newState,
        },
    );

    return (
        <Select defaultValue={optimisticState} onValueChange={execute}>
            <SelectTrigger
                className="flex-1 space-x-1 font-medium"
                disabled={disabled}
            >
                <span>{optimisticState}</span>
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    {options.map((option) => {
                        return (
                            <SelectItem key={option} value={option}>
                                {/* {t(`chart_type.${option}`)} */}
                                {option}
                            </SelectItem>
                        );
                    })}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}
