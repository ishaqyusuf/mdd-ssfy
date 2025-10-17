"use client";

import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ResetInventories } from "./reset-inventories";
export function InventoryTabs() {
    function CustomTab({ value, children }) {
        return (
            <TabsTrigger asChild value={value}>
                <Link href={value}>{children}</Link>
            </TabsTrigger>
        );
    }
    const path = usePathname();

    return (
        <div className="flex gap-4 items-center">
            <Tabs value={path} className="space-y-4">
                <TabsList>
                    <CustomTab value="/inventory">Inventory</CustomTab>
                    <CustomTab value="/inventory/variants">
                        All Variants
                    </CustomTab>
                    <CustomTab value="/inventory/inbounds">Inbounds</CustomTab>
                    <CustomTab value="/inventory/stocks">
                        Stock Movements
                    </CustomTab>
                    <CustomTab value="/inventory/categories">
                        Categories
                    </CustomTab>
                    <CustomTab value="/inventory/imports">Imports</CustomTab>
                </TabsList>
            </Tabs>
            <div className="flex-1"></div>
            <ResetInventories />
        </div>
    );
}

