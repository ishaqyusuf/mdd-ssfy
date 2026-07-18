"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemSeparator,
	ItemTitle,
} from "@gnd/ui/item";
import { InputGroup } from "@gnd/ui/namespace";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Skeleton } from "@gnd/ui/skeleton";
import { Sortable, SortableDragHandle, SortableItem } from "@gnd/ui/sortable";
import { Switch } from "@gnd/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { ToggleGroup, ToggleGroupItem } from "@gnd/ui/toggle-group";
import { toast } from "@gnd/ui/use-toast";
import { Fragment, useEffect, useMemo, useState } from "react";
import { ConfirmDeleteButton } from "./confirm-delete-button";
import { invalidatePageTabs } from "./invalidation";
import type { PageTabItem } from "./types";

type ManagePageTabsDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	page: string;
};

type ManagedPageTab = PageTabItem & {
	id: number;
};

const EMPTY_PAGE_TABS: PageTabItem[] = [];

function titleDraftsFromTabs(tabs: ManagedPageTab[]) {
	return Object.fromEntries(tabs.map((tab) => [tab.id, tab.title]));
}

function humanizeQueryKey(value: string) {
	return (
		QUERY_FIELD_LABELS[value] ??
		value
			.replaceAll(".", " ")
			.replaceAll("_", " ")
			.replace(/\b[a-z]/g, (char) => char.toUpperCase())
	);
}

function humanizeQueryValue(value: string) {
	return (
		QUERY_VALUE_LABELS[value] ??
		value.replaceAll("_", " ").replace(/\b[a-z]/g, (char) => char.toUpperCase())
	);
}

function getSortLabel(sort: string) {
	const [field, direction] = sort.split(".");
	const fieldLabel =
		QUERY_FIELD_LABELS[field] ?? humanizeQueryKey(field || sort);
	const directionLabel =
		direction === "asc"
			? "ascending"
			: direction === "desc"
				? "descending"
				: null;

	return directionLabel ? `${fieldLabel}, ${directionLabel}` : fieldLabel;
}

function queryBadgesFromTabQuery(query?: string | null) {
	if (!query) return [];

	return Array.from(new URLSearchParams(query).entries()).map(
		([key, value]) => {
			if (key === "sort") {
				return {
					key: `${key}:${value}`,
					label: "Sort",
					value: getSortLabel(value),
				};
			}

			return {
				key: `${key}:${value}`,
				label: humanizeQueryKey(key),
				value: humanizeQueryValue(value),
			};
		},
	);
}

