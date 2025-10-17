"use client";

import { cn } from "@/lib/utils";

import { Button, ButtonProps } from "@gnd/ui/button";

import { Icons } from "./icons";

interface Props extends ButtonProps {
    isLoading?: boolean;
    icon?: boolean;
}
export default function Btn({
    isLoading = false,
    children,
    icon = false,
    className = "",
    ...props
}: Props) {
    return (
        <Button
            {...props}
            className={cn(className)}
            disabled={isLoading || props.disabled}
        >
            {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            {icon && isLoading ? null : children}
        </Button>
    );
}
