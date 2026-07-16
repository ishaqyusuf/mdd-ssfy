"use client";

import Link from "@/components/link";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

import { ManagePageTabsDialog } from "./manage-page-tabs-dialog";
import {
	buildPageTabHref,
	normalizePagePath,
	normalizeTabQuery,
	queryContainsTabQuery,
} from "./query-utils";
import type { PageTabItem } from "./types";

interface PageTabsProps {
	tabs?: PageTabItem[];
	portal?: boolean;
	className?: string;
	page?: string;
	action?: ReactNode;
}

type ResolvedPageTab = PageTabItem & {
	active: boolean;
	href: string;
	isAll?: boolean;
};

function buildTabHref(
	pathname: string,
	searchParams: URLSearchParams,
	tab: PageTabItem,
) {
	const basePath = tab.url || tab.page || pathname;

	if (tab.query !== undefined) {
		return buildPageTabHref(basePath, tab.query);
	}

	if (!tab.params || Object.keys(tab.params).length === 0) {
		return basePath;
	}

	const nextParams = new URLSearchParams(searchParams.toString());
	nextParams.delete("_page");
	for (const [key, value] of Object.entries(tab.params)) {
		nextParams.set(key, value);
	}

	return buildPageTabHref(basePath, nextParams);
}

function isTabActive(
	pathname: string,
	searchParams: URLSearchParams,
	tab: PageTabItem,
) {
	const tabPath = tab.url || tab.page;
	const pathMatches = tabPath
		? normalizePagePath(pathname) === normalizePagePath(tabPath)
		: true;
	if (!pathMatches) return false;

	if (tab.query !== undefined) {
		return queryContainsTabQuery(searchParams, tab.query);
	}

	if (!tab.params || Object.keys(tab.params).length === 0) {
		return pathMatches;
	}

	return Object.entries(tab.params).every(
		([key, value]) => searchParams.get(key) === value,
	);
}

function buildAllTab(pathname: string, page?: string): ResolvedPageTab {
	const basePath = normalizePagePath(page || pathname);

	return {
		active: false,
		href: basePath,
		isAll: true,
		page: basePath,
		title: "All",
	};
}

export function PageTabs({
	tabs,
	portal = true,
	className,
	page,
	action,
}: PageTabsProps) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const trpc = useTRPC();
	const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
	const [manageOpen, setManageOpen] = useState(false);
	const resolvedPage = normalizePagePath(page || pathname);
	const shouldFetch = !tabs;
	const { data } = useQuery({
		enabled: shouldFetch,
		...trpc.pageTabs.list.queryOptions({ page: resolvedPage }),
	});
	const pageTabs = tabs ?? data ?? [];
	const hasSavedTabs = pageTabs.length > 0;

	useEffect(() => {
		if (!portal) return;
		setPortalNode(document.getElementById("pageTab"));
	}, [portal]);

	const resolvedTabs = useMemo(() => {
		const currentSearch = new URLSearchParams(searchParams.toString());
		const savedTabs = pageTabs.map((tab) => ({
			...tab,
			href: buildTabHref(pathname, currentSearch, tab),
			active: isTabActive(pathname, currentSearch, tab),
		}));
		if (!savedTabs.length) return [];

		const hasActiveSavedTab = savedTabs.some((tab) => tab.active);
		const allTab = buildAllTab(pathname, page);
		allTab.active =
			!hasActiveSavedTab && normalizeTabQuery(currentSearch).length === 0;

		return [allTab, ...savedTabs];
	}, [pathname, searchParams, pageTabs, page]);

	if (!resolvedTabs.length && !action) return null;

	const content = (
		<>
			<div
				className={cn(
					portal
						? "flex h-10 w-full items-center gap-1 overflow-x-auto border-b px-4 sm:px-6"
						: "flex h-10 max-w-full shrink-0 items-center gap-1 overflow-x-auto rounded-md border bg-background p-0.5",
					className,
				)}
			>
				{resolvedTabs.map((tab) => {
					return (
					<div
						className="flex shrink-0 items-center"
						key={`${tab.id ?? tab.title}-${tab.href}`}
					>
						<Button
							variant="ghost"
							size="sm"
							className={cn(
								portal ? "h-10 rounded-none" : "h-8 rounded-sm px-3",
								tab.active
									? portal
										? "border-b-2 border-blue-600"
										: "bg-muted text-foreground shadow-sm"
									: "text-muted-foreground",
							)}
							asChild
							disabled={tab.active}
						>
							<Link
								className="inline-flex items-center gap-2"
								href={tab.href}
							>
								<span>{tab.title}</span>
								{tab.default && <Icons.Star className="size-3.5" />}
								{typeof tab.count === "number" && (
									<Badge className="px-2" variant="secondary">
										{tab.count}
									</Badge>
								)}
							</Link>
						</Button>
					</div>
					);
				})}
				{action ? (
					<div className="flex shrink-0 items-center">{action}</div>
				) : null}
				{hasSavedTabs ? (
					<Button
						aria-label="Edit saved tabs"
						className={cn(
							portal
								? "h-8 w-8 rounded-md px-0 2xl:w-auto 2xl:px-3"
								: "h-8 w-8 rounded-sm border-0 px-0 2xl:w-auto 2xl:px-3",
						)}
						onClick={() => setManageOpen(true)}
						size="sm"
						type="button"
						variant={portal ? "outline" : "ghost"}
					>
						<Icons.Pencil data-icon="inline-start" />
						<span className="hidden 2xl:inline">Edit</span>
					</Button>
				) : null}
			</div>
			<ManagePageTabsDialog
				open={manageOpen}
				onOpenChange={setManageOpen}
				page={resolvedPage}
			/>
		</>
	);

	if (!portal) return content;
	if (!portalNode) return null;
	return createPortal(content, portalNode);
}

export async function invalidatePageTabs(queryClient, trpc, page: string) {
	await Promise.all([
		queryClient.invalidateQueries({
			queryKey: trpc.pageTabs.list.queryKey({ page }),
		}),
		queryClient.invalidateQueries({
			queryKey: trpc.pageTabs.defaults.queryKey(),
		}),
	]);
}
