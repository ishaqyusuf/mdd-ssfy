"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

import { Input, InputProps } from "@gnd/ui/input";

export function LabelInput({ className, ...props }: InputProps) {
    //   const { setValue, watch } = useFormContext();
    //   const value = watch(name);

    const [isFocused, setIsFocused] = useState(false);
    const isPlaceholder = !props.value && !isFocused && !props.placeholder;
    return (
        <div className="midday relative">
            <Input
                {...props}
                {...props}
                // ref={ref}
                autoComplete="off"
                value={props.value || ""}
                className={cn(
                    "h-6 border-0 border-b border-transparent p-0 font-mono$ text-xs focus:border-border",
                    isPlaceholder && "opacity-0",
                    className,
                )}
                onFocus={(evt) => {
                    setIsFocused(true);
                    props.onFocus?.(evt);
                }}
                onBlur={(evt) => {
                    setIsFocused(false);
                    props.onBlur?.(evt);
                }}
            />
            {isPlaceholder && (
                <div className="pointer-events-none absolute inset-0">
                    <div className="h-full w-full bg-[repeating-linear-gradient(-60deg,#DBDBDB,#DBDBDB_1px,transparent_1px,transparent_5px)] dark:bg-[repeating-linear-gradient(-60deg,#2C2C2C,#2C2C2C_1px,transparent_1px,transparent_5px)]" />
                </div>
            )}
        </div>
    );
}
