"use client";

import { DataPageContext } from "@/lib/data-page-context";
import { cn } from "@/lib/utils";
import { PrimitiveDivProps } from "@/types/type";
import React from "react";

export function DataPageShell<T>({
    data,
    className,
    children,
}: {
    data?: T;
    children?;
} & PrimitiveDivProps) {
    console.log({ data });
    return (
        <DataPageContext.Provider value={{ data }}>
            <div className={cn(className)}>{children}</div>
        </DataPageContext.Provider>
    );
}
