"use client";

import { Footer } from "@/components/footer";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";

export function OrderDetailClient({ orderId }: { orderId: string }) {
	const trpc = useTRPC();
	const order = useQuery(
		trpc.storefrontCommerce.orders.detail.queryOptions({ orderId }),
	);
	const invoice = useMutation(
		trpc.storefrontCommerce.orders.invoice.mutationOptions({
			onSuccess: (result) => {
				window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
			},
		}),
	);

	if (order.isPending) {
		return (
			<main className="container mx-auto min-h-[60vh] animate-pulse px-4 py-10">
				Loading order…
			</main>
		);
	}
	if (order.error || !order.data) {
		return (
			<main className="container mx-auto min-h-[60vh] px-4 py-16 text-center">
				<Icons.Package className="mx-auto size-12 text-muted-foreground" />
				<h1 className="mt-4 text-2xl font-semibold">Order unavailable</h1>
				<p className="mt-2 text-muted-foreground">
					{order.error?.message ||
						"This order does not exist or is not connected to your account."}
				</p>
				<Button asChild className="mt-5">
					<Link href="/orders">Back to orders</Link>
				</Button>
			</main>
		);
	}

	const data = order.data;
	const delivery =
		data.extraCosts
			.filter((cost) => cost.type === "Delivery")
			.reduce((sum, cost) => sum + cost.total, 0) || 0;

	return (
		<div className="min-h-screen bg-background">
			<main className="container mx-auto px-4 py-10">
				<nav className="mb-6 text-sm text-muted-foreground">
					<Link href="/orders">Orders</Link>
					<span className="mx-2">/</span>
					<span className="text-foreground">{data.orderId}</span>
				</nav>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="text-3xl font-semibold tracking-tight">
							Order {data.orderId}
						</h1>
						<p className="mt-1 text-muted-foreground">
							Placed{" "}
							{data.createdAt
								? new Date(data.createdAt).toLocaleDateString()
								: "date unavailable"}
						</p>
					</div>
					<div className="text-right">
						<Badge variant="secondary">{data.statusLabel}</Badge>
						<p className="mt-2 text-2xl font-semibold">
							${data.grandTotal.toFixed(2)}
						</p>
						{data.checkout?.status === "PAID" ? (
							<Badge className="mt-3" variant="outline">
								Payment received
							</Badge>
						) : data.checkout?.paymentUrl ? (
							<Button asChild className="mt-3">
								<a href={data.checkout.paymentUrl}>Pay now</a>
							</Button>
						) : data.checkout?.status === "ORDER_CREATED" ? (
							<p className="mt-3 text-sm text-muted-foreground">
								{data.checkout.shippingQuote &&
								!["AUTO_APPROVED", "APPROVED", "OVERRIDDEN"].includes(
									data.checkout.shippingQuote.status,
								)
									? `Delivery estimate $${data.checkout.shippingQuote.calculatedAmount.toFixed(2)} is awaiting office review`
									: "Awaiting final sales review"}
							</p>
						) : null}
					</div>
				</div>

				<div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Configured items</CardTitle>
							</CardHeader>
							<CardContent className="space-y-5">
								{data.items.map((item) => (
									<article
										key={item.id}
										className="border-b pb-5 last:border-0 last:pb-0"
									>
										<div className="flex justify-between gap-4">
											<div>
												<h2 className="font-medium">{item.description}</h2>
												<p className="text-sm text-muted-foreground">
													Quantity {item.quantity}
												</p>
											</div>
											<span className="font-medium">
												${item.total.toFixed(2)}
											</span>
										</div>
										{!!item.selections.length && (
											<dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
												{item.selections.map((selection, index) => (
													<div
														key={`${selection.stepUid}-${index}`}
														className="flex justify-between gap-3"
													>
														<dt className="text-muted-foreground">
															{selection.step}
														</dt>
														<dd className="text-right">{selection.value}</dd>
													</div>
												))}
											</dl>
										)}
										{!!item.doors.length && (
											<div className="mt-4 rounded-md bg-muted/50 p-3 text-sm">
												<p className="mb-2 font-medium">Door schedule</p>
												{item.doors.map((door) => (
													<p key={door.id}>
														{door.dimension} {door.swing || ""} —{" "}
														{door.totalQty} total
														{door.lhQty || door.rhQty
															? ` (${door.lhQty} LH / ${door.rhQty} RH)`
															: ""}
													</p>
												))}
											</div>
										)}
									</article>
								))}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Order progress</CardTitle>
							</CardHeader>
							<CardContent>
								<ol className="space-y-5">
									{data.timeline.map((event) => (
										<li key={event.key} className="flex gap-3">
											<span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100">
												<Icons.Check className="size-4 text-amber-900" />
											</span>
											<div>
												<p className="font-medium">{event.title}</p>
												<p className="text-sm text-muted-foreground">
													{event.description}
												</p>
												<time className="text-xs text-muted-foreground">
													{event.at ? new Date(event.at).toLocaleString() : ""}
												</time>
											</div>
										</li>
									))}
								</ol>
							</CardContent>
						</Card>
					</div>

					<aside className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Order summary</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 text-sm">
								<SummaryRow label="Subtotal" value={data.subTotal} />
								<SummaryRow label="Delivery" value={delivery} />
								<SummaryRow label="Tax" value={data.tax} />
								<div className="flex justify-between border-t pt-3 text-base font-semibold">
									<span>Total</span>
									<span>${data.grandTotal.toFixed(2)}</span>
								</div>
								<div className="flex justify-between text-muted-foreground">
									<span>Amount due</span>
									<span>${data.amountDue.toFixed(2)}</span>
								</div>
							</CardContent>
						</Card>

						{data.shippingAddress && (
							<AddressCard
								title={
									data.deliveryOption === "pickup"
										? "Customer address"
										: "Delivery address"
								}
								address={data.shippingAddress}
							/>
						)}

						<Card>
							<CardContent className="pt-6">
								{invoice.error && (
									<p className="mb-3 text-sm text-destructive">
										{invoice.error.message}
									</p>
								)}
								<Button
									className="w-full"
									variant="outline"
									disabled={invoice.isPending}
									onClick={() => invoice.mutate({ orderId })}
								>
									<Icons.Download className="mr-2 size-4" />
									{invoice.isPending
										? "Preparing invoice…"
										: "Download invoice"}
								</Button>
							</CardContent>
						</Card>
					</aside>
				</div>
			</main>
			<Footer />
		</div>
	);
}

function SummaryRow({ label, value }: { label: string; value: number }) {
	return (
		<div className="flex justify-between">
			<span className="text-muted-foreground">{label}</span>
			<span>${value.toFixed(2)}</span>
		</div>
	);
}

function AddressCard({
	title,
	address,
}: {
	title: string;
	address: {
		name: string | null;
		address1: string | null;
		address2: string | null;
		city: string | null;
		state: string | null;
		postalCode: string;
		country: string | null;
		phone: string | null;
	};
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent className="text-sm text-muted-foreground">
				<p className="font-medium text-foreground">{address.name}</p>
				<p>{address.address1}</p>
				{address.address2 && <p>{address.address2}</p>}
				<p>
					{[address.city, address.state, address.postalCode]
						.filter(Boolean)
						.join(", ")}
				</p>
				<p>{address.country}</p>
				{address.phone && <p className="mt-2">{address.phone}</p>}
			</CardContent>
		</Card>
	);
}
