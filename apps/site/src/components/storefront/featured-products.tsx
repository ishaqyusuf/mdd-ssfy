"use client";

import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export function FeaturedProducts() {
	const trpc = useTRPC();
	const { data, isPending } = useQuery(
		trpc.storefrontCommerce.catalog.search.queryOptions({
			query: "",
			limit: 8,
		}),
	);

	if (isPending) {
		return (
			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{["one", "two", "three", "four"].map((key) => (
					<div
						key={key}
						className="aspect-[4/5] animate-pulse rounded-lg bg-muted"
					/>
				))}
			</div>
		);
	}

	if (!data?.items.length) {
		return (
			<p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
				Featured products will appear here when they are published.
			</p>
		);
	}

	return (
		<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
							<p className="text-xs font-medium text-amber-800">
								{offer.category.title}
							</p>
							<CardTitle className="mt-1 text-lg">{offer.title}</CardTitle>
						</CardContent>
					</Card>
				</Link>
			))}
		</div>
	);
}
