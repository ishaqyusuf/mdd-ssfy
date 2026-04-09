import { Icons } from "@gnd/ui/icons";
import { cn } from "@gnd/ui/cn";
import { StockModes } from "@sales/constants";

interface Props {
    status: StockModes;
    prefix?: string;
}
export function StockModeStatus(props: Props) {
    const stockMonitor = props.status == "monitored";
    return (
        <div
            className={cn(
                "flex items-center whitespace-nowrap gap-2",
                stockMonitor ? "text-green-500" : "text-muted-foreground",
            )}
        >
            {stockMonitor ? (
                <>
                    <Icons.Eye className="size-4" />
                    <span>{props.prefix} Monitored</span>
                </>
            ) : (
                <>
                    <Icons.EyeOff className="size-4" />
                    <span>{props.prefix} Unmonitored</span>
                </>
            )}
        </div>
    );
}

