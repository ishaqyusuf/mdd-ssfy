"use client";

import { useState,useTransition} from "react"; 
 
import { cn } from "@gnd/ui/cn";
import { Icon, IconKeys } from "./icons";
import { ButtonProps } from "../button";

export interface ConfirmBtnProps extends ButtonProps {
    icon?: IconKeys;
    trash?: boolean;
    variant?: ButtonProps["variant"];
    isDeleting?: boolean;
}

export   function ConfirmBtn({
    className,
    icon,
    size,
    onClick,
    trash,
    variant = "ghost",
    children,
    isDeleting,
    ...props
}: ConfirmBtnProps) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const [confirm, setConfirm] = useState(false);
    async function _onClick(e) {
        e.preventDefault();
        if (!confirm) {
            setConfirm(true);
            setTimeout(() => {
                setConfirm(false);
            }, 3000);
            return;
        }
        setConfirm(false);
        startTransition(async () => {
            onClick && (await onClick(e));
        });
    }
    const iconName = confirm
        ? "Warn"
        : isPending
          ? "spinner"
          : size == "icon" || trash
            ? "trash"
            : icon;
    return (
        <Button
            size={size}
            disabled={isPending || isDeleting}
            onClick={_onClick}
            variant={variant}
            className={cn(
                className,
                size == "icon" && "size-8 p-0",
                size == "icon" && variant == "ghost" && "size-6",
                size == "xs" && "h-6 w-6 p-0",
                variant != "destructive" &&
                    trash &&
                    "text-red-500 hover:text-red-600",
            )}
            {...props}
        >
            <Icon
                name={iconName}
                className={cn(
                    isPending || isDeleting
                        ? "size-3.5 animate-spin"
                        : "size-4",
                    size == "xs" && "size-3",
                )}
            />

            {children && (
                <div className={cn(iconName && "ml-2")}>{children}</div>
            )}
        </Button>
    );
}

