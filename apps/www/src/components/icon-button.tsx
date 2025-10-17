import { cn } from "@/lib/utils";

// import { cn } from "../utils";
import { Button, type ButtonProps } from "@gnd/ui/button";
import { Icon } from "./_v1/icons";
import { IconKeys } from "@gnd/ui/custom/icons";

export function IconButton({
    children,
    disabled,
    icon,
    ...props
}: {
    // children?: React.ReactNode;
    disabled?: boolean;
    icon: IconKeys;
} & ButtonProps) {
    return (
        <Button
            disabled={disabled}
            variant="ghost"
            size="sm"
            {...props}
            className={cn("px-2", props.className, "relative")}
        >
            <Icon
                name={icon}
                className={cn(
                    "size-4",
                    props.variant == "destructive" &&
                        "text-destructive-foreground",
                )}
            />
        </Button>
    );
}

