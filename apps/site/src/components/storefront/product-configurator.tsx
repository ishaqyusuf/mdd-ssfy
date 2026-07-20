"use client";

import { useTRPC } from "@/trpc/client";
import type { StorefrontRouterOutputs } from "@gnd/api/trpc/routers/storefront-app";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { QuantityInput } from "@gnd/ui/quantity-input";
import { toast } from "@gnd/ui/use-toast";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Offer = StorefrontRouterOutputs["storefrontCommerce"]["catalog"]["offer"];
type Step = Offer["configuration"]["steps"][number];

function initialSelections(steps: Step[]) {
	return Object.fromEntries(
		steps.flatMap((step) =>
			step.selectedComponentUid
				? [[step.stepUid, step.selectedComponentUid]]
				: [],
		),
	);
}

export function ProductConfigurator({ slug }: { slug: string }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { data: offer } = useSuspenseQuery(
		trpc.storefrontCommerce.catalog.offer.queryOptions({ slug }),
	);
	const [lineUid] = useState(
		() => `storefront-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
	);
	const [quantity, setQuantity] = useState(1);
	const [selections, setSelections] = useState<Record<string, string>>(() =>
		initialSelections(offer.configuration.steps),
	);
	const [resolvedSteps, setResolvedSteps] = useState(offer.configuration.steps);
	const [doorRows, setDoorRows] = useState<
		Array<{
			stepProductId: number;
			dimension: string;
			lhQty: number;
			rhQty: number;
			totalQty: number;
		}>
	>([]);
	const doorQuantity = doorRows.reduce((total, row) => total + row.totalQty, 0);
	const effectiveQuantity = doorQuantity > 0 ? doorQuantity : quantity;

	const configuration = useMemo(
		() => ({
			uid: lineUid,
			title: offer.title,
			description: offer.description,
			qty: effectiveQuantity,
			unitPrice: 0,
			lineTotal: 0,
			taxxable: true,
			meta: {},
			formSteps: offer.configuration.steps.flatMap((step) => {
				const selectedUid = selections[step.stepUid];
				const selected = step.components.find(
					(component) => component.uid === selectedUid,
				);
				return selected
					? [
							{
								stepId: step.stepId,
								componentId: selected.id,
								prodUid: selected.uid,
								value: selected.title,
								qty: effectiveQuantity,
								price: 0,
								basePrice: 0,
								meta: { selectedProdUids: [selected.uid] },
								step: {
									id: step.stepId,
									uid: step.stepUid,
									title: step.title,
								},
							},
						]
					: [];
			}),
			shelfItems: [],
			housePackageTool: doorRows.length
				? {
						id: null,
						totalDoors: doorQuantity,
						totalPrice: 0,
						doors: doorRows,
						meta: {},
					}
				: null,
		}),
		[lineUid, offer, effectiveQuantity, selections, doorRows, doorQuantity],
	);
	const request = useMemo(
		() => ({ offerId: offer.id, quantity: effectiveQuantity, configuration }),
		[configuration, effectiveQuantity, offer.id],
	);
	const canonicalComplete = offer.configuration.steps.every(
		(step) =>
			!step.required || step.allowSkip || Boolean(selections[step.stepUid]),
	);

	const preview = useMutation(
		trpc.storefrontCommerce.configuration.preview.mutationOptions({
			onSuccess: (data) => {
				setResolvedSteps(data.steps);
				setSelections((current) => {
					const next = { ...current };
					let changed = false;
					for (const step of data.steps) {
						if (
							next[step.stepUid] &&
							!step.components.some(
								(component) => component.uid === next[step.stepUid],
							)
						) {
							if (step.selectedComponentUid) {
								next[step.stepUid] = step.selectedComponentUid;
							} else {
								delete next[step.stepUid];
							}
							changed = true;
						}
					}
					return changed ? next : current;
				});
			},
		}),
	);
	const doorSchedule = preview.data?.workflow.doorSchedule || null;
	const isComplete =
		offer.availability.purchasable &&
		canonicalComplete &&
		(!doorSchedule?.required || doorQuantity > 0);
	const previewConfiguration = preview.mutate;
	const addToCart = useMutation(
		trpc.storefrontCommerce.cart.add.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: trpc.storefrontCommerce.cart.get.queryKey(),
				});
				toast({ title: "Added to cart", variant: "success" });
			},
			onError: (error) =>
				toast({ title: error.message, variant: "destructive" }),
		}),
	);
	const addToWishlist = useMutation(
		trpc.storefrontCommerce.wishlist.add.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: trpc.storefrontCommerce.wishlist.get.queryKey(),
				});
				toast({ title: "Saved to wishlist", variant: "success" });
			},
			onError: (error) =>
				toast({ title: error.message, variant: "destructive" }),
		}),
	);

	useEffect(() => {
		if (!canonicalComplete || !offer.availability.purchasable) return;
		const timer = setTimeout(() => previewConfiguration(request), 250);
		return () => clearTimeout(timer);
	}, [
		canonicalComplete,
		offer.availability.purchasable,
		previewConfiguration,
		request,
	]);

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
				<Link
					href={`/categories/${offer.category.slug}`}
					className="hover:text-foreground"
				>
					{offer.category.title}
				</Link>
				<span className="mx-2">/</span>
				<span className="text-foreground">{offer.title}</span>
			</nav>

			<div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.8fr)]">
				<div>
					<div className="aspect-square overflow-hidden rounded-xl border bg-muted">
						{offer.imageUrl ? (
							<img
								src={offer.imageUrl}
								alt={offer.title}
								className="size-full object-contain"
							/>
						) : (
							<div className="flex size-full items-center justify-center text-muted-foreground">
								Product image coming soon
							</div>
						)}
					</div>
					{offer.description && (
						<div className="prose mt-8 max-w-none">
							<h2>Product details</h2>
							<p>{offer.description}</p>
						</div>
					)}
				</div>

				<div>
					<header className="mb-6">
						<p className="text-sm font-medium text-amber-800">
							{offer.category.title}
						</p>
						<h1 className="mt-1 text-3xl font-bold tracking-tight">
							{offer.title}
						</h1>
						<div className="mt-4 min-h-10">
							{preview.data ? (
								<p className="text-3xl font-bold">
									${preview.data.lineTotal.toFixed(2)}
								</p>
							) : (
								<p className="text-sm text-muted-foreground">
									Complete the available options to calculate your price.
								</p>
							)}
						</div>
						<p className="mt-3 text-sm text-muted-foreground">
							{offer.availability.message ||
								(offer.availability.mode === "IN_STOCK"
									? "Available from current inventory, subject to checkout validation."
									: offer.availability.mode === "BACKORDER"
										? "Available on backorder."
										: "Made to order.")}
							{offer.availability.leadTimeMinDays != null
								? ` Typical lead time: ${offer.availability.leadTimeMinDays}${
										offer.availability.leadTimeMaxDays != null &&
										offer.availability.leadTimeMaxDays !==
											offer.availability.leadTimeMinDays
											? `–${offer.availability.leadTimeMaxDays}`
											: ""
									} days.`
								: ""}
						</p>
						{!offer.availability.purchasable ? (
							<p className="mt-2 text-sm font-medium text-destructive">
								This product is currently available for browsing only.
							</p>
						) : null}
					</header>

					<Card>
						<CardHeader>
							<CardTitle>Configure your product</CardTitle>
						</CardHeader>
						<CardContent className="space-y-7">
							{resolvedSteps
								.filter((step) => step.visible)
								.map((step) => (
									<fieldset key={step.stepUid}>
										<legend className="font-medium">
											{step.title}
											{step.required && !step.allowSkip ? " *" : ""}
										</legend>
										{step.helpText && (
											<p className="mt-1 text-sm text-muted-foreground">
												{step.helpText}
											</p>
										)}
										<div className="mt-3 grid gap-2 sm:grid-cols-2">
											{step.allowSkip && (
												<Button
													type="button"
													variant={
														selections[step.stepUid] ? "outline" : "default"
													}
													onClick={() =>
														setSelections((current) => {
															const next = { ...current };
															delete next[step.stepUid];
															return next;
														})
													}
												>
													None
												</Button>
											)}
											{step.components.map((component) => {
												const selected =
													selections[step.stepUid] === component.uid;
												return (
													<Button
														key={component.uid}
														type="button"
														variant={selected ? "default" : "outline"}
														className="h-auto min-h-11 justify-start whitespace-normal text-left"
														aria-pressed={selected}
														onClick={() =>
															setSelections((current) => ({
																...current,
																[step.stepUid]: component.uid,
															}))
														}
													>
														{component.title}
													</Button>
												);
											})}
										</div>
									</fieldset>
								))}

							{doorSchedule ? (
								<fieldset>
									<legend className="font-medium">
										Door sizes and handing *
									</legend>
									<p className="mt-1 text-sm text-muted-foreground">
										Enter left-hand and right-hand quantities for each required
										size. These rows become the standard office door schedule.
									</p>
									<div className="mt-3 overflow-x-auto rounded-md border">
										<table className="w-full text-sm">
											<thead>
												<tr className="border-b bg-muted/40 text-left">
													<th className="px-3 py-2 font-medium">Door</th>
													<th className="px-3 py-2 font-medium">Size</th>
													<th className="w-24 px-3 py-2 font-medium">LH</th>
													<th className="w-24 px-3 py-2 font-medium">RH</th>
													<th className="px-3 py-2 text-right font-medium">
														Unit
													</th>
												</tr>
											</thead>
											<tbody>
												{doorSchedule.components.flatMap((component) =>
													component.sizes.map((size) => {
														const row = doorRows.find(
															(item) =>
																item.stepProductId ===
																	component.stepProductId &&
																item.dimension === size.dimension,
														);
														const setQty = (
															field: "lhQty" | "rhQty",
															value: number,
														) => {
															setDoorRows((current) => {
																const next = current.filter(
																	(item) =>
																		!(
																			item.stepProductId ===
																				component.stepProductId &&
																			item.dimension === size.dimension
																		),
																);
																const candidate = {
																	stepProductId: component.stepProductId,
																	dimension: size.dimension,
																	lhQty:
																		field === "lhQty"
																			? Math.max(0, value)
																			: row?.lhQty || 0,
																	rhQty:
																		field === "rhQty"
																			? Math.max(0, value)
																			: row?.rhQty || 0,
																	totalQty: 0,
																};
																candidate.totalQty =
																	candidate.lhQty + candidate.rhQty;
																return candidate.totalQty > 0
																	? [...next, candidate]
																	: next;
															});
														};
														return (
															<tr
																key={`${component.stepProductId}-${size.dimension}`}
																className="border-b last:border-0"
															>
																<td className="px-3 py-2">{component.title}</td>
																<td className="px-3 py-2">{size.dimension}</td>
																<td className="px-3 py-2">
																	<input
																		aria-label={`${size.dimension} left-hand quantity`}
																		type="number"
																		min={0}
																		value={row?.lhQty || 0}
																		className="h-9 w-20 rounded-md border bg-background px-2"
																		onChange={(event) =>
																			setQty(
																				"lhQty",
																				Number(event.target.value || 0),
																			)
																		}
																	/>
																</td>
																<td className="px-3 py-2">
																	<input
																		aria-label={`${size.dimension} right-hand quantity`}
																		type="number"
																		min={0}
																		value={row?.rhQty || 0}
																		className="h-9 w-20 rounded-md border bg-background px-2"
																		onChange={(event) =>
																			setQty(
																				"rhQty",
																				Number(event.target.value || 0),
																			)
																		}
																	/>
																</td>
																<td className="px-3 py-2 text-right">
																	$
																	{(
																		size.unitPrice +
																		doorSchedule.sharedDoorSurcharge
																	).toFixed(2)}
																</td>
															</tr>
														);
													}),
												)}
											</tbody>
										</table>
									</div>
									<p className="mt-2 text-sm">
										Total doors: <strong>{doorQuantity}</strong>
									</p>
								</fieldset>
							) : (
								<div>
									<p className="mb-2 font-medium">Quantity</p>
									<QuantityInput
										min={1}
										value={quantity}
										onChange={(value) => value > 0 && setQuantity(value)}
									/>
								</div>
							)}

							{preview.error && (
								<p role="alert" className="text-sm text-destructive">
									{preview.error.message}
								</p>
							)}

							<div className="flex gap-3">
								<Button
									type="button"
									className="flex-1 bg-amber-800 hover:bg-amber-900"
									disabled={
										!isComplete || addToCart.isPending || preview.isPending
									}
									onClick={() => addToCart.mutate(request)}
								>
									<Icons.ShoppingCart className="mr-2 size-4" />
									{addToCart.isPending ? "Adding…" : "Add to cart"}
								</Button>
								<Button
									type="button"
									variant="outline"
									size="icon"
									aria-label="Save to wishlist"
									disabled={!isComplete || addToWishlist.isPending}
									onClick={() => addToWishlist.mutate(request)}
								>
									<Icons.Heart className="size-4" />
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</main>
	);
}
