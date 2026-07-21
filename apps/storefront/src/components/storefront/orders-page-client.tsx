"use client";

import { Footer } from "@/components/footer";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

type OrderStatus =
	| "all"
	| "processing"
	| "in-transit"
	| "delivered"
	| "cancelled";

export function OrdersPageClient({
	initialInput,
}: {
	initialInput: { query?: string; status: OrderStatus; limit: number };
}) {
	const trpc = useTRPC();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [query, setQuery] = useState(initialInput.query || "");
	const orders = useQuery(
		trpc.storefrontCommerce.orders.list.queryOptions(initialInput),
	);

	const updateUrl = (next: { query?: string; status?: OrderStatus }) => {
		const params = new URLSearchParams(searchParams.toString());
		const q = next.query ?? initialInput.query;
		const status = next.status ?? initialInput.status;
		if (q) params.set("q", q);
		else params.delete("q");
		if (status && status !== "all") params.set("status", status);
		else params.delete("status");
		router.replace(`${pathname}${params.size ? `?${params}` : ""}`);
	};

	const submitSearch = (event: FormEvent) => {
		event.preventDefault();
		updateUrl({ query: query.trim() });
	};

	return (
		<div className="min-h-screen bg-background">
			<main className="container mx-auto px-4 py-10">
				<nav className="mb-5 text-sm text-muted-foreground">
					<Link href="/">Home</Link>
					<span className="mx-2">/</span>
					<span className="text-foreground">My orders</span>
				</nav>
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="text-3xl font-semibold tracking-tight">My orders</h1>
						<p className="mt-1 text-muted-foreground">
							Quotes and orders connected to your GND customer account.
						</p>
					</div>
					<Button asChild>
						<Link href="/search">Browse products</Link>
					</Button>
				</div>

				<Card className="mt-8">
					<CardContent className="flex flex-col gap-3 pt-6 md:flex-row">
						<form className="flex flex-1 gap-2" onSubmit={submitSearch}>
							<Input
								aria-label="Search orders"
								placeholder="Order number or item"
								value={query}
								onChange={(event) => setQuery(event.target.value)}
							/>
							<Button type="submit" variant="outline">
								<Icons.Search className="mr-2 size-4" />
								Search
							</Button>
						</form>
						<select
							aria-label="Order status"
							className="h-10 rounded-md border bg-background px-3 text-sm"
							value={initialInput.status}
							onChange={(event) =>
								updateUrl({ status: event.target.value as OrderStatus })
							}
						>
							<option value="all">All statuses</option>
							<option value="processing">Processing</option>
							<option value="in-transit">In transit</option>
							<option value="delivered">Delivered</option>
							<option value="cancelled">Cancelled</option>
						</select>
					</CardContent>
				</Card>

				{orders.isPending ? (
					<div className="mt-6 animate-pulse space-y-4">
						<div className="h-40 rounded bg-muted" />
						<div className="h-40 rounded bg-muted" />
					</div>
				) : orders.error ? (
					<Card className="mt-6">
						<CardContent className="py-12 text-center">
							<h2 className="text-lg font-semibold">Orders unavailable</h2>
							<p className="mt-2 text-sm text-muted-foreground">
								{orders.error.message}
							</p>
							<Button asChild className="mt-4">
								<Link href="/login?callbackUrl=/orders">Sign in</Link>
							</Button>
						</CardContent>
					</Card>
				) : !orders.data.items.length ? (
					<Card className="mt-6">
						<CardContent className="py-14 text-center">
							<Icons.Package className="mx-auto size-12 text-muted-foreground" />
							<h2 className="mt-4 text-xl font-semibold">No orders found</h2>
							<p className="mt-2 text-muted-foreground">
								Your completed storefront orders will appear here.
							</p>
						</CardContent>
					</Card>
				) : (
					<div className="mt-6 space-y-4">
						{orders.data.items.map((order) => (
							<Card key={order.id}>
								<CardHeader className="flex-row items-start justify-between gap-4">
									<div>
										<CardTitle className="text-lg">
											Order {order.orderId}
										</CardTitle>
										<p className="mt-1 text-sm text-muted-foreground">
											{order.createdAt
												? new Date(order.createdAt).toLocaleDateString()
												: "Date unavailable"}
											{" · "}
											{order.itemCount} configured item
											{order.itemCount === 1 ? "" : "s"}
										</p>
									</div>
									<div className="text-right">
										<Badge variant="secondary">{order.statusLabel}</Badge>
										<p className="mt-2 font-semibold">
											${order.grandTotal.toFixed(2)}
										</p>
									</div>
								</CardHeader>
								<CardContent>
									<ul className="space-y-1 text-sm text-muted-foreground">
										{order.items.slice(0, 3).map((item) => (
											<li key={item.id}>
												{item.quantity} × {item.description}
											</li>
										))}
									</ul>
									<div className="mt-5 flex items-center justify-between border-t pt-4">
										<span className="text-sm text-muted-foreground">
											Amount due: ${order.amountDue.toFixed(2)}
										</span>
										<Button asChild variant="outline" size="sm">
											<Link
												href={`/orders/${encodeURIComponent(order.orderId)}`}
											>
												View order
											</Link>
										</Button>
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
