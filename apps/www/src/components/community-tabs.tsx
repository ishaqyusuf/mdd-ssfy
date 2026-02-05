"use client";

// import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ResetInventories } from "./reset-inventories";
import { Tabs } from "@gnd/ui/composite";
import { Building2, Home, Users2 } from "lucide-react";
// import { Tabs } from "@gnd/ui/custom/tabs";
export function CommunityTabs() {
    function CustomTab({
        value = "",
        children,
        Icon,
    }: {
        value?: string;
        children: React.ReactNode;
        Icon?;
    }) {
        const link = `/community${value}`;
        return (
            <Link href={link}>
                <Tabs.Trigger
                    // className="text-lgs uppercase tracking-wide border-r hover:bg-accent"
                    className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
                    value={link}
                >
                    {!Icon || <Icon className="size-4 mr-2 inline-block" />}
                    {children}
                </Tabs.Trigger>
            </Link>
        );
    }
    const path = usePathname();

    return (
        <div className="flex gap-4 items-center">
            <Tabs.Root value={path}>
                <Tabs.List className="flex  gap-1 overflow-x-auto no-scrollbar border-b border-border/50">
                    <CustomTab Icon={Building2}>Projects</CustomTab>
                    <CustomTab Icon={Home} value="/project-units">
                        Units
                    </CustomTab>
                    <CustomTab value="/unit-productions">Productions</CustomTab>
                    <CustomTab value="/unit-invoices">Invoices</CustomTab>
                    <CustomTab value="/templates">Templates</CustomTab>
                    <CustomTab Icon={Users2} value="/builders">
                        Builders
                    </CustomTab>
                </Tabs.List>
            </Tabs.Root>

            {/* <div className="flex-1"></div> */}
            {/* <ResetInventories /> */}
        </div>
    );
}

