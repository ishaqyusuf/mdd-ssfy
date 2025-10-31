import { buttonVariants } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import Portal from "@gnd/ui/custom/portal";
import { Icons } from "@gnd/ui/icons";
import Link from "next/link";

export function GoBack({ href }) {
    return (
        <Portal noDelay nodeId={"goBackSlot"}>
            <Link
                className={cn(
                    buttonVariants({
                        size: "xs",
                        variant: "secondary",
                        className: "rounded-full",
                    })
                )}
                href={href}
            >
                <Icons.ChevronLeft className="size-4" />
            </Link>
        </Portal>
    );
}

