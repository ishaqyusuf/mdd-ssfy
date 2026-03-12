"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/link";
import { cn } from "@/lib/utils";
import { usePathname, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";

import type { PageTabItem } from "./types";

interface PageTabsProps {
    tabs: PageTabItem[];
    portal?: boolean;
    className?: string;
}

function normalizePath(path?: string | null) {
    if (!path) return "";
    if (path.length > 1 && path.endsWith("/")) {
        return path.slice(0, -1);
    }
    return path;
}

function buildTabHref(
    pathname: string,
    searchParams: URLSearchParams,
    tab: PageTabItem,
) {
    const basePath = tab.url || pathname;
    if (!tab.params || Object.keys(tab.params).length === 0) {
        return basePath;
    }
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("_page");
    for (const [key, value] of Object.entries(tab.params)) {
        nextParams.set(key, value);
    }
    const query = nextParams.toString();
    return query ? `${basePath}?${query}` : basePath;
}

function isTabActive(
    pathname: string,
    searchParams: URLSearchParams,
    tab: PageTabItem,
) {
    const pathMatches = tab.url
        ? normalizePath(pathname) === normalizePath(tab.url)
        : true;
    if (!pathMatches) return false;

    if (!tab.params || Object.keys(tab.params).length === 0) {
        return pathMatches;
    }

    return Object.entries(tab.params).every(
        ([key, value]) => searchParams.get(key) === value,
    );
}

export function PageTabs({ tabs, portal = true, className }: PageTabsProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!portal) return;
        setPortalNode(document.getElementById("pageTab"));
    }, [portal]);

    const resolvedTabs = useMemo(() => {
        const currentSearch = new URLSearchParams(searchParams.toString());
        const tabModels = tabs.map((tab) => ({
            ...tab,
            href: buildTabHref(pathname, currentSearch, tab),
            active: isTabActive(pathname, currentSearch, tab),
        }));
        if (tabModels.some((tab) => tab.active)) {
            return tabModels;
        }
        return tabModels.map((tab, index) => ({
            ...tab,
            active: index === 0,
        }));
    }, [pathname, searchParams, tabs]);

    const content = (
        <div
            className={cn(
                "h-10 w-full border-b px-4 sm:px-6 flex items-center gap-1 overflow-x-auto",
                className,
            )}
        >
            {resolvedTabs.map((tab) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-10 rounded-none",
                        tab.active
                            ? "border-b-2 border-blue-600"
                            : "text-muted-foreground",
                    )}
                    asChild
                    disabled={tab.active}
                    key={`${tab.title}-${tab.href}`}
                >
                    <Link className="inline-flex items-center space-x-2" href={tab.href}>
                        <span>{tab.title}</span>
                        {typeof tab.count === "number" && (
                            <Badge className="px-2" variant="secondary">
                                {tab.count}
                            </Badge>
                        )}
                    </Link>
                </Button>
            ))}
        </div>
    );

    if (!portal) return content;
    if (!portalNode) return null;
    return createPortal(content, portalNode);
}
