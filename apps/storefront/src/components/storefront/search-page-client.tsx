"use client";

import { useStorefrontSearchParams } from "@/hooks/use-storefront-search-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Input } from "@gnd/ui/input";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

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
						<Link key={offer.id} href={offer.href}>
							<Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
								<CardHeader className="p-0">
									<div className="aspect-[4/3] bg-muted">
										{offer.imageUrl && (
											<img
												src={offer.imageUrl}
												alt=""
												loading="lazy"
												className="size-full object-cover"
											/>
										)}
									</div>
								</CardHeader>
								<CardContent className="p-5">
									<p className="mb-1 text-xs font-medium uppercase tracking-wide text-amber-800">
										{offer.category.title}
									</p>
									<CardTitle className="text-lg">{offer.title}</CardTitle>
									{offer.description && (
										<p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
											{offer.description}
										</p>
									)}
								</CardContent>
							</Card>
						</Link>
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
