"use client";

import Link from "@/components/link";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

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
}

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

export function PageTabs({
	tabs,
	portal = true,
	className,
	page,
}: PageTabsProps) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
	const resolvedPage = normalizePagePath(page || pathname);
	const shouldFetch = !tabs;
	const { data } = useQuery({
		enabled: shouldFetch,
		...trpc.pageTabs.list.queryOptions({ page: resolvedPage }),
	});
	const pageTabs = tabs ?? data ?? [];

	const updateTab = useMutation(
		trpc.pageTabs.update.mutationOptions({
			async onSuccess() {
				await invalidatePageTabs(queryClient, trpc, resolvedPage);
				toast({
					title: "Page tab updated",
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Unable to update page tab",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	const deleteTab = useMutation(
		trpc.pageTabs.delete.mutationOptions({
			async onSuccess() {
				await invalidatePageTabs(queryClient, trpc, resolvedPage);
				toast({
					title: "Page tab deleted",
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Unable to delete page tab",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	useEffect(() => {
		if (!portal) return;
		setPortalNode(document.getElementById("pageTab"));
	}, [portal]);

	const resolvedTabs = useMemo(() => {
		const currentSearch = new URLSearchParams(searchParams.toString());
		return pageTabs.map((tab) => ({
			...tab,
			href: buildTabHref(pathname, currentSearch, tab),
			active: isTabActive(pathname, currentSearch, tab),
		}));
	}, [pathname, searchParams, pageTabs]);

	if (!resolvedTabs.length) return null;

	const content = (
		<div
			className={cn(
				"flex h-10 w-full items-center gap-1 overflow-x-auto border-b px-4 sm:px-6",
				className,
			)}
		>
			{resolvedTabs.map((tab) => {
				const tabId = tab.id;

				return (
					<div
						className="flex shrink-0 items-center"
						key={`${tab.id ?? tab.title}-${tab.href}`}
					>
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
						>
							<Link
								className="inline-flex items-center space-x-2"
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
						{tabId && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										aria-label={`Manage ${tab.title} tab`}
										className="h-8 w-8 rounded-full px-0 text-muted-foreground"
										size="sm"
										type="button"
										variant="ghost"
									>
										<Icons.MoreHorizontal className="size-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onClick={() => {
											const title = window.prompt("Tab name", tab.title);
											if (!title?.trim()) return;
											updateTab.mutate({ id: tabId, title: title.trim() });
										}}
									>
										<Icons.Pencil className="mr-2 size-4" />
										Rename
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => {
											updateTab.mutate({
												id: tabId,
												setDefault: !tab.default,
											});
										}}
									>
										<Icons.Star className="mr-2 size-4" />
										{tab.default ? "Unset default" : "Set as default"}
									</DropdownMenuItem>
									<DropdownMenuItem
										className="text-destructive"
										onClick={() => deleteTab.mutate({ id: tabId })}
									>
										<Icons.Trash className="mr-2 size-4" />
										Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				);
			})}
		</div>
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
