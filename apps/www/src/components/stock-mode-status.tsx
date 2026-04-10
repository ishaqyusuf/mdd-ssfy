import { Icons } from "@gnd/ui/icons";
import { cn } from "@gnd/ui/cn";
import { StockModes } from "@sales/constants";

interface Props {
    status: StockModes;
    prefix?: string;
}
export function StockModeStatus(props: Props) {
    const stockMonitor = props.status == "monitored";
    const StatusIcon = stockMonitor ? Icons.view : Icons.hide;
    return (
        <div
            className={cn(
                "flex items-center whitespace-nowrap gap-2",
                stockMonitor ? "text-green-500" : "text-muted-foreground",
            )}
        >
            <StatusIcon className="size-4" />
            <span>{props.prefix} {stockMonitor ? "Monitored" : "Unmonitored"}</span>
        </div>
    );
}
