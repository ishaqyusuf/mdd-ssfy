"use client";

import { useDebounce } from "@/hooks/use-debounce";
import { useStorefrontCatalogFilterParams } from "@/hooks/use-storefront-catalog-filter-params";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import {
	WorkflowComponentCard,
	WorkflowComponentPreview,
	resolveWorkflowComponentImageSrc,
} from "@gnd/sales/sales-form";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@gnd/ui/context-menu";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useEffect, useMemo, useState } from "react";
import { StorefrontCatalogItemSheet } from "./storefront-catalog-item-sheet";

type CatalogItem =
	RouterOutputs["storefrontAdmin"]["catalog"]["list"]["items"][number];
type CatalogPage = RouterOutputs["storefrontAdmin"]["catalog"]["list"];
type CatalogFamily =
	RouterOutputs["storefrontAdmin"]["catalog"]["families"][number];
type CatalogProfile =
	RouterOutputs["storefrontAdmin"]["catalog"]["profiles"][number];

type StorefrontCatalogGridProps = {
	initialCatalog: { pages: CatalogPage[]; pageParams: unknown[] };
	initialFamilies: CatalogFamily[];
	initialProfiles: CatalogProfile[];
};

function formatMoney(value: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value);
}

export function StorefrontCatalogGrid(props: StorefrontCatalogGridProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { filters, setFilters } = useStorefrontCatalogFilterParams();
	const [search, setSearch] = useState(filters.q || "");
	const [selected, setSelected] = useState<Set<string>>(() => new Set());
	const debouncedSearch = useDebounce(search, 250);

	useEffect(() => {
		void setFilters({ q: debouncedSearch || null });
	}, [debouncedSearch, setFilters]);
	useEffect(() => {
		function handleShortcut(event: KeyboardEvent) {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
				event.preventDefault();
				document.getElementById("storefront-catalog-search")?.focus();
			}
		}
		window.addEventListener("keydown", handleShortcut);
		return () => window.removeEventListener("keydown", handleShortcut);
	}, []);

	const queryInput = {
		query: filters.q || undefined,
		family: filters.family || undefined,
		status: filters.status || undefined,
		featured: filters.featured ?? undefined,
		profileId: filters.profileId || undefined,
		limit: 24,
	};
	const catalog = useInfiniteQuery(
		trpc.storefrontAdmin.catalog.list.infiniteQueryOptions(queryInput, {
			getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
		}),
	);
	const families = useQuery(
		trpc.storefrontAdmin.catalog.families.queryOptions(),
	);
	const profiles = useQuery(
		trpc.storefrontAdmin.catalog.profiles.queryOptions(),
	);
	const catalogData = catalog.data || props.initialCatalog;
	const familyRows = families.data || props.initialFamilies;
	const profileRows = profiles.data || props.initialProfiles;
	const items = useMemo(
		() => catalogData.pages.flatMap((page) => page.items),
		[catalogData],
	);

	async function refresh() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.storefrontAdmin.catalog.list.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.storefrontAdmin.catalog.families.queryKey(),
			}),
		]);
	}
	const statusMutation = useMutation(
		trpc.storefrontAdmin.catalog.setStatus.mutationOptions({
			onSuccess: refresh,
			onError: showMutationError,
		}),
	);
	const imageMutation = useMutation(
		trpc.storefrontAdmin.catalog.setImage.mutationOptions({
			onSuccess: refresh,
			onError: showMutationError,
		}),
	);
	const featuredMutation = useMutation(
		trpc.storefrontAdmin.catalog.setFeatured.mutationOptions({
			onSuccess: refresh,
			onError(error) {
				showMutationError(error);
			},
		}),
	);
	const bulkMutation = useMutation(
		trpc.storefrontAdmin.catalog.bulkUpdate.mutationOptions({
			async onSuccess(result) {
				await refresh();
				setSelected(new Set());
				toast({
					title: `${result.updated} component${result.updated === 1 ? "" : "s"} updated`,
					description: result.skipped
						? `${result.skipped} item${result.skipped === 1 ? " was" : "s were"} not eligible.`
						: undefined,
					variant: "success",
				});
			},
			onError: showMutationError,
		}),
	);

	function openEdit(uid: string) {
		void setFilters({ catalogItemId: uid });
	}
	function toggleSelected(uid: string) {
		setSelected((current) => {
			const next = new Set(current);
			if (next.has(uid)) next.delete(uid);
			else next.add(uid);
			return next;
		});
	}
	function openStorefront(path: string | null) {
		if (!path) return;
		const origin = window.location.hostname.endsWith(".localhost")
			? "https://gnd-storefront.localhost"
			: "https://gndmillwork.com";
		window.open(new URL(path, origin), "_blank", "noopener,noreferrer");
	}

	return (
		<section className="space-y-5" aria-labelledby="storefront-catalog-title">
			<div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
				<div>
					<h2 id="storefront-catalog-title" className="text-lg font-semibold">
						Catalog
					</h2>
					<p className="text-sm text-muted-foreground">
						Canonical sales components available for online merchandising.
					</p>
				</div>
				<div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
					<div className="relative sm:w-[350px]">
						<Icons.Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							id="storefront-catalog-search"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Escape") setSearch("");
							}}
							placeholder="Search catalog"
							className="pl-9 pr-9"
						/>
						<Icons.Filter className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					</div>
					<CatalogFilters profiles={profileRows} />
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				{familyRows.map((family) => (
					<Button
						key={family.family}
						variant={filters.family === family.family ? "default" : "outline"}
						size="sm"
						onClick={() =>
							void setFilters({
								family: filters.family === family.family ? null : family.family,
							})
						}
					>
						{family.label}
						<Badge variant="secondary" className="ml-2 tabular-nums">
							{family.online}
						</Badge>
					</Button>
				))}
				{filters.status ? (
					<FilterChip
						label={`Status: ${filters.status}`}
						onClear={() => void setFilters({ status: null })}
					/>
				) : null}
				{filters.featured != null ? (
					<FilterChip
						label={filters.featured ? "Featured" : "Not featured"}
						onClear={() => void setFilters({ featured: null })}
					/>
				) : null}
				{filters.profileId ? (
					<FilterChip
						label={`Profile: ${profileRows.find((profile) => profile.id === filters.profileId)?.title || filters.profileId}`}
						onClear={() => void setFilters({ profileId: null })}
					/>
				) : null}
				{filters.family ||
				filters.status ||
				filters.featured != null ||
				filters.profileId ? (
					<Button
						variant="ghost"
						size="sm"
						onClick={() =>
							void setFilters({
								family: null,
								status: null,
								featured: null,
								profileId: null,
							})
						}
					>
						Clear filters
					</Button>
				) : null}
			</div>

			{catalog.isPending ? (
				<CatalogSkeleton />
			) : catalog.error ? (
				<div className="rounded-md border border-destructive/30 p-8 text-center text-sm text-destructive">
					{catalog.error.message}
				</div>
			) : items.length ? (
				<>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
						{items.map((item) => (
							<CatalogCard
								key={item.uid}
								item={item}
								selected={selected.has(item.uid)}
								showSalesPrice={Boolean(filters.profileId)}
								onToggle={() => toggleSelected(item.uid)}
								onEdit={() => openEdit(item.uid)}
								onStatus={(online) =>
									statusMutation.mutate({ componentUid: item.uid, online })
								}
								onResetImage={() =>
									imageMutation.mutate({
										componentUid: item.uid,
										imageUrl: null,
									})
								}
								onFeatured={(featured) =>
									featuredMutation.mutate({ componentUid: item.uid, featured })
								}
								onOpenStorefront={() => openStorefront(item.storefrontPath)}
							/>
						))}
					</div>
					{catalog.hasNextPage ? (
						<div className="flex justify-center pt-2">
							<Button
								variant="outline"
								disabled={catalog.isFetchingNextPage}
								onClick={() => void catalog.fetchNextPage()}
							>
								{catalog.isFetchingNextPage ? "Loading..." : "Load more"}
							</Button>
						</div>
					) : null}
				</>
			) : (
				<div className="rounded-md border p-12 text-center">
					<p className="font-medium">
						No catalog components match these filters.
					</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Clear a filter or search another component.
					</p>
				</div>
			)}
			{selected.size ? (
				<div className="fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-md border bg-background p-2 shadow-lg">
					<span className="px-2 text-sm font-medium">
						{selected.size} selected
					</span>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setSelected(new Set())}
					>
						Deselect
					</Button>
					{(["online", "offline", "feature", "unfeature"] as const).map(
						(action) => (
							<Button
								key={action}
								variant="outline"
								size="sm"
								disabled={bulkMutation.isPending}
								onClick={() =>
									bulkMutation.mutate({ componentUids: [...selected], action })
								}
							>
								{action === "online"
									? "Set online"
									: action === "offline"
										? "Set offline"
										: action === "feature"
											? "Add featured"
											: "Remove featured"}
							</Button>
						),
					)}
				</div>
			) : null}
			<StorefrontCatalogItemSheet />
		</section>
	);
}

