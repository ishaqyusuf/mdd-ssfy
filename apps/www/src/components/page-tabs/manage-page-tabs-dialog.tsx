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
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@gnd/ui/field";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from "@gnd/ui/item";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Skeleton } from "@gnd/ui/skeleton";
import {
	Sortable,
	SortableDragHandle,
	SortableItem,
} from "@gnd/ui/sortable";
import { Switch } from "@gnd/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { ToggleGroup, ToggleGroupItem } from "@gnd/ui/toggle-group";
import { toast } from "@gnd/ui/use-toast";
import { useEffect, useMemo, useState } from "react";
import { ConfirmDeleteButton } from "./confirm-delete-button";
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
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.pageTabs.list.queryKey({ page }),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.pageTabs.list.queryKey({
					page,
					includeInactive: true,
				}),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.pageTabs.defaults.queryKey(),
			}),
		]);
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
										<Item key={item} variant="outline">
											<ItemMedia variant="icon" />
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
								{orderedTabs.map((tab) => {
									const canManage = tab.canManage !== false;
									const isActive = tab.active !== false;
									const titleValue = titleDrafts[tab.id] ?? tab.title;

									return (
										<SortableItem key={tab.id} value={tab.id} asChild>
											<Item variant="outline" className="items-start">
												<ItemMedia variant="default">
													<SortableDragHandle
														aria-label={`Reorder ${tab.title}`}
														disabled={reorderTabs.isPending}
														size="icon-sm"
														type="button"
														variant="ghost"
													>
														<Icons.GripVertical data-icon="only" />
													</SortableDragHandle>
												</ItemMedia>
												<ItemContent>
													<ItemTitle className="w-full">
														<FieldGroup className="gap-3">
															<Field>
																<FieldLabel htmlFor={`page-tab-title-${tab.id}`}>
																	Name
																</FieldLabel>
																<Input
																	id={`page-tab-title-${tab.id}`}
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
															</Field>
														</FieldGroup>
													</ItemTitle>
													<ItemDescription className="flex flex-wrap items-center gap-2">
														<Badge variant={isActive ? "secondary" : "outline"}>
															{isActive ? "Active" : "Draft"}
														</Badge>
														<Badge variant="outline">
															{tab.visibility === "public" ? "Public" : "Private"}
														</Badge>
														{tab.default ? (
															<Badge variant="secondary">Default</Badge>
														) : null}
														{typeof tab.count === "number" ? (
															<Badge variant="secondary">{tab.count}</Badge>
														) : null}
													</ItemDescription>
													<FieldGroup className="gap-4 pt-2">
														<Field orientation="horizontal">
															<FieldContent>
																<FieldLabel htmlFor={`page-tab-active-${tab.id}`}>
																	Active
																</FieldLabel>
																<FieldDescription>
																	Draft tabs stay saved but do not show in the tab
																	row.
																</FieldDescription>
															</FieldContent>
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
														</Field>
														{isSuperAdmin && canManage ? (
															<Field orientation="horizontal">
																<FieldContent>
																	<FieldLabel>Visibility</FieldLabel>
																	<FieldDescription>
																		Public tabs are visible to everyone on this
																		page.
																	</FieldDescription>
																</FieldContent>
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
															</Field>
														) : null}
													</FieldGroup>
												</ItemContent>
												<ItemActions>
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
