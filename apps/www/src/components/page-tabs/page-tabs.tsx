"use client";

import Link from "@/components/link";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMediaQuery } from "react-responsive";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";

import { screens } from "@/lib/responsive";
import {
	getPageTabButtonClassName,
	getPageTabButtonVariant,
} from "./button-variant";
import { ManagePageTabsDialog } from "./manage-page-tabs-dialog";
import {
	buildPageTabHref,
	normalizePagePath,
	normalizeTabQuery,
	queryContainsTabQuery,
} from "./query-utils";
import {
	getPageTabViewState,
	isResolvedPageTabActive,
	shouldRenderPageTabsShell,
	splitPageTabs,
} from "./render-utils";
import type { PageTabItem } from "./types";
import { usePageTabSelection } from "./use-page-tab-selection";

interface PageTabsProps {
	tabs?: PageTabItem[];
	portal?: boolean;
	className?: string;
	page?: string;
	action?: ReactNode;
	currentQuery?: string;
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
		return buildPageTabHref(basePath, tab.query, tab.title);
	}

	if (!tab.params || Object.keys(tab.params).length === 0) {
		return basePath;
	}

	const nextParams = new URLSearchParams(searchParams.toString());
	nextParams.delete("_page");
	for (const [key, value] of Object.entries(tab.params)) {
		nextParams.set(key, value);
	}

	return buildPageTabHref(basePath, nextParams, tab.title);
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
	currentQuery,
}: PageTabsProps) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const is2xl = useMediaQuery(screens["2xl"]);
	const trpc = useTRPC();
	const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
	const [manageOpen, setManageOpen] = useState(false);
	const resolvedPage = normalizePagePath(page || pathname);
	const shouldFetch = tabs === undefined;
	const { data, isSuccess } = useQuery({
		enabled: shouldFetch,
		...trpc.pageTabs.list.queryOptions({ page: resolvedPage }),
	});
	const pageTabs = tabs ?? data ?? [];
	const hasSavedTabs = pageTabs.length > 0;
	const hasActionNode = Boolean(action);
	const tabDataReady = tabs !== undefined || isSuccess;
	const viewState = getPageTabViewState({
		currentQuery,
		isReady: tabDataReady,
		tabs: pageTabs,
	});
	const selectedState = usePageTabSelection({
		page: resolvedPage,
		tabs: pageTabs,
		isReady: tabDataReady,
	});
	const canShowAction = Boolean(hasActionNode && viewState.hasUnsavedView);

	useEffect(() => {
		if (!portal) return;
		setPortalNode(document.getElementById("pageTab"));
	}, [portal]);

	const resolvedTabs = useMemo(() => {
		const currentSearch = new URLSearchParams(searchParams.toString());
		const savedTabs = pageTabs.map((tab, index) => {
			return {
				...tab,
				href: buildTabHref(pathname, currentSearch, tab),
				active: isResolvedPageTabActive({
					hasSavedQuery: tab.query !== undefined,
					index,
					selectedIndex: selectedState.matchingTabIndex,
					fallbackActive: isTabActive(pathname, currentSearch, tab),
				}),
			};
		});
		if (!savedTabs.length) return [];

		const hasActiveSavedTab = savedTabs.some((tab) => tab.active);
		const allTab = buildAllTab(pathname, page);
		const normalizedCurrentQuery = normalizeTabQuery(
			currentQuery ?? currentSearch,
		);
		allTab.active = !hasActiveSavedTab && normalizedCurrentQuery.length === 0;

		return [allTab, ...savedTabs];
	}, [
		pathname,
		searchParams,
		pageTabs,
		page,
		currentQuery,
		selectedState.matchingTabIndex,
	]);
	const selectedResolvedTabIndex = resolvedTabs.findIndex((tab) => tab.active);
	const { visibleTabs, overflowTabs } = splitPageTabs(
		resolvedTabs,
		is2xl ? 5 : 3,
		selectedResolvedTabIndex,
	);
	const hasActiveOverflowTab = overflowTabs.some((tab) => tab.active);

	if (
		!shouldRenderPageTabsShell({
			tabCount: resolvedTabs.length,
			hasAction: canShowAction,
			hasActionNode,
		})
	) {
		return null;
	}

	const content = (
		<>
			<div
				className={cn(
					portal
						? "flex h-10 w-full min-w-0 items-stretch border-b px-4 empty:hidden [&:empty]:hidden sm:px-6"
						: "flex h-10 max-w-full min-w-0 shrink-0 items-center overflow-hidden rounded-md border bg-background p-0.5 empty:hidden [&:empty]:hidden",
					className,
				)}
			>
				<div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
					{visibleTabs.map((tab) => {
						return (
							<div
								className="flex shrink-0 items-center"
								key={`${tab.id ?? tab.title}-${tab.href}`}
							>
								<Button
									variant={getPageTabButtonVariant(tab.active)}
									size="sm"
									className={cn(
										portal ? "h-10 rounded-none" : "h-8 rounded-sm px-3",
										getPageTabButtonClassName(tab.active),
									)}
									asChild
								>
									<Link
										aria-current={tab.active ? "page" : undefined}
										className="inline-flex items-center gap-2"
										href={tab.href}
									>
										<span>{tab.title}</span>
										{tab.default ? (
											<Icons.Star
												aria-label="Default tab"
												className="size-3.5"
											/>
										) : null}
										{typeof tab.count === "number" ? (
											<Badge
												className={cn(
													"px-2 tabular-nums",
													tab.active &&
														"border-transparent bg-white/20 text-white hover:bg-white/20 dark:bg-orange-950/20 dark:text-orange-950 dark:hover:bg-orange-950/20",
												)}
												variant="secondary"
											>
												{tab.count}
											</Badge>
										) : null}
									</Link>
								</Button>
							</div>
						);
					})}
				</div>
				{canShowAction || hasSavedTabs ? (
					<div
						className={cn(
							"ml-auto flex shrink-0 items-center gap-1 bg-background pl-1",
							hasSavedTabs &&
								"border-l shadow-[-10px_0_14px_-14px_rgba(0,0,0,0.7)]",
							portal ? "h-full" : "h-8 rounded-r-sm",
						)}
					>
						{canShowAction ? (
							<span className="hidden h-6 items-center rounded-sm border bg-muted/40 px-2 text-[11px] font-medium text-muted-foreground xl:inline-flex">
								Unsaved
							</span>
						) : null}
						{canShowAction ? action : null}
						{overflowTabs.length > 0 ? (
							<DropdownMenu>
								<TooltipProvider delayDuration={120}>
									<Tooltip>
										<TooltipTrigger asChild>
											<DropdownMenuTrigger asChild>
												<Button
													aria-label={`${overflowTabs.length} more saved ${overflowTabs.length === 1 ? "tab" : "tabs"}`}
													className={cn(
														"h-8 min-w-8 px-2 tabular-nums",
														portal ? "rounded-md" : "rounded-sm border-0",
														getPageTabButtonClassName(hasActiveOverflowTab),
													)}
													size="sm"
													type="button"
													variant={getPageTabButtonVariant(
														hasActiveOverflowTab,
													)}
												>
													+{overflowTabs.length}
												</Button>
											</DropdownMenuTrigger>
										</TooltipTrigger>
										<TooltipContent className="px-2 py-1 text-xs" side="top">
											More saved tabs
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
								<DropdownMenuContent align="end" className="min-w-56">
									{overflowTabs.map((tab) => (
										<DropdownMenuItem
											asChild
											key={`${tab.id ?? tab.title}-${tab.href}`}
										>
											<Link
												aria-current={tab.active ? "page" : undefined}
												className={cn(
													"flex w-full items-center gap-2",
													tab.active && "bg-accent font-medium",
												)}
												href={tab.href}
											>
												<span className="min-w-0 flex-1 truncate">
													{tab.title}
												</span>
												{tab.default ? (
													<Icons.Star
														aria-label="Default tab"
														className="size-3.5"
													/>
												) : null}
												{typeof tab.count === "number" ? (
													<Badge
														className="px-2 tabular-nums"
														variant="secondary"
													>
														{tab.count}
													</Badge>
												) : null}
											</Link>
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						) : null}
						{hasSavedTabs ? (
							<TooltipProvider delayDuration={120}>
								<Tooltip>
									<TooltipTrigger asChild>
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
											<Icons.Edit data-icon="inline-start" />
											<span className="hidden 2xl:inline">Edit</span>
										</Button>
									</TooltipTrigger>
									<TooltipContent className="px-2 py-1 text-xs" side="top">
										Edit saved tabs
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						) : null}
					</div>
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
