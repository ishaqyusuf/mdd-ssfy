"use client";

import { useTRPC } from "@/trpc/client";
import type { StorefrontRouterOutputs } from "@gnd/api/trpc/routers/storefront-app";
import { deduplicateStorefrontOptions } from "@gnd/sales/storefront-configuration";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@gnd/ui/accordion";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { QuantityInput } from "@gnd/ui/quantity-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { toast } from "@gnd/ui/use-toast";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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

const addOnStepPattern = /casing|frame|hinge|jamb|mould|trim/i;

function StepOptions({
	step,
	selectedUid,
	showImages = false,
	hideLegend = false,
	onSelect,
}: {
	step: Step;
	selectedUid?: string;
	showImages?: boolean;
	hideLegend?: boolean;
	onSelect: (uid: string | null) => void;
}) {
	return (
		<fieldset className="space-y-2">
			{hideLegend ? null : (
				<legend className="text-sm font-medium text-gray-900">
					{step.title}
					{step.required && !step.allowSkip ? " *" : ""}
				</legend>
			)}
			{step.helpText ? (
				<p className="text-sm text-gray-600">{step.helpText}</p>
			) : null}
			<div
				className={
					showImages
						? "grid grid-cols-2 gap-3 sm:grid-cols-3"
						: "flex flex-wrap gap-2"
				}
			>
				{step.allowSkip ? (
					<Button
						type="button"
						size="sm"
						variant={selectedUid ? "outline" : "default"}
						className={showImages ? "h-full min-h-20" : undefined}
						onClick={() => onSelect(null)}
					>
						None
					</Button>
				) : null}
				{step.components.map((component) => {
					const selected = selectedUid === component.uid;
					return (
						<Button
							key={component.uid}
							type="button"
							size="sm"
							variant={selected ? "default" : "outline"}
							className={
								showImages
									? "h-auto min-h-28 flex-col overflow-hidden whitespace-normal p-0"
									: undefined
							}
							aria-pressed={selected}
							onClick={() => onSelect(component.uid)}
						>
							{showImages ? (
								<>
									<div className="flex h-20 w-full items-center justify-center bg-white">
										{component.img ? (
											<img
												src={component.img}
												alt=""
												className="size-full object-contain p-1"
											/>
										) : (
											<Icons.Image className="size-5 text-gray-400" />
										)}
									</div>
									<span className="w-full px-2 py-2 text-left">
										{component.title}
									</span>
								</>
							) : (
								component.title
							)}
						</Button>
					);
				})}
			</div>
		</fieldset>
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
	const [showComponentImages, setShowComponentImages] = useState(false);
	const [activeAddOnStep, setActiveAddOnStep] = useState("");
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
	const displaySteps = useMemo(
		() =>
			resolvedSteps.map((step) => ({
				...step,
				components: deduplicateStorefrontOptions(step.components),
			})),
		[resolvedSteps],
	);
	const selectableSteps = useMemo(
		() =>
			displaySteps.filter(
				(step) =>
					step.visible &&
					!(step.selectedComponentUid && step.components.length === 1),
			),
		[displaySteps],
	);
	const variantSteps = selectableSteps.filter(
		(step) => !addOnStepPattern.test(step.title),
	);
	const addOnSteps = selectableSteps.filter((step) =>
		addOnStepPattern.test(step.title),
	);

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
		preview.data?.complete === true &&
		(!doorSchedule?.required || doorQuantity > 0);
	const previewConfigurationRef = useRef(preview.mutate);
	previewConfigurationRef.current = preview.mutate;
	const previewRequestRef = useRef(request);
	previewRequestRef.current = request;
	const previewRequestKey = JSON.stringify(request);
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
		if (!offer.availability.purchasable || !previewRequestKey) return;
		const timer = setTimeout(
			() => previewConfigurationRef.current(previewRequestRef.current),
			250,
		);
		return () => clearTimeout(timer);
	}, [offer.availability.purchasable, previewRequestKey]);

	return (
		<main className="container mx-auto px-4 py-8">
			<nav
				className="mb-6 flex items-center gap-2 text-sm uppercase text-gray-600"
				aria-label="Breadcrumb"
			>
				<Link href="/" className="hover:text-gray-900">
					Home
				</Link>
				<span>/</span>
				<Link
					href={`/search?category=${offer.category.slug}`}
					className="hover:text-gray-900"
				>
					{offer.category.title}
				</Link>
				<span>/</span>
				<span className="text-gray-900">{offer.title}</span>
			</nav>

			<Button asChild variant="ghost" className="mb-6">
				<Link href={`/search?category=${offer.category.slug}`}>
					<Icons.ArrowLeft className="mr-2 size-4" />
					Back to Products
				</Link>
			</Button>

			<div className="mb-12 grid gap-12 lg:grid-cols-2">
				<section>
					<div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
						{offer.imageUrl ? (
							<img
								src={offer.imageUrl}
								alt={offer.title}
								className="size-full object-contain p-4"
							/>
						) : (
							<div className="flex size-full items-center justify-center text-gray-500">
								Product image coming soon
							</div>
						)}
					</div>
				</section>

				<section className="space-y-6">
					<header>
						<div className="mb-2 flex items-center justify-between">
							<Badge className="bg-amber-600 hover:bg-amber-600">
								{offer.category.title}
							</Badge>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label="Share product"
							>
								<Icons.Share2 className="size-4" />
							</Button>
						</div>
						<h1 className="mb-2 text-3xl font-bold text-gray-900">
							{offer.title}
						</h1>
						<div className="mb-4 flex items-center gap-4">
							<div className="flex" aria-label="Product rating">
								{[0, 1, 2, 3, 4].map((rating) => (
									<span key={rating} className="text-lg text-yellow-400">
										★
									</span>
								))}
							</div>
							<span className="text-sm text-gray-600">New product</span>
						</div>
						{offer.description ? (
							<p className="text-gray-700">{offer.description}</p>
						) : null}
					</header>

					<div className="space-y-4">
						{variantSteps.map((step) => (
							<StepOptions
								key={step.stepUid}
								step={step}
								selectedUid={selections[step.stepUid]}
								onSelect={(uid) =>
									setSelections((current) => {
										const next = { ...current };
										if (uid) next[step.stepUid] = uid;
										else delete next[step.stepUid];
										return next;
									})
								}
							/>
						))}

						<Tabs defaultValue="slab">
							<TabsList className="flex w-full">
								<TabsTrigger className="flex-1" value="slab">
									Door Slab Only
								</TabsTrigger>
								<TabsTrigger className="flex-1" value="door-component">
									Add Components
								</TabsTrigger>
							</TabsList>
							<TabsContent value="door-component" className="space-y-4 pt-2">
								<div className="flex justify-end">
									<div className="flex overflow-hidden rounded-md border">
										<Button
											type="button"
											variant={showComponentImages ? "default" : "ghost"}
											size="icon"
											aria-label="Show component images"
											onClick={() => setShowComponentImages(true)}
										>
											<Icons.Grid className="size-4" />
										</Button>
										<Button
											type="button"
											variant={!showComponentImages ? "default" : "ghost"}
											size="icon"
											aria-label="Show component list"
											onClick={() => setShowComponentImages(false)}
										>
											<Icons.List className="size-4" />
										</Button>
									</div>
								</div>
								<Accordion
									type="single"
									collapsible
									value={activeAddOnStep}
									onValueChange={setActiveAddOnStep}
								>
									{addOnSteps.map((step) => {
										const selected = step.components.find(
											(component) => component.uid === selections[step.stepUid],
										);
										return (
											<AccordionItem key={step.stepUid} value={step.stepUid}>
												<AccordionTrigger className="gap-4">
													<span className="flex flex-1 items-center gap-2 text-left">
														<span className="font-medium">
															{step.title}
															{step.required && !step.allowSkip ? ":" : ""}
														</span>
														<span className="text-sm font-normal text-muted-foreground">
															{selected?.title || "Click to select"}
														</span>
													</span>
												</AccordionTrigger>
												<AccordionContent>
													{activeAddOnStep === step.stepUid ? (
														<StepOptions
															step={step}
															selectedUid={selections[step.stepUid]}
															showImages={showComponentImages}
															hideLegend
															onSelect={(uid) =>
																setSelections((current) => {
																	const next = { ...current };
																	if (uid) next[step.stepUid] = uid;
																	else delete next[step.stepUid];
																	return next;
																})
															}
														/>
													) : null}
												</AccordionContent>
											</AccordionItem>
										);
									})}
								</Accordion>
							</TabsContent>
						</Tabs>

						{doorSchedule ? (
							<fieldset>
								<legend className="text-sm font-medium text-gray-900">
									Door sizes and handing *
								</legend>
								<p className="mt-1 text-sm text-gray-600">
									Enter left-hand and right-hand quantities for each required
									size.
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
															item.stepProductId === component.stepProductId &&
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
								<p className="mb-2 text-lg font-medium">Quantity:</p>
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

						<div className="flex items-center justify-between border-t pt-4">
							<div className="text-3xl font-bold text-gray-900">
								{preview.data?.complete
									? `$${preview.data.lineTotal.toFixed(2)}`
									: "Price pending"}
							</div>
							<div
								className={`text-sm font-medium ${
									offer.availability.purchasable
										? "text-green-600"
										: "text-red-600"
								}`}
							>
								{offer.availability.purchasable ? "Available" : "Unavailable"}
							</div>
						</div>

						<div className="flex gap-3">
							<Button
								type="button"
								className="flex-1 bg-amber-700 hover:bg-amber-800"
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
					</div>

					<div className="grid grid-cols-3 gap-4 border-t pt-6">
						<div className="text-center">
							<Icons.Truck className="mx-auto mb-2 size-6 text-amber-600" />
							<div className="text-sm font-medium">Free Delivery</div>
							<div className="text-xs text-gray-600">Within 50 miles</div>
						</div>
						<div className="text-center">
							<Icons.Shield className="mx-auto mb-2 size-6 text-amber-600" />
							<div className="text-sm font-medium">5 Year Warranty</div>
							<div className="text-xs text-gray-600">Full coverage</div>
						</div>
						<div className="text-center">
							<Icons.RotateCcw className="mx-auto mb-2 size-6 text-amber-600" />
							<div className="text-sm font-medium">30 Day Returns</div>
							<div className="text-xs text-gray-600">Easy returns</div>
						</div>
					</div>
				</section>
			</div>
		</main>
	);
}
