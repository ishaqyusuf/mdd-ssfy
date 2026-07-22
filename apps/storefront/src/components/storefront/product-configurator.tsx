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
type DoorSchedule =
	StorefrontRouterOutputs["storefrontCommerce"]["configuration"]["preview"]["workflow"]["doorSchedule"];

function formatMoney(value: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value);
}

function initialSelections(steps: Step[]) {
	return Object.fromEntries(
		steps.flatMap((step) =>
			step.selectedComponentUid
				? [[step.stepUid, step.selectedComponentUid]]
				: [],
		),
	);
}

function ProductGallery({ offer }: { offer: Offer }) {
	const images = offer.images.length
		? offer.images
		: offer.imageUrl
			? [offer.imageUrl]
			: [];
	const firstImage = images[0] || "";
	const [selectedImage, setSelectedImage] = useState(firstImage);

	useEffect(() => {
		setSelectedImage(firstImage);
	}, [firstImage]);

	return (
		<section aria-label={`${offer.title} images`}>
			<div className="relative aspect-square overflow-hidden rounded-md bg-gray-100">
				{selectedImage ? (
					<img
						src={selectedImage}
						alt={offer.title}
						className="size-full object-contain p-4"
					/>
				) : (
					<div className="flex size-full items-center justify-center text-gray-500">
						Product image coming soon
					</div>
				)}
			</div>
			{images.length > 1 ? (
				<div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
					{images.map((image, index) => (
						<button
							type="button"
							key={image}
							aria-label={`View product image ${index + 1}`}
							aria-pressed={selectedImage === image}
							onClick={() => setSelectedImage(image)}
							className={`aspect-square overflow-hidden rounded-sm border bg-white p-1 transition-colors ${
								selectedImage === image
									? "border-amber-700 ring-1 ring-amber-700"
									: "border-gray-200 hover:border-gray-400"
							}`}
						>
							<img src={image} alt="" className="size-full object-contain" />
						</button>
					))}
				</div>
			) : null}
		</section>
	);
}

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
						className={showImages ? "h-full min-h-28" : undefined}
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
									? "h-auto min-h-32 flex-col overflow-hidden whitespace-normal p-0"
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
									<span className="w-full px-2 pt-2 text-left">
										{component.title}
									</span>
									{component.price != null ? (
										<span className="w-full px-2 pb-2 text-left text-xs font-normal opacity-80">
											{formatMoney(component.price)}
										</span>
									) : null}
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
	const [doorSchedule, setDoorSchedule] = useState<DoorSchedule>(null);
	const [selectedDoorSize, setSelectedDoorSize] = useState<{
		stepProductId: number;
		dimension: string;
	} | null>(null);
	const [handing, setHanding] = useState<"LH" | "RH" | null>(null);
	const [activeAddOnStep, setActiveAddOnStep] = useState("");
	const [resolvedPreviewRequestKey, setResolvedPreviewRequestKey] =
		useState("");

	const displaySteps = useMemo(
		() =>
			resolvedSteps.map((step) => ({
				...step,
				components: deduplicateStorefrontOptions(step.components),
			})),
		[resolvedSteps],
	);
	const rootStep = displaySteps.find((step) => step.role === "ROOT");
	const productStepIndex = displaySteps.findIndex(
		(step) => step.role === "PRODUCT",
	);
	const identitySteps = displaySteps.filter(
		(step) => step.role === "IDENTITY" && step.selectedComponentUid,
	);
	const selectableOptionSteps = displaySteps.filter(
		(step) =>
			step.role === "OPTION" &&
			step.visible &&
			!(step.selectedComponentUid && step.components.length === 1),
	);
	const primaryOptionSteps = selectableOptionSteps.filter(
		(step) =>
			productStepIndex < 0 ||
			displaySteps.findIndex(
				(candidate) => candidate.stepUid === step.stepUid,
			) < productStepIndex,
	);
	const addOnSteps = selectableOptionSteps.filter(
		(step) =>
			productStepIndex >= 0 &&
			displaySteps.findIndex(
				(candidate) => candidate.stepUid === step.stepUid,
			) > productStepIndex,
	);

	const doorRows = useMemo(() => {
		if (!selectedDoorSize || (!doorSchedule?.noHandle && !handing)) return [];
		return [
			{
				stepProductId: selectedDoorSize.stepProductId,
				dimension: selectedDoorSize.dimension,
				lhQty: handing === "LH" ? quantity : 0,
				rhQty: handing === "RH" ? quantity : 0,
				totalQty: quantity,
			},
		];
	}, [doorSchedule?.noHandle, handing, quantity, selectedDoorSize]);

	function selectStep(step: Step, uid: string | null) {
		if (step.role === "ROOT") {
			setSelections(uid ? { [step.stepUid]: uid } : {});
			setDoorSchedule(null);
			setSelectedDoorSize(null);
			setHanding(null);
			return;
		}
		setSelections((current) => {
			const next = { ...current };
			if (uid) next[step.stepUid] = uid;
			else delete next[step.stepUid];
			return next;
		});
	}

	const configuration = useMemo(
		() => ({
			uid: lineUid,
			title: offer.title,
			description: offer.description,
			qty: quantity,
			unitPrice: 0,
			lineTotal: 0,
			taxxable: true,
			meta: {},
			formSteps: displaySteps.flatMap((step) => {
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
								qty: quantity,
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
						totalDoors: quantity,
						totalPrice: 0,
						doors: doorRows,
						meta: {},
					}
				: null,
		}),
		[displaySteps, doorRows, lineUid, offer, quantity, selections],
	);
	const request = useMemo(
		() => ({ offerId: offer.id, quantity, configuration }),
		[configuration, offer.id, quantity],
	);
	const previewRequestKey = JSON.stringify(request);
	const preview = useMutation(
		trpc.storefrontCommerce.configuration.preview.mutationOptions({
			onSuccess: (data, variables) => {
				setResolvedPreviewRequestKey(JSON.stringify(variables));
				setResolvedSteps(data.steps);
				setDoorSchedule(data.workflow.doorSchedule);
				setSelectedDoorSize((current) => {
					if (!current || !data.workflow.doorSchedule) return current;
					const matchingComponent = data.workflow.doorSchedule.components.find(
						(component) =>
							component.sizes.some(
								(size) => size.dimension === current.dimension,
							),
					);
					return matchingComponent
						? {
								stepProductId: matchingComponent.stepProductId,
								dimension: current.dimension,
							}
						: null;
				});
				setSelections((current) => {
					const next = { ...current };
					let changed = false;
					const availableStepUids = new Set(
						data.steps.map((step) => step.stepUid),
					);
					for (const stepUid of Object.keys(next)) {
						if (!availableStepUids.has(stepUid)) {
							delete next[stepUid];
							changed = true;
						}
					}
					for (const step of data.steps) {
						const selectedUid = next[step.stepUid];
						const selectedIsAvailable = step.components.some(
							(component) => component.uid === selectedUid,
						);
						if (!selectedIsAvailable && step.selectedComponentUid) {
							next[step.stepUid] = step.selectedComponentUid;
							changed = true;
						} else if (selectedUid && !selectedIsAvailable) {
							delete next[step.stepUid];
							changed = true;
						}
					}
					return changed ? next : current;
				});
			},
		}),
	);
	const hasDoorSizes =
		doorSchedule?.components.some((component) => component.sizes.length > 0) ??
		false;
	const doorReady =
		!doorSchedule?.required ||
		(hasDoorSizes &&
			Boolean(selectedDoorSize) &&
			(doorSchedule.noHandle || Boolean(handing)));
	const configurationPurchasable =
		offer.availability.purchasable && (!doorSchedule?.required || hasDoorSizes);
	const previewIsCurrent = resolvedPreviewRequestKey === previewRequestKey;
	const isComplete =
		configurationPurchasable &&
		previewIsCurrent &&
		!preview.isPending &&
		!preview.isError &&
		preview.data?.complete === true &&
		doorReady;
	const selectedDoorPrice = useMemo(() => {
		if (!doorSchedule || !selectedDoorSize) return null;
		for (const component of doorSchedule.components) {
			if (component.stepProductId !== selectedDoorSize.stepProductId) continue;
			const size = component.sizes.find(
				(candidate) => candidate.dimension === selectedDoorSize.dimension,
			);
			if (size) return size.unitPrice + doorSchedule.sharedDoorSurcharge;
		}
		return null;
	}, [doorSchedule, selectedDoorSize]);
	const previewConfigurationRef = useRef(preview.mutate);
	previewConfigurationRef.current = preview.mutate;
	const previewRequestRef = useRef(request);
	previewRequestRef.current = request;
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
				<ProductGallery offer={offer} />

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
						{offer.description ? (
							<p className="text-gray-700">{offer.description}</p>
						) : null}
						<div className="mt-3 flex flex-wrap gap-2">
							{rootStep?.components.length === 1 ? (
								<Badge variant="secondary">
									{rootStep.components[0]?.title}
								</Badge>
							) : null}
							{identitySteps.map((step) => {
								const selected = step.components.find(
									(component) => component.uid === step.selectedComponentUid,
								);
								return selected ? (
									<Badge key={step.stepUid} variant="secondary">
										{selected.title}
									</Badge>
								) : null;
							})}
						</div>
					</header>

					<div className="space-y-5">
						{rootStep && rootStep.components.length > 1 ? (
							<StepOptions
								step={rootStep}
								selectedUid={selections[rootStep.stepUid]}
								onSelect={(uid) => selectStep(rootStep, uid)}
							/>
						) : null}

						{preview.data ? (
							primaryOptionSteps.map((step) => (
								<StepOptions
									key={step.stepUid}
									step={step}
									selectedUid={selections[step.stepUid]}
									onSelect={(uid) => selectStep(step, uid)}
								/>
							))
						) : (
							<div className="h-20 animate-pulse rounded-md bg-gray-100" />
						)}

						{doorSchedule ? (
							<div className="space-y-4 border-t pt-5">
								<fieldset className="space-y-2">
									<legend className="text-sm font-medium text-gray-900">
										Size *
									</legend>
									{hasDoorSizes ? (
										<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
											{doorSchedule.components.flatMap((component) =>
												component.sizes.map((size) => {
													const selected =
														selectedDoorSize?.stepProductId ===
															component.stepProductId &&
														selectedDoorSize.dimension === size.dimension;
													return (
														<Button
															key={`${component.stepProductId}-${size.dimension}`}
															type="button"
															variant={selected ? "default" : "outline"}
															className="h-auto min-h-14 flex-col items-start whitespace-normal px-3 py-2"
															aria-pressed={selected}
															onClick={() =>
																setSelectedDoorSize({
																	stepProductId: component.stepProductId,
																	dimension: size.dimension,
																})
															}
														>
															<span>{size.dimension}</span>
															<span className="text-xs font-normal opacity-80">
																{formatMoney(
																	size.unitPrice +
																		doorSchedule.sharedDoorSurcharge,
																)}
															</span>
														</Button>
													);
												}),
											)}
										</div>
									) : (
										<output className="text-sm text-muted-foreground">
											Sizes are not available for this product.
										</output>
									)}
								</fieldset>

								{doorSchedule.noHandle || !hasDoorSizes ? null : (
									<fieldset className="space-y-2">
										<legend className="text-sm font-medium text-gray-900">
											Handing *
										</legend>
										<div className="flex gap-2">
											{(["LH", "RH"] as const).map((value) => (
												<Button
													key={value}
													type="button"
													variant={handing === value ? "default" : "outline"}
													aria-pressed={handing === value}
													onClick={() => setHanding(value)}
												>
													{value === "LH" ? "Left hand" : "Right hand"}
												</Button>
											))}
										</div>
									</fieldset>
								)}
							</div>
						) : null}

						<div>
							<p className="mb-2 text-sm font-medium text-gray-900">Quantity</p>
							<QuantityInput
								min={1}
								value={quantity}
								onChange={(value) => value > 0 && setQuantity(value)}
							/>
						</div>

						{addOnSteps.length ? (
							<Accordion
								type="single"
								collapsible
								value={activeAddOnStep}
								onValueChange={setActiveAddOnStep}
								className="border-y"
							>
								{addOnSteps.map((step) => {
									const selected = step.components.find(
										(component) => component.uid === selections[step.stepUid],
									);
									return (
										<AccordionItem key={step.stepUid} value={step.stepUid}>
											<AccordionTrigger className="gap-4">
												<span className="flex flex-1 items-center gap-2 text-left">
													<span className="font-medium">{step.title}</span>
													<span className="text-sm font-normal text-muted-foreground">
														{selected?.title || "Choose component"}
													</span>
												</span>
											</AccordionTrigger>
											<AccordionContent>
												{activeAddOnStep === step.stepUid ? (
													<StepOptions
														step={step}
														selectedUid={selections[step.stepUid]}
														showImages
														hideLegend
														onSelect={(uid) => selectStep(step, uid)}
													/>
												) : null}
											</AccordionContent>
										</AccordionItem>
									);
								})}
							</Accordion>
						) : null}

						{preview.error ? (
							<p role="alert" className="text-sm text-destructive">
								{preview.error.message}
							</p>
						) : null}

						<div className="flex items-center justify-between border-t pt-4">
							<div className="text-3xl font-bold text-gray-900">
								{doorSchedule?.required
									? !hasDoorSizes
										? "Unavailable"
										: selectedDoorPrice != null
											? `${formatMoney(selectedDoorPrice * quantity)}`
											: "Select a size"
									: preview.data?.complete
										? formatMoney(preview.data.lineTotal)
										: "Price pending"}
							</div>
							<div
								className={`text-sm font-medium ${
									configurationPurchasable ? "text-green-600" : "text-red-600"
								}`}
							>
								{configurationPurchasable ? "Available" : "Unavailable"}
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
								{addToCart.isPending ? "Adding..." : "Add to cart"}
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
				</section>
			</div>
		</main>
	);
}
