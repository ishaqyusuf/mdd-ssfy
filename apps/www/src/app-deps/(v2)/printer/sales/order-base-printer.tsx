"use client";

import React from "react";
import { SalesPrintProps } from "./page";

export type BasePrintProps = SalesPrintProps["searchParams"] & {};
const SalesPrintCtx = React.createContext<BasePrintProps>(null as any);
export const useSalesPrintCtx = () =>
    React.useContext<BasePrintProps>(SalesPrintCtx);
function OrderBasePrinter({
    children,
    ...props
}: { children } & SalesPrintProps["searchParams"]) {
    // const value: BasePrintProps = {
    //     ...props,
    //     preview: (props.preview as any) == true,
    //     pdf: (props.pdf as any) == true,
    // };

    return (
        <SalesPrintCtx.Provider value={props}>
            {children}
        </SalesPrintCtx.Provider>
    );
}
