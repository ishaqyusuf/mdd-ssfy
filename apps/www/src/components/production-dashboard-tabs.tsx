"use client";

// import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs } from "@gnd/ui/custom/tabs";
import { Badge } from "@gnd/ui/badge";
import { SalesProductionSearchFilter } from "./sales-production-search-filter";
export function ProductionDashboardTabs() {
    function CustomTab({ value = "", children, disabled = false }) {
        const link = `/production${value}`;
        return (
            <Link href={disabled ? {} : link}>
                <Tabs.Item disabled={disabled} value={link}>
                    {children}
                </Tabs.Item>
            </Link>
        );
    }
    const path = usePathname();

    return (
        <div className="flex flex-col">
            <Tabs name="production-tab" value={path}>
                <Tabs.Items className="px-4 ">
                    <CustomTab value="/dashboard">
                        <span>Productions</span>
                        {/* <Badge className="mx-1" variant="destructive">
                            10/40 due
                        </Badge> */}
                    </CustomTab>
                    <CustomTab disabled value="/commissions">
                        Commissions
                    </CustomTab>

                    <Tabs.TabsHeader>
                        {path?.endsWith("dashboard") ? (
                            <SalesProductionSearchFilter />
                        ) : undefined}
                    </Tabs.TabsHeader>
                </Tabs.Items>
            </Tabs>

            {/* <div className="flex-1"></div> */}
            {/* <ResetInventories /> */}
        </div>
    );
}