export function ManagePageTabsDialog({
	open,
	onOpenChange,
	page,
}: ManagePageTabsDialogProps) {
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const isSuperAdmin = auth.roleTitle?.toLowerCase() === "super admin";
	const { data, isLoading } = useQuery({
		...trpc.pageTabs.list.queryOptions({
			page,
			includeInactive: true,
		}),
		enabled: open,
	});
	const tabs = data ?? EMPTY_PAGE_TABS;
	const managedTabs = useMemo<ManagedPageTab[]>(
		() =>
			tabs.flatMap((tab) => {
				if (typeof tab.id !== "number") return [];

				return [
					{
						...tab,
						id: tab.id,
						visibility: tab.visibility === "public" ? "public" : "private",
					},
				];
			}),
		[tabs],
	);
	const [orderedTabs, setOrderedTabs] = useState<ManagedPageTab[]>([]);
	const [titleDrafts, setTitleDrafts] = useState<Record<number, string>>({});

	useEffect(() => {
		if (!open) return;

		setOrderedTabs(managedTabs);
		setTitleDrafts(titleDraftsFromTabs(managedTabs));
	}, [managedTabs, open]);

	const invalidate = async () => {
		await invalidatePageTabs(queryClient, trpc, page);
	};

	const updateTab = useMutation(
		trpc.pageTabs.update.mutationOptions({
			async onSuccess() {
				await invalidate();
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
				await invalidate();
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
	const reorderTabs = useMutation(
		trpc.pageTabs.reorder.mutationOptions({
			async onSuccess() {
				await invalidate();
			},
			onError(error) {
				toast({
					title: "Unable to reorder page tabs",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	const commitTitle = (tab: ManagedPageTab) => {
		const title = titleDrafts[tab.id]?.trim();
		if (!title || title === tab.title) return;
		updateTab.mutate({ id: tab.id, title });
	};

	const setDefault = (tab: ManagedPageTab) => {
		updateTab.mutate({
			id: tab.id,
			setDefault: !tab.default,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[min(44rem,calc(100vh-2rem))] gap-5 sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>Edit Saved Tabs</DialogTitle>
					<DialogDescription>
						Rename, reorder, publish, draft, delete, and choose the default tab
						for this page.
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="max-h-[32rem] pr-3">
					{isLoading ? (
						<ItemGroup>
							{["loading-tab-1", "loading-tab-2", "loading-tab-3"].map(
								(item) => (
									<Item key={item} className="px-0 py-2.5">
										<ItemContent>
											<Skeleton className="h-4 w-40" />
											<Skeleton className="h-3 w-64" />
										</ItemContent>
									</Item>
								),
							)}
						</ItemGroup>
					) : orderedTabs.length ? (
						<Sortable
							value={orderedTabs}
							onValueChange={(items) => {
								setOrderedTabs(items);
								reorderTabs.mutate({
									page,
									ids: items.map((item) => item.id),
								});
							}}
						>
							<ItemGroup className="gap-2">
								{orderedTabs.map((tab, index) => {
									const canManage = tab.canManage !== false;
									const isActive = tab.active !== false;
									const titleValue = titleDrafts[tab.id] ?? tab.title;
									const queryBadges = queryBadgesFromTabQuery(tab.query);

									return (
										<Fragment key={tab.id}>
											<SortableItem value={tab.id} asChild>
												<Item className="items-start gap-3 px-0 py-2.5">
													<SortableDragHandle
														aria-label={`Reorder ${tab.title}`}
														className="mt-0.5 shrink-0"
														disabled={reorderTabs.isPending}
														size="icon-sm"
														type="button"
														variant="ghost"
													>
														<Icons.GripVertical data-icon="only" />
													</SortableDragHandle>
													<ItemContent className="min-w-0 gap-2">
														<ItemTitle className="w-full min-w-0">
															<InputGroup className="h-8 min-w-0 shadow-none">
																<InputGroup.Addon>
																	<InputGroup.Text>Title</InputGroup.Text>
																</InputGroup.Addon>
																<InputGroup.Input
																	id={`page-tab-title-${tab.id}`}
																	aria-label={`Rename ${tab.title}`}
																	disabled={!canManage || updateTab.isPending}
																	value={titleValue}
																	onChange={(event) => {
																		setTitleDrafts((current) => ({
																			...current,
																			[tab.id]: event.target.value,
																		}));
																	}}
																	onBlur={() => commitTitle(tab)}
																	onKeyDown={(event) => {
																		if (event.key !== "Enter") return;
																		event.currentTarget.blur();
																	}}
																/>
																{typeof tab.count === "number" ? (
																	<InputGroup.Addon align="inline-end">
																		<InputGroup.Text>
																			{tab.count}
																		</InputGroup.Text>
																	</InputGroup.Addon>
																) : null}
															</InputGroup>
														</ItemTitle>
														{tab.default ? (
															<ItemDescription className="flex flex-wrap items-center gap-1.5">
																<Badge variant="secondary">Default</Badge>
															</ItemDescription>
														) : null}
														<div className="flex flex-wrap gap-1.5">
															{queryBadges.length ? (
																queryBadges.map((badge) => (
																	<Badge
																		key={badge.key}
																		variant="outline"
																		className="max-w-full gap-1 rounded-sm px-1.5 py-0 text-[10px] font-normal"
																	>
																		<span className="shrink-0 text-muted-foreground">
																			{badge.label}
																		</span>
																		<span className="min-w-0 truncate">
																			{badge.value}
																		</span>
																	</Badge>
																))
															) : (
																<Badge
																	variant="outline"
																	className="rounded-sm px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
																>
																	No saved query
																</Badge>
															)}
														</div>
													</ItemContent>
													<ItemActions className="flex flex-wrap items-center justify-end gap-1.5">
														<label
															htmlFor={`page-tab-active-${tab.id}`}
															className="flex h-8 items-center gap-2 rounded-md border px-2 text-xs"
														>
															<span>Active</span>
															<Switch
																id={`page-tab-active-${tab.id}`}
																checked={isActive}
																disabled={!canManage || updateTab.isPending}
																onCheckedChange={(checked) => {
																	updateTab.mutate({
																		id: tab.id,
																		active: checked,
																	});
																}}
															/>
														</label>
														{isSuperAdmin && canManage ? (
															<ToggleGroup
																type="single"
																variant="outline"
																size="sm"
																value={tab.visibility ?? "private"}
																onValueChange={(value) => {
																	if (value !== "private" && value !== "public")
																		return;
																	updateTab.mutate({
																		id: tab.id,
																		visibility: value,
																	});
																}}
															>
																<ToggleGroupItem value="private">
																	Private
																</ToggleGroupItem>
																<ToggleGroupItem value="public">
																	Public
																</ToggleGroupItem>
															</ToggleGroup>
														) : null}
														<Button
															disabled={!isActive || updateTab.isPending}
															onClick={() => setDefault(tab)}
															size="sm"
															type="button"
															variant={tab.default ? "secondary" : "outline"}
														>
															<Icons.Star data-icon="inline-start" />
															{tab.default ? "Default" : "Make default"}
														</Button>
														{canManage ? (
															<ConfirmDeleteButton
																name={tab.title}
																disabled={deleteTab.isPending}
																onConfirm={() =>
																	deleteTab.mutate({ id: tab.id })
																}
															/>
														) : null}
													</ItemActions>
												</Item>
											</SortableItem>
											{index < orderedTabs.length - 1 ? (
												<ItemSeparator />
											) : null}
										</Fragment>
									);
								})}
							</ItemGroup>
						</Sortable>
					) : (
						<ItemGroup>
							<Item variant="muted">
								<ItemContent>
									<ItemTitle>No saved tabs</ItemTitle>
									<ItemDescription>
										Save a filter or sort to create the first tab for this page.
									</ItemDescription>
								</ItemContent>
							</Item>
						</ItemGroup>
					)}
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}

const QUERY_FIELD_LABELS: Record<string, string> = {
	amountDue: "Balance",
	createdAt: "Date",
	date: "Date",
	grandTotal: "Invoice",
	invoice: "Invoice",
	latestPaymentAt: "Latest payment",
	lotBlock: "Lot / block",
	orderId: "Order",
	paymentReview: "Payment Review",
	project: "Project",
	q: "Search",
	sort: "Sort",
	"sales.rep": "Sales Rep",
};

const QUERY_VALUE_LABELS: Record<string, string> = {
	needs_review: "Needs review",
};
