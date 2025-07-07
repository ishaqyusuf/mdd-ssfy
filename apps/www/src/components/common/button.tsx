import { useTransition } from "react";
import { cn } from "@/lib/utils";

import { Button as BaseButton, ButtonProps } from "@gnd/ui/button";

import { IconKeys, Icons } from "../_v1/icons";

interface BtnProps extends ButtonProps {
    action?;
    text?;
    icon?: IconKeys;
}
export default function Button({
    onClick,
    action,
    text,
    icon,
    ...props
}: BtnProps) {
    const BtnIcon = icon ? Icons[icon] : null;
    const [loading, startLoader] = useTransition();
    async function _action(e) {
        if (action) {
            startLoader((async () => {
                const resp = action();
                if (resp instanceof Promise) {
                    await resp;
                }
            }) as any);
        } else onClick?.(e);
    }
    return (
        <BaseButton
            className={cn("relative", props.className)}
            onClick={_action}
            {...props}
            disabled={loading || props.disabled}
        >
            <div
                className={cn(
                    "inline-flex items-center",

                    // props.className,
                    loading && "opacity-0",
                )}
            >
                {BtnIcon && (
                    <BtnIcon
                        className={cn(
                            "h-4 w-4",
                            (text || props.children) && "mr-2",
                        )}
                    />
                )}
                {props.children}
                {text && <span>{text}</span>}
            </div>
            <div
                className={cn("absolute", loading ? "opacity-10" : "opacity-0")}
            >
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            </div>
        </BaseButton>
    );
}
