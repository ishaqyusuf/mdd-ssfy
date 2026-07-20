"use client";

import { Footer } from "@/components/footer";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

export function WishlistPageClient() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const wishlist = useQuery(
		trpc.storefrontCommerce.wishlist.get.queryOptions(),
	);
	const invalidate = () =>
		Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.storefrontCommerce.wishlist.get.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.storefrontCommerce.cart.get.queryKey(),
			}),
		]);
	const move = useMutation(
		trpc.storefrontCommerce.cart.addFromWishlist.mutationOptions({
			onSuccess: () => {
				void invalidate();
				toast({ title: "Added to cart", variant: "success" });
			},
			onError: (error) =>
				toast({ title: error.message, variant: "destructive" }),
		}),
	);
	const remove = useMutation(
		trpc.storefrontCommerce.wishlist.remove.mutationOptions({
			onSuccess: () => void invalidate(),
			onError: (error) =>
				toast({ title: error.message, variant: "destructive" }),
		}),
	);

	return (
		<div className="min-h-screen bg-background">
			<main className="container mx-auto px-4 py-10">
				<h1 className="text-3xl font-semibold tracking-tight">Wishlist</h1>
				<p className="mt-1 text-muted-foreground">
					Saved configurations stay connected to the current sales definitions.
				</p>
				{wishlist.isPending ? (
					<div className="mt-8 animate-pulse">Loading saved items…</div>
				) : !wishlist.data?.items.length ? (
					<Card className="mt-8">
						<CardContent className="py-14 text-center">
							<Icons.Heart className="mx-auto size-12 text-muted-foreground" />
							<h2 className="mt-4 text-xl font-semibold">Nothing saved yet</h2>
							<Button asChild className="mt-5">
								<Link href="/search">Browse products</Link>
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className="mt-8 grid gap-4 md:grid-cols-2">
						{wishlist.data.items.map((item) => (
							<Card key={item.id}>
								<CardContent className="flex gap-4 pt-6">
									<div className="size-24 shrink-0 overflow-hidden rounded-md bg-muted">
										{item.offer?.imageUrl ? (
											<img
												src={item.offer.imageUrl}
												alt=""
												loading="lazy"
												className="size-full object-cover"
											/>
										) : (
											<div className="flex size-full items-center justify-center">
												<Icons.Heart className="size-7 text-muted-foreground" />
											</div>
										)}
									</div>
									<div className="min-w-0 flex-1">
										<Link
											href={
												item.offer ? `/products/${item.offer.slug}` : "/search"
											}
											className="font-medium hover:text-amber-800"
										>
											{item.offer?.title || "Unavailable product"}
										</Link>
										<p className="mt-1 text-sm text-muted-foreground">
											{item.quantity} × ${item.unitPrice.toFixed(2)}
										</p>
										<div className="mt-4 flex gap-2">
											<Button
												size="sm"
												disabled={move.isPending}
												onClick={() => move.mutate({ lineId: item.id })}
											>
												Add to cart
											</Button>
											<Button
												size="sm"
												variant="ghost"
												disabled={remove.isPending}
												onClick={() => remove.mutate({ lineId: item.id })}
											>
												Remove
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</main>
			<Footer />
		</div>
	);
}