function CatalogFilters({
	profiles,
}: {
	profiles: Array<{
		id: number;
		title: string | null;
		coefficient: number | null;
	}>;
}) {
	const { filters, setFilters } = useStorefrontCatalogFilterParams();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">
					<Icons.Filter className="mr-2 size-4" />
					Filters
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel>Catalog filters</DropdownMenuLabel>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem
							onClick={() => void setFilters({ status: "online" })}
						>
							Online{" "}
							{filters.status === "online" ? (
								<Icons.Check className="ml-auto size-4" />
							) : null}
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => void setFilters({ status: "offline" })}
						>
							Offline{" "}
							{filters.status === "offline" ? (
								<Icons.Check className="ml-auto size-4" />
							) : null}
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>Featured</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem
							onClick={() => void setFilters({ featured: true })}
						>
							Added
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => void setFilters({ featured: false })}
						>
							Not added
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>Profile</DropdownMenuSubTrigger>
					<DropdownMenuSubContent className="max-h-72 overflow-y-auto">
						{profiles.map((profile) => (
							<DropdownMenuItem
								key={profile.id}
								onClick={() => void setFilters({ profileId: profile.id })}
							>
								{profile.title || `Profile ${profile.id}`}
							</DropdownMenuItem>
						))}
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() =>
						void setFilters({ status: null, featured: null, profileId: null })
					}
				>
					Clear filters
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function CatalogCard(props: {
	item: CatalogItem;
	selected: boolean;
	showSalesPrice: boolean;
	onToggle: () => void;
	onEdit: () => void;
	onStatus: (online: boolean) => void;
	onResetImage: () => void;
	onFeatured: (featured: boolean) => void;
	onOpenStorefront: () => void;
}) {
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<div
					style={{ contentVisibility: "auto", containIntrinsicSize: "280px" }}
				>
					<WorkflowComponentCard
						selected={props.selected}
						badgesSlot={
							<div className="absolute left-2 top-2 z-[2] flex items-center gap-1.5">
								<Checkbox
									checked={props.selected}
									onCheckedChange={props.onToggle}
									aria-label={`Select ${props.item.title}`}
									className="bg-background"
								/>
								{props.item.online ? (
									<Badge className="bg-emerald-600 text-white">Online</Badge>
								) : (
									<Badge variant="secondary">Offline</Badge>
								)}
								{props.item.featured ? (
									<Badge className="bg-amber-500 text-black">Featured</Badge>
								) : null}
							</div>
						}
						actionsSlot={<CatalogCardMenu {...props} />}
					>
						<button
							type="button"
							className="block w-full text-left"
							onClick={props.onEdit}
						>
							<WorkflowComponentPreview
								imageSrc={resolveWorkflowComponentImageSrc(props.item.imageUrl)}
								title={props.item.title}
								priceSlot={
									<div className="flex flex-wrap gap-1.5 pt-1">
										<Badge className="bg-red-100 text-red-700 hover:bg-red-100">
											Cost {formatMoney(props.item.costPrice)}
										</Badge>
										{props.showSalesPrice ? (
											<Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
												Sales {formatMoney(props.item.salesPrice)}
											</Badge>
										) : null}
									</div>
								}
							/>
							<div className="border-t px-3 py-2 text-xs capitalize text-muted-foreground">
								{props.item.family.replace("-", " ")}
							</div>
						</button>
					</WorkflowComponentCard>
				</div>
			</ContextMenuTrigger>
			<ContextMenuContent className="w-52">
				<ContextMenuItem
					disabled={!props.item.storefrontPath}
					onSelect={props.onOpenStorefront}
				>
					<Icons.ExternalLink className="mr-2 size-4" />
					Open in storefront
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}

