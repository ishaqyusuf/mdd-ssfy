"use client";

// import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ResetInventories } from "./reset-inventories";
import { Tabs } from "@gnd/ui/composite";
// import { Tabs } from "@gnd/ui/custom/tabs";
export function CommunityTabs() {
    function CustomTab({ value = "", children }) {
        const link = `/community${value}`;
        return (
            <Link href={link}>
                <Tabs.Trigger value={link}>{children}</Tabs.Trigger>
            </Link>
        );
    }
    const path = usePathname();

    return (
        <div className="flex gap-4 items-center">
            <Tabs.Root value={path}>
                <Tabs.List className="px-4">
                    <CustomTab>Projects</CustomTab>
                    <CustomTab value="/project-units">Units</CustomTab>
                    <CustomTab value="/unit-productions">Productions</CustomTab>
                    <CustomTab value="/unit-invoices">Invoices</CustomTab>
                    <CustomTab value="/templates">Templates</CustomTab>
                    <CustomTab value="/builders">Builders</CustomTab>
                </Tabs.List>
            </Tabs.Root>

            {/* <div className="flex-1"></div> */}
            {/* <ResetInventories /> */}
        </div>
    );
}

