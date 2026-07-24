"use client";

import { useStorefrontSearchParams } from "@/hooks/use-storefront-search-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { StorefrontOfferCard } from "./storefront-offer-card";

export function StorefrontSearchPageClient() {
	const trpc = useTRPC();
	const { filter, setFilter, hasFilters } = useStorefrontSearchParams();
	const [input, setInput] = useState(filter.q);
	const { data: categories } = useSuspenseQuery(
		trpc.storefrontCommerce.catalog.categories.queryOptions(),
	);
	const { data } = useSuspenseQuery(
		trpc.storefrontCommerce.catalog.search.queryOptions({
			query: filter.q,
			categorySlug: filter.category ?? undefined,
			limit: 48,
		}),
	);

	useEffect(() => setInput(filter.q), [filter.q]);

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
				<select
					value={filter.category ?? ""}
					onChange={(event) =>
						void setFilter({ category: event.target.value || null })
					}
					className="h-10 rounded-md border bg-background px-3 text-sm"
					aria-label="Filter by category"
				>
					<option value="">All categories</option>
					{categories.map((category) => (
						<option key={category.id} value={category.slug}>
							{category.title}
						</option>
					))}
				</select>
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

			<p className="mb-5 text-sm text-muted-foreground">
				{data.count} {data.count === 1 ? "product" : "products"}
			</p>

			{data.items.length ? (
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{data.items.map((offer) => (
						<StorefrontOfferCard key={offer.id} offer={offer} showDescription />
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
		</main>
	);
}
