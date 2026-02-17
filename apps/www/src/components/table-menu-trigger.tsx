import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

interface Props extends Omit<React.ComponentProps<typeof Button>, "children"> {}

export function TableMenuTrigger(props: Props) {
    return (
        <Button
            size="sm"
            // className={cn(!isMobile || "size-4 p-0")}
            variant="secondary"
            {...props}
        >
            <Icons.MoreHoriz className="" />
        </Button>
    );
}

