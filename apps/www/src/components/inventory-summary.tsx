import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";

interface Props {
    Icon;
    title: string;
    subtitle;
    value;
    selected?;
    selectable?: boolean;
}
export function InventorySummary(props: Props) {
    return (
        <Card
            className={cn(
                props.selected ? "bg-primary text-secondary" : "",
                props.selectable && "hover:border-primary hover:bg-primary/20",
            )}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {props.title}
                </CardTitle>
                <props.Icon className="h-4 w-4 text-muted-foregrounds opacity-80" />
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-2">
                    <div className="text-2xl font-bold">{props.value}</div>
                    <div className="text-xs text-muted-foreground">
                        {props.subtitle}
                    </div>
                </div>
                {/* <div className="text-2xl font-bold">{props.value}</div> */}
            </CardContent>
        </Card>
    );
}