function CatalogCardMenu(props: Parameters<typeof CatalogCard>[0]) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					size="icon"
					className="size-8 bg-background"
					aria-label={`Actions for ${props.item.title}`}
				>
					<Icons.MoreHorizontal className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-52">
				<DropdownMenuItem onClick={props.onEdit}>
					<Icons.Pencil className="mr-2 size-4" />
					Edit
				</DropdownMenuItem>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem onClick={() => props.onStatus(true)}>
							Online
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => props.onStatus(false)}>
							Offline
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>Image</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem onClick={props.onResetImage}>
							Reset default
						</DropdownMenuItem>
						<DropdownMenuItem onClick={props.onEdit}>
							Change image
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>Featured</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem onClick={() => props.onFeatured(true)}>
							Add
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => props.onFeatured(false)}>
							Remove
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function FilterChip({
	label,
	onClear,
}: { label: string; onClear: () => void }) {
	return (
		<Button variant="secondary" size="sm" onClick={onClear}>
			{label}
			<Icons.X className="ml-2 size-3.5" />
		</Button>
	);
}

function CatalogSkeleton() {
	const placeholders = ["a", "b", "c", "d", "e", "f", "g", "h"];
	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
			{placeholders.map((placeholder) => (
				<div
					key={placeholder}
					className="h-[250px] animate-pulse rounded-md border bg-muted"
				/>
			))}
		</div>
	);
}

function showMutationError(error: { message: string }) {
	toast({
		title: "Catalog update failed",
		description: error.message,
		variant: "destructive",
	});
}
