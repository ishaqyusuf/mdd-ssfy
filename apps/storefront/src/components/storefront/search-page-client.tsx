"use client";

import { useStorefrontSearchParams } from "@/hooks/use-storefront-search-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StorefrontOfferCard } from "./storefront-offer-card";

export function StorefrontSearchPageClient() {
	const trpc = useTRPC();
	const { filter, setFilter, hasFilters } = useStorefrontSearchParams();
	const [input, setInput] = useState(filter.q);
	const { data: categories } = useSuspenseQuery(
		trpc.storefrontCommerce.catalog.categories.queryOptions(),
	);
	const activeCategory = categories.find(
		(category) => category.slug === filter.category,
	);
	const { data } = useSuspenseQuery(
		trpc.storefrontCommerce.catalog.search.queryOptions({
			query: filter.q,
			categorySlug: activeCategory?.slug,
			limit: 48,
		}),
	);

	useEffect(() => setInput(filter.q), [filter.q]);
	const returnTo = `/search?${new URLSearchParams({
		...(filter.q ? { q: filter.q } : {}),
		...(activeCategory ? { category: activeCategory.slug } : {}),
	}).toString()}`;

	return (
		<main className="container mx-auto px-4 py-10">
			<header className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight">Browse products</h1>
				<p className="mt-2 text-muted-foreground">
					Find published doors, mouldings, and shelf items.
				</p>
			</header>

			<form
				className="mb-8 flex flex-col gap-3 sm:flex-row"
				onSubmit={(event) => {
					event.preventDefault();
					void setFilter({ q: input || null });
				}}
			>
				<Input
					value={input}
					onChange={(event) => setInput(event.target.value)}
					placeholder="Search products"
					className="sm:max-w-md"
				/>
				<Button type="submit">Search</Button>
				{hasFilters && (
					<Button
						type="button"
						variant="ghost"
						onClick={() => {
							setInput("");
							void setFilter(null);
						}}
					>
						Clear
					</Button>
				)}
			</form>

			<details className="mb-5 rounded-lg border bg-background p-4 lg:hidden">
				<summary className="cursor-pointer font-medium">
					{activeCategory?.title || "All products"}
				</summary>
				<div className="mt-3">
					<CategoryList
						categories={categories}
						selected={activeCategory?.slug || null}
						onSelect={(category) => void setFilter({ category })}
					/>
				</div>
			</details>

			<div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
				<aside className="hidden self-start rounded-lg border bg-background p-4 lg:sticky lg:top-24 lg:block">
					<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product categories</p>
					<CategoryList
						categories={categories}
						selected={activeCategory?.slug || null}
						onSelect={(category) => void setFilter({ category })}
					/>
				</aside>

				<section aria-label="Product results">
					<div className="mb-5 flex flex-wrap items-end justify-between gap-3">
						<div>
							<h2 className="text-xl font-semibold">{activeCategory?.title || "All products"}</h2>
							<p className="text-sm text-muted-foreground">{data.count} {data.count === 1 ? "product" : "products"}</p>
						</div>
						{activeCategory ? <Badge variant="secondary">Configuration selected</Badge> : null}
					</div>

					{data.items.length ? (
						<div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
							{data.items.map((offer) => (
								<StorefrontOfferCard
									key={offer.id}
									offer={offer}
									showDescription
									href={`${offer.href}?returnTo=${encodeURIComponent(returnTo)}`}
								/>
							))}
						</div>
					) : (
						<div className="rounded-lg border border-dashed p-12 text-center">
					<h2 className="font-medium">No matching products</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Try another search or clear the category filter.
					</p>
					{hasFilters && (
						<Button
							className="mt-4"
							variant="outline"
							onClick={() => {
								setInput("");
								void setFilter(null);
							}}
						>
							Clear filters
						</Button>
					)}
						</div>
					)}
				</section>
			</div>
		</main>
	);
}

function CategoryList({
	categories,
	selected,
	onSelect,
}: {
	categories: Array<{ id: string; slug: string; title: string; offerCount: number }>;
	selected: string | null;
	onSelect: (category: string | null) => void;
}) {
	return (
		<nav aria-label="Product categories" className="space-y-1">
			<button type="button" onClick={() => onSelect(null)} className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${!selected ? "bg-amber-50 font-medium text-amber-950" : "text-muted-foreground hover:bg-muted"}`}>
				<span>All products</span>
				<span>{categories.reduce((total, category) => total + category.offerCount, 0)}</span>
			</button>
			{categories.map((category) => (
				<button key={category.id} type="button" onClick={() => onSelect(category.slug)} className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${selected === category.slug ? "bg-amber-50 font-medium text-amber-950" : "text-muted-foreground hover:bg-muted"}`}>
					<span>{category.title}</span>
					<span className="tabular-nums">{category.offerCount}</span>
				</button>
			))}
		</nav>
	);
}
