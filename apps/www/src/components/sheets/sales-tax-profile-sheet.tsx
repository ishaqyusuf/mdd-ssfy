"use client";

import { useEffect, useState } from "react";
import {
    GetSalesTaxProfiles,
    getSalesTaxProfilesAction,
} from "@/actions/get-sales-tax-profiles";
import { parseAsBoolean, useQueryStates } from "nuqs";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@gnd/ui/sheet";

export function useSalesTaxProfileForm() {
    const [q, setQ] = useQueryStates({
        openSalesTaxProfile: parseAsBoolean,
    });

    return {
        isOpened: q.openSalesTaxProfile,
        close() {
            setQ(null);
        },
        open() {
            setQ({
                openSalesTaxProfile: true,
            });
        },
    };
}
export function SalesTaxProfileFormSheet({}) {
    const ctx = useSalesTaxProfileForm();
    const [profiles, setProfiles] = useState<GetSalesTaxProfiles>([]);
    useEffect(() => {
        if (ctx.isOpened)
            getSalesTaxProfilesAction().then((res) => {
                setProfiles(res);
            });
    }, [ctx.isOpened]);
    return (
        <Sheet open={ctx.isOpened} onOpenChange={ctx.close}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Sales Tax Profiles</SheetTitle>
                </SheetHeader>
            </SheetContent>
        </Sheet>
    );
}
