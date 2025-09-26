"use client";

// import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ResetInventories } from "./reset-inventories";
import { Tabs } from "@gnd/ui/custom/tabs";
export function CommunityTabs() {
    function CustomTab({ value = "", children }) {
        const link = `/community${value}`;
        return (
            <Link href={link}>
                <Tabs.Item value={link}>{children}</Tabs.Item>
            </Link>
        );
    }
    const path = usePathname();

    return (
        <div className="flex gap-4 items-center">
            <Tabs value={path}>
                <Tabs.Items className="px-4">
                    <CustomTab>Projects</CustomTab>
                    <CustomTab value="/units">Units</CustomTab>
                    <CustomTab value="/productions">Productions</CustomTab>
                    <CustomTab value="/invoices">Invoices</CustomTab>
                    <CustomTab value="/templates">Templates</CustomTab>
                    <CustomTab value="/builders">Builders</CustomTab>
                </Tabs.Items>
            </Tabs>

            {/* <div className="flex-1"></div> */}
            {/* <ResetInventories /> */}
        </div>
    );
}

