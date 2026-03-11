"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu, Tabs } from "@gnd/ui/namespace";
import { Building2, ChevronDown, Home } from "lucide-react";
import { Icons } from "@gnd/ui/icons";

const COMMUNITY_TABS = [
    { href: "/community", label: "Projects", icon: Building2 },
    { href: "/community/project-units", label: "Units", icon: Home },
    { href: "/community/unit-productions", label: "Productions" },
    {
        href: "/community/unit-invoices",
        label: "Invoices",
        icon: Icons.estimates,
    },
    {
        href: "/community/templates",
        label: "Templates",
        icon: Icons.communityInvoice,
    },
    { href: "/community/builders", label: "Builders", icon: Icons.builder },
    {
        href: "/community/install-costs",
        label: "Install Cost Rate",
        icon: Icons.lineChart,
    },
] as const;

export function CommunityTabs() {
    const path = usePathname();
    const activeTab =
        COMMUNITY_TABS.find(({ href }) => path === href) ?? COMMUNITY_TABS[0];

    return (
        <div className="flex items-center gap-4">
            <div className="md:hidden">
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <button
                            type="button"
                            className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium"
                            aria-label="Select community section"
                        >
                            {activeTab.icon ? (
                                <activeTab.icon className="size-4" />
                            ) : null}
                            <span>{activeTab.label}</span>
                            <ChevronDown className="size-4 text-muted-foreground" />
                        </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="start" className="w-56">
                        {COMMUNITY_TABS.map((tab) => (
                            <DropdownMenu.Item key={tab.href} asChild>
                                <Link
                                    href={tab.href}
                                    className="flex w-full items-center gap-2"
                                >
                                    {tab.icon ? (
                                        <tab.icon className="size-4" />
                                    ) : null}
                                    <span>{tab.label}</span>
                                </Link>
                            </DropdownMenu.Item>
                        ))}
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </div>

            <Tabs.Root value={path} className="hidden md:block">
                <Tabs.List className="flex  gap-1 overflow-x-auto no-scrollbar border-b bg-background border-border/50">
                    {COMMUNITY_TABS.map((tab) => (
                        <Link key={tab.href} href={tab.href}>
                            <Tabs.Trigger
                                className="flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors"
                                value={tab.href}
                            >
                                {tab.icon ? <tab.icon className="size-4" /> : null}
                                {tab.label}
                            </Tabs.Trigger>
                        </Link>
                    ))}
                </Tabs.List>
            </Tabs.Root>
        </div>
    );
}
