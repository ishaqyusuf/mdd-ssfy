"use client";

import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";

export function CategoryPageClient({ slug }: { slug: string }) {
	const trpc = useTRPC();
	const { data: category } = useSuspenseQuery(
		trpc.storefrontCommerce.catalog.category.queryOptions({ slug }),
	);

	return (
		<main className="container mx-auto px-4 py-10">
			<nav
				className="mb-6 text-sm text-muted-foreground"
				aria-label="Breadcrumb"
			>
				<Link href="/" className="hover:text-foreground">
					Home
				</Link>
				<span className="mx-2">/</span>
				<span className="text-foreground">{category.title}</span>
			</nav>

			<header className="mb-10 max-w-3xl">
				<h1 className="text-4xl font-bold tracking-tight">{category.title}</h1>
				{category.description && (
					<p className="mt-3 text-lg text-muted-foreground">
						{category.description}
					</p>
				)}
			</header>

			{category.offers.length ? (
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{category.offers.map((offer) => (
						<Link key={offer.id} href={offer.href}>
							<Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
								<CardHeader className="p-0">
									<div className="aspect-[4/3] bg-muted">
										{offer.imageUrl && (
											<img
												src={offer.imageUrl}
												alt=""
												className="size-full object-cover"
												loading="lazy"
											/>
										)}
									</div>
								</CardHeader>
								<CardContent className="p-5">
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
					<h2 className="font-medium">No products are published yet</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Please check back soon.
					</p>
				</div>
			)}
		</main>
	);
}
