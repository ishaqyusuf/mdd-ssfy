"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DropdownMenu } from "@gnd/ui/namespace";
import {
    Building2,
    ChevronDown,
    FileSpreadsheet,
    Hammer,
    Home,
    LayoutTemplate,
    Receipt,
} from "lucide-react";
import { Icons } from "@gnd/ui/icons";

const COMMUNITY_TABS = [
    { href: "/community", label: "Projects", icon: Building2 },
    { href: "/community/project-units", label: "Units", icon: Home },
    { href: "/community/unit-productions", label: "Productions", icon: Hammer },
    { href: "/community/unit-invoices", label: "Invoices", icon: Receipt },
    { href: "/community/templates", label: "Templates", icon: LayoutTemplate },
    { href: "/community/builders", label: "Builders", icon: Icons.builder },
    {
        href: "/community/install-costs",
        label: "Install Cost Rate",
        icon: FileSpreadsheet,
    },
] as const;

function isActivePath(pathname: string, href: string) {
    if (href === "/community") {
        return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
}

export function CommunityTabs() {
    const pathname = usePathname();
    const activeTab =
        COMMUNITY_TABS.find((tab) => isActivePath(pathname, tab.href)) ??
        COMMUNITY_TABS[0];

    return (
        <div className="space-y-3">
            <div className="md:hidden">
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-2xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50 via-white to-teal-50 px-4 py-3 text-left shadow-sm transition-colors hover:border-emerald-300"
                            aria-label="Select community section"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                                    {activeTab.icon ? (
                                        <activeTab.icon className="size-4" />
                                    ) : null}
                                </div>
                                <p className="truncate text-sm font-semibold text-slate-900">
                                    {activeTab.label}
                                </p>
                            </div>
                            <ChevronDown className="size-4 text-slate-500" />
                        </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content
                        align="start"
                        className="w-[min(18rem,calc(100vw-2rem))] rounded-2xl p-2"
                    >
                        {COMMUNITY_TABS.map((tab) => {
                            const isActive = isActivePath(pathname, tab.href);
                            return (
                                <DropdownMenu.Item
                                    key={tab.href}
                                    asChild
                                    className="rounded-xl p-0 focus:bg-transparent"
                                >
                                    <Link
                                        href={tab.href}
                                        className={cn(
                                            "flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-colors",
                                            isActive
                                                ? "bg-emerald-50 text-emerald-950"
                                                : "hover:bg-muted/60",
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                                                isActive
                                                    ? "border-emerald-200 bg-emerald-600 text-white"
                                                    : "border-border bg-background text-muted-foreground",
                                            )}
                                        >
                                            {tab.icon ? (
                                                <tab.icon className="size-4" />
                                            ) : null}
                                        </div>
                                        <span className="text-sm font-semibold">
                                            {tab.label}
                                        </span>
                                    </Link>
                                </DropdownMenu.Item>
                            );
                        })}
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </div>

            <div className="hidden md:block">
                <div className="overflow-hidden rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-sm ring-1 ring-slate-900/5">
                    <div className="overflow-x-auto px-3 py-3 no-scrollbar">
                        <div className="flex min-w-max gap-2">
                            {COMMUNITY_TABS.map((tab) => {
                                const isActive = isActivePath(
                                    pathname,
                                    tab.href,
                                );

                                return (
                                    <Link
                                        key={tab.href}
                                        href={tab.href}
                                        className={cn(
                                            "group flex min-w-[168px] flex-1 items-center gap-3 rounded-2xl border px-4 py-3 transition-all",
                                            isActive
                                                ? "border-emerald-300 bg-emerald-600 text-white shadow-lg shadow-emerald-900/10"
                                                : "border-transparent bg-white/80 text-slate-700 hover:border-emerald-100 hover:bg-white",
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                                                isActive
                                                    ? "bg-white/16 text-white"
                                                    : "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100",
                                            )}
                                        >
                                            {tab.icon ? (
                                                <tab.icon className="size-4" />
                                            ) : null}
                                        </div>
                                        <span className="truncate text-sm font-semibold">
                                            {tab.label}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
