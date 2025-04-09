"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useBool } from "@/lib/use-loader";
import { cn } from "@/lib/utils";
import { Info, Trash } from "lucide-react";

import { Button, ButtonProps } from "@gnd/ui/button";

import { Icons } from "./icons";

export interface ConfirmBtnProps extends ButtonProps {
    Icon?;
    trash?: boolean;
    variant?: ButtonProps["variant"];
}

export default function ConfirmBtn({
    className,
    Icon,
    size,
    onClick,
    trash,
    variant = "ghost",
    children,
    ...props
}: ConfirmBtnProps) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const confirm = useBool();
    async function _onClick(e) {
        e.preventDefault();
        if (!confirm.bool) {
            confirm.setBool(true);
            setTimeout(() => {
                confirm.setBool(false);
            }, 3000);
            return;
        }
        confirm.setBool(false);
        startTransition(async () => {
            onClick && (await onClick(e));
        });
    }
    const Icone: any = confirm.bool
        ? Info
        : isPending
          ? Icons.spinner
          : size == "icon" || trash
            ? Trash
            : Icon;
    return (
        <Button
            size={size}
            disabled={isPending}
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
            {Icone && (
                <Icone
                    className={cn(
                        `${isPending ? "h-3.5 w-3.5 animate-spin" : "h-4 w-4"}`,
                        size == "xs" && "size-3",
                    )}
                />
            )}
            {children && <div className={cn(Icone && "ml-2")}>{children}</div>}
        </Button>
    );
}
