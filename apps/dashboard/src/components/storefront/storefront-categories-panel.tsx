"use client";

import { useStorefrontCatalogFilterParams } from "@/hooks/use-storefront-catalog-filter-params";
import { useTRPC } from "@/trpc/client";
import { resolveWorkflowComponentImageSrc } from "@gnd/sales/sales-form";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Switch } from "@gnd/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import Link from "next/link";
import { StorefrontCatalogItemSheet } from "./catalog/storefront-catalog-item-sheet";

export function StorefrontCategoriesPanel({
	initialCategoryId,
}: {
	initialCategoryId: string;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { filters, setFilters } = useStorefrontCatalogFilterParams();
	const categories = useQuery(
		trpc.storefrontAdmin.categories.list.queryOptions(),
	);
	const selectedCategoryId =
		categories.data?.find((category) => category.id === filters.categoryId)?.id ||
		initialCategoryId;
	const selectedCategory = categories.data?.find(
		(category) => category.id === selectedCategoryId,
	);
	const products = useQuery(
		trpc.storefrontAdmin.categories.products.queryOptions(
			{
				categoryId: selectedCategoryId,
				query: filters.q || undefined,
			},
			{ enabled: Boolean(selectedCategoryId) },
		),
	);

	async function refresh() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.storefrontAdmin.categories.list.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.storefrontAdmin.categories.products.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.storefrontAdmin.catalog.list.queryKey(),
			}),
		]);
	}

	const setCategoryStatus = useMutation(
		trpc.storefrontAdmin.categories.setStatus.mutationOptions({
			onSuccess: async () => {
				await refresh();
				toast({ title: "Category status updated", variant: "success" });
			},
			onError: showError,
		}),
	);
	const setProductStatus = useMutation(
		trpc.storefrontAdmin.catalog.setStatus.mutationOptions({
			onSuccess: async () => {
				await refresh();
				toast({ title: "Product status updated", variant: "success" });
			},
			onError: showError,
		}),
	);

	return (
		<section className="space-y-5" aria-labelledby="storefront-categories-title">
			<div>
				<h2 id="storefront-categories-title" className="text-lg font-semibold">
					Storefront products
				</h2>
				<p className="text-sm text-muted-foreground">
					Choose an item type, then control the products customers can see.
				</p>
			</div>

			<div className="grid min-h-[620px] overflow-hidden rounded-lg border bg-background lg:grid-cols-[260px_minmax(0,1fr)]">
				<aside className="border-b bg-muted/20 p-3 lg:border-b-0 lg:border-r">
					<p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Categories
					</p>
					<div className="space-y-1">
						{categories.isPending ? (
							<p className="px-2 py-6 text-sm text-muted-foreground">Loading categories…</p>
						) : categories.error ? (
							<p className="px-2 py-6 text-sm text-destructive">{categories.error.message}</p>
						) : (
							categories.data?.map((category) => {
								const active = category.id === selectedCategoryId;
								return (
									<Link
										key={category.id}
										href={`/storefront/categories?categoryId=${encodeURIComponent(category.id)}`}
										className={cn(
											"flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors",
											active
												? "bg-background font-medium shadow-sm ring-1 ring-border"
												: "text-muted-foreground hover:bg-background/70 hover:text-foreground",
										)}
									>
										<span
											className={cn(
												"size-2 rounded-full",
												category.status === "PUBLISHED"
													? "bg-emerald-500"
													: "bg-amber-400",
											)}
										/>
										<span className="min-w-0 flex-1 truncate">{category.title}</span>
										<span className="tabular-nums text-xs">{category._count.offers}</span>
									</Link>
								);
							})
						)}
					</div>
				</aside>

				<div className="min-w-0 p-4 sm:p-6">
					{selectedCategory ? (
						<>
							<div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<div className="flex flex-wrap items-center gap-2">
										<h3 className="text-xl font-semibold">{selectedCategory.title}</h3>
										<Badge variant={selectedCategory.status === "PUBLISHED" ? "default" : "secondary"}>
											{selectedCategory.status === "PUBLISHED" ? "Online" : "Draft"}
										</Badge>
									</div>
									<p className="mt-1 text-sm text-muted-foreground">
										/{selectedCategory.slug} · {selectedCategory._count.offers} products
									</p>
								</div>
								<div className="flex items-center gap-3 rounded-md border px-3 py-2">
									<div>
										<p className="text-sm font-medium">Category online</p>
										<p className="text-xs text-muted-foreground">Show this item type in the storefront</p>
									</div>
									<Switch
										checked={selectedCategory.status === "PUBLISHED"}
										disabled={setCategoryStatus.isPending}
										onCheckedChange={(checked) =>
											setCategoryStatus.mutate({
												id: selectedCategory.id,
												status: checked ? "PUBLISHED" : "DRAFT",
											})
										}
									/>
								</div>
							</div>

							<div className="relative my-5 max-w-md">
								<Icons.Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									value={filters.q || ""}
									onChange={(event) => void setFilters({ q: event.target.value || null })}
									placeholder={`Search ${selectedCategory.title.toLowerCase()}`}
									className="pl-9"
								/>
							</div>

							{products.isPending ? (
								<ProductGridSkeleton />
							) : products.error ? (
								<div className="rounded-md border border-destructive/30 p-8 text-center text-sm text-destructive">
									{products.error.message}
								</div>
							) : products.data?.length ? (
								<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
									{products.data.map((product) => {
										const image = resolveWorkflowComponentImageSrc(product.imageUrl);
										return (
											<article key={product.id} className="overflow-hidden rounded-lg border bg-background">
												<button type="button" className="block w-full text-left" onClick={() => void setFilters({ catalogItemId: product.sourceComponentUid })}>
													<div className="flex aspect-[4/3] items-center justify-center bg-muted/50">
														{image ? <img src={image} alt="" className="size-full object-contain p-4" /> : <Icons.Image className="size-8 text-muted-foreground" />}
													</div>
													<div className="p-4">
														<div className="flex items-start justify-between gap-3">
															<h4 className="font-medium leading-snug">{product.title}</h4>
															{product.featured ? <Badge variant="secondary">Featured</Badge> : null}
														</div>
														<p className="mt-2 text-xs text-muted-foreground">Click to edit content and images</p>
													</div>
												</button>
												<div className="flex items-center justify-between border-t px-4 py-3">
													<span className="text-sm font-medium">{product.published ? "Published" : "Draft"}</span>
													<Switch
														checked={product.published}
														disabled={setProductStatus.isPending}
														onCheckedChange={(checked) => setProductStatus.mutate({ componentUid: product.sourceComponentUid, online: checked })}
														aria-label={`${product.title} published`}
													/>
												</div>
											</article>
										);
									})}
								</div>
							) : (
								<div className="rounded-lg border border-dashed p-12 text-center">
									<Icons.Search className="mx-auto size-6 text-muted-foreground" />
									<p className="mt-3 font-medium">No products found</p>
									<p className="mt-1 text-sm text-muted-foreground">Try another search or assign products from the source catalog.</p>
									<Button className="mt-4" variant="outline" asChild><a href="/storefront/catalog">Open source catalog</a></Button>
								</div>
							)}
						</>
					) : (
						<div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">No storefront categories yet.</div>
					)}
				</div>
			</div>
			<StorefrontCatalogItemSheet />
		</section>
	);
}

function ProductGridSkeleton() {
	const placeholders = ["one", "two", "three", "four", "five", "six"];
	return (
		<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{placeholders.map((placeholder) => (
				<div key={placeholder} className="overflow-hidden rounded-lg border">
					<div className="aspect-[4/3] animate-pulse bg-muted" />
					<div className="space-y-2 p-4"><div className="h-4 w-2/3 animate-pulse rounded bg-muted" /><div className="h-3 w-1/2 animate-pulse rounded bg-muted" /></div>
				</div>
			))}
		</div>
	);
}

function showError(error: Error) {
	toast({ title: "Unable to update storefront", description: error.message, variant: "destructive" });
}
