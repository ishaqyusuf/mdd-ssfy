"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Input } from "@gnd/ui/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@gnd/ui/sheet";
import { Switch } from "@gnd/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { FormEvent, useEffect, useState } from "react";
import { StorefrontInquiriesWorkspace } from "./storefront-inquiries-workspace";

const listInput = { limit: 25 } as const;
const storefrontDateFormatter = new Intl.DateTimeFormat("en-US", {
	timeZone: "America/New_York",
	dateStyle: "short",
	timeStyle: "medium",
});

function formatStorefrontDate(value: string | Date) {
	return storefrontDateFormatter.format(new Date(value));
}

export function StorefrontCartsPanel() {
	const trpc = useTRPC();
	const [cartId, setCartId] = useQueryState("cartId", parseAsString);
	const carts = useQuery(
		trpc.storefrontAdmin.operations.carts.queryOptions(listInput),
	);
	const detail = useQuery(
		trpc.storefrontAdmin.operations.cartDetail.queryOptions(
			{ id: cartId || "" },
			{ enabled: Boolean(cartId) },
		),
	);
	return (
		<Card>
			<CardHeader>
				<CardTitle>Carts and wishlists</CardTitle>
				<p className="text-sm text-muted-foreground">
					Active customer and guest collections. Prices remain server-owned.
				</p>
			</CardHeader>
			<CardContent>
				<OperationsTable
					loading={carts.isPending}
					error={carts.error?.message}
					headers={[
						"Customer",
						"Type",
						"Status",
						"Items",
						"Subtotal",
						"Updated",
						"",
					]}
					rows={(carts.data?.items || []).map((cart) => [
						cart.customer?.customer?.businessName ||
							cart.customer?.customer?.name ||
							cart.customer?.name ||
							(cart.guest ? "Guest" : "Customer"),
						cart.type === "CART" ? "Cart" : "Wishlist",
						<Badge variant="secondary" key="status">
							{cart.status}
						</Badge>,
						String(cart.itemCount),
						`$${cart.subtotal.toFixed(2)}`,
						formatStorefrontDate(cart.updatedAt),
						<Button
							key="action"
							size="sm"
							variant="outline"
							onClick={() => void setCartId(cart.id)}
						>
							Inspect
						</Button>,
					])}
				/>
			</CardContent>
			<Sheet
				open={Boolean(cartId)}
				onOpenChange={(open) => {
					if (!open) void setCartId(null);
				}}
			>
				<SheetContent className="w-full overflow-y-auto sm:max-w-xl">
					<SheetHeader>
						<SheetTitle>Collection details</SheetTitle>
						<SheetDescription>
							Canonical configurations and current validation status.
						</SheetDescription>
					</SheetHeader>
					{detail.isPending ? (
						<p className="p-5 text-sm text-muted-foreground">Loading…</p>
					) : detail.error ? (
						<p className="p-5 text-sm text-destructive">
							{detail.error.message}
						</p>
					) : detail.data ? (
						<div className="space-y-4 p-5">
							<div className="rounded-md border p-3 text-sm">
								<p className="font-medium">
									{detail.data.customer?.customer?.businessName ||
										detail.data.customer?.customer?.name ||
										detail.data.customer?.name ||
										"Guest shopper"}
								</p>
								<p className="text-muted-foreground">
									{detail.data.customer?.email || "No customer email"}
								</p>
							</div>
							{detail.data.lines.map((line) => (
								<div key={line.id} className="rounded-md border p-3">
									<div className="flex justify-between gap-3">
										<div>
											<p className="font-medium">
												{line.offer?.title || "Unavailable product"}
											</p>
											<p className="text-sm text-muted-foreground">
												{line.quantity} × ${line.unitPrice.toFixed(2)}
											</p>
										</div>
										<Badge variant="secondary">{line.validationStatus}</Badge>
									</div>
									<pre className="mt-3 max-h-48 overflow-auto rounded bg-muted p-2 text-xs">
										{JSON.stringify(line.configuration, null, 2)}
									</pre>
								</div>
							))}
						</div>
					) : null}
				</SheetContent>
			</Sheet>
		</Card>
	);
}

export function StorefrontOrdersPanel() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const orders = useQuery(
		trpc.storefrontAdmin.operations.orders.queryOptions(listInput),
	);
	const verifyOrder = useMutation(
		trpc.storefrontAdmin.operations.verifyOrder.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.storefrontAdmin.operations.orders.queryKey(),
				});
				toast({
					title: "Order verified",
					description: "The payment link was sent to the customer.",
					variant: "success",
				});
			},
			onError: (error) =>
				toast({
					title: "Unable to verify order",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	const [shippingReview, setShippingReview] = useState<{
		id: string;
		status: string;
		calculatedAmount: number;
		finalAmount: number | null;
		oneWayDistanceMiles: number | null;
		estimatedWeightLb: number;
		chargeableWeightLb: number;
		blockers: unknown;
		autoApprovalBlockers: unknown;
		calculation: unknown;
		destinationAddress: unknown;
	} | null>(null);
	const [shippingAmount, setShippingAmount] = useState(0);
	const [shippingNote, setShippingNote] = useState("");
	const reviewShipping = useMutation(
		trpc.storefrontAdmin.operations.reviewShipping.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.storefrontAdmin.operations.orders.queryKey(),
				});
				setShippingReview(null);
				toast({
					title: "Shipping quote finalized",
					description: "The order total now includes the reviewed amount.",
					variant: "success",
				});
			},
			onError: (error) =>
				toast({
					title: "Unable to finalize shipping",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Online orders</CardTitle>
					<p className="text-sm text-muted-foreground">
						Storefront-origin orders are standard office sales orders.
					</p>
				</CardHeader>
				<CardContent>
					<OperationsTable
						loading={orders.isPending}
						error={orders.error?.message}
						headers={[
							"Order",
							"Customer",
							"Status",
							"Sales rep",
							"Payment",
							"Items",
							"Total",
							"Due",
							"Created",
							"",
						]}
						rows={(orders.data?.items || []).map((order) => [
							order.orderId,
							order.customer?.businessName ||
								order.customer?.name ||
								"Customer",
							<Badge variant="secondary" key="status">
								{order.status || "Active"}
							</Badge>,
							order.salesRep?.name || order.salesRep?.email || "Unassigned",
							<Badge variant="secondary" key="checkout-status">
								{order.checkout?.status || "Not started"}
							</Badge>,
							String(order.itemCount),
							`$${order.grandTotal.toFixed(2)}`,
							`$${order.amountDue.toFixed(2)}`,
							order.createdAt ? formatStorefrontDate(order.createdAt) : "",
							<div key="action" className="flex justify-end gap-2">
								{order.checkout?.shippingQuote &&
								!["AUTO_APPROVED", "APPROVED", "OVERRIDDEN"].includes(
									order.checkout.shippingQuote.status,
								) ? (
									<Button
										size="sm"
										variant="secondary"
										onClick={() => {
											const quote = order.checkout?.shippingQuote;
											if (!quote) return;
											setShippingReview({
												id: String(quote.id),
												status: String(quote.status),
												calculatedAmount: Number(quote.calculatedAmount),
												finalAmount:
													quote.finalAmount == null
														? null
														: Number(quote.finalAmount),
												oneWayDistanceMiles:
													quote.oneWayDistanceMiles == null
														? null
														: Number(quote.oneWayDistanceMiles),
												estimatedWeightLb: Number(quote.estimatedWeightLb),
												chargeableWeightLb: Number(quote.chargeableWeightLb),
												blockers: quote.blockers,
												autoApprovalBlockers: quote.autoApprovalBlockers,
												calculation: quote.calculation,
												destinationAddress: quote.destinationAddress,
											});
											setShippingAmount(Number(quote.calculatedAmount));
											setShippingNote("");
										}}
									>
										Review shipping
									</Button>
								) : null}
								{order.checkout?.status === "ORDER_CREATED" ? (
									<Button
										size="sm"
										disabled={
											verifyOrder.isPending ||
											Boolean(
												order.checkout.shippingQuote &&
													!["AUTO_APPROVED", "APPROVED", "OVERRIDDEN"].includes(
														order.checkout.shippingQuote.status,
													),
											)
										}
										onClick={() =>
											verifyOrder.mutate({ checkoutId: order.checkout.id })
										}
									>
										Verify & send link
									</Button>
								) : null}
								<Button asChild size="sm" variant="outline">
									<Link href={`/sales-form/edit-order/${order.slug}`}>
										Open in Sales
									</Link>
								</Button>
							</div>,
						])}
					/>
				</CardContent>
			</Card>
			<Sheet
				open={Boolean(shippingReview)}
				onOpenChange={(open) => !open && setShippingReview(null)}
			>
				<SheetContent className="overflow-y-auto sm:max-w-xl">
					<SheetHeader>
						<SheetTitle>Review delivery quote</SheetTitle>
						<SheetDescription>
							Confirm the calculated amount or enter an office override before
							payment is sent.
						</SheetDescription>
					</SheetHeader>
					{shippingReview ? (
						<div className="mt-6 space-y-5">
							<div className="grid grid-cols-2 gap-3 rounded-md bg-muted p-4 text-sm">
								<div>
									<p className="text-muted-foreground">Calculated</p>
									<p className="font-semibold">
										${shippingReview.calculatedAmount.toFixed(2)}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground">One-way distance</p>
									<p className="font-semibold">
										{shippingReview.oneWayDistanceMiles?.toFixed(1) || "—"} mi
									</p>
								</div>
								<div>
									<p className="text-muted-foreground">Estimated weight</p>
									<p className="font-semibold">
										{shippingReview.estimatedWeightLb.toFixed(0)} lb
									</p>
								</div>
								<div>
									<p className="text-muted-foreground">Chargeable weight</p>
									<p className="font-semibold">
										{shippingReview.chargeableWeightLb.toFixed(0)} lb
									</p>
								</div>
							</div>
							<ShippingQuoteEvidence
								calculation={shippingReview.calculation}
								destinationAddress={shippingReview.destinationAddress}
							/>
							{Array.isArray(shippingReview.blockers) &&
							shippingReview.blockers.length ? (
								<div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
									Manual checks: {shippingReview.blockers.join(", ")}
								</div>
							) : null}
							<NumberField
								label="Final delivery amount"
								value={shippingAmount}
								onChange={setShippingAmount}
							/>
							<label
								htmlFor="shipping-review-note"
								className="grid gap-1 text-sm"
							>
								Review or override note
								<Textarea
									id="shipping-review-note"
									value={shippingNote}
									onChange={(event) => setShippingNote(event.target.value)}
									placeholder="Required context for unusual routes or manual overrides"
								/>
							</label>
							<Button
								className="w-full"
								disabled={
									reviewShipping.isPending ||
									(shippingAmount !== shippingReview.calculatedAmount &&
										!shippingNote.trim())
								}
								onClick={() =>
									reviewShipping.mutate({
										quoteId: shippingReview.id,
										finalAmount: shippingAmount,
										reviewNote: shippingNote || null,
									})
								}
							>
								{reviewShipping.isPending
									? "Saving…"
									: "Finalize delivery amount"}
							</Button>
						</div>
					) : null}
				</SheetContent>
			</Sheet>
		</>
	);
}

function ShippingQuoteEvidence({
	calculation,
	destinationAddress,
}: {
	calculation: unknown;
	destinationAddress: unknown;
}) {
	const quote = storefrontRecord(calculation);
	const breakdown = storefrontRecord(quote.breakdown);
	const destination = storefrontRecord(destinationAddress);
	const lines = Array.isArray(quote.lines)
		? quote.lines.map(storefrontRecord)
		: [];
	return (
		<div className="space-y-3 text-sm">
			<div>
				<p className="text-muted-foreground">Destination</p>
				<p className="font-medium">
					{String(destination.formattedAddress || "Address unavailable")}
				</p>
			</div>
			<div className="grid grid-cols-2 gap-2 rounded-md border p-3">
				<span>Base dispatch</span>
				<span className="text-right">
					${Number(breakdown.baseDispatchFee || 0).toFixed(2)}
				</span>
				<span>Distance charge</span>
				<span className="text-right">
					${Number(breakdown.distanceCharge || 0).toFixed(2)}
				</span>
				<span>Weight-distance charge</span>
				<span className="text-right">
					${Number(breakdown.weightDistanceCharge || 0).toFixed(2)}
				</span>
				<span>Handling</span>
				<span className="text-right">
					${Number(breakdown.handlingSurcharges || 0).toFixed(2)}
				</span>
			</div>
			<div className="space-y-2">
				<p className="font-medium">Weight evidence</p>
				{lines.map((line) => (
					<div
						key={String(line.key || line.description || line.kind)}
						className="rounded-md border p-3"
					>
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="font-medium">
									{String(line.description || line.kind || "Item")}
								</p>
								<p className="text-xs text-muted-foreground">
									{String(line.kind || "ITEM")} ·{" "}
									{String(line.source || "UNMAPPED")}
								</p>
							</div>
							<p className="font-medium">
								{Number(line.weightLb || 0).toFixed(1)} lb
							</p>
						</div>
						{line.shippedLinearFeet ? (
							<p className="mt-1 text-xs text-muted-foreground">
								{Number(line.shippedLinearFeet).toFixed(1)} shipped LF ·{" "}
								{Number(line.pieces || 0)} pieces
							</p>
						) : null}
					</div>
				))}
			</div>
		</div>
	);
}

function storefrontRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export function StorefrontInquiriesPanel() {
	return <StorefrontInquiriesWorkspace />;
}

export function StorefrontSettingsPanel() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const settings = useQuery(trpc.storefrontAdmin.settings.get.queryOptions());
	const salesReps = useQuery(
		trpc.storefrontAdmin.settings.salesReps.queryOptions(),
	);
	const [form, setForm] = useState({
		defaultSalesRepId: null as number | null,
		pickupEnabled: true,
		deliveryEnabled: false,
		deliveryFlatRate: 0,
		freeDeliveryThreshold: null as number | null,
	});
	useEffect(() => {
		if (settings.data)
			setForm({
				...settings.data.checkout,
				defaultSalesRepId: settings.data.defaultSalesRepId,
			});
	}, [settings.data]);
	const save = useMutation(
		trpc.storefrontAdmin.settings.save.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.storefrontAdmin.settings.get.queryKey(),
				});
				toast({ title: "Storefront settings saved", variant: "success" });
			},
			onError: (error) =>
				toast({
					title: "Unable to save settings",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	return (
		<div className="max-w-4xl space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Checkout and fulfillment</CardTitle>
					<p className="text-sm text-muted-foreground">
						These rules are enforced again by the server when the cart becomes a
						Sales Order.
					</p>
				</CardHeader>
				<CardContent>
					<form
						className="space-y-5"
						onSubmit={(event) => {
							event.preventDefault();
							save.mutate(form);
						}}
					>
						<label className="grid gap-1 text-sm">
							Default sales rep
							<select
								className="h-9 rounded-md border bg-background px-3"
								value={form.defaultSalesRepId || ""}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										defaultSalesRepId: event.target.value
											? Number(event.target.value)
											: null,
									}))
								}
							>
								<option value="">Select a sales rep</option>
								{salesReps.data?.map((salesRep) => (
									<option key={salesRep.id} value={salesRep.id}>
										{salesRep.name || salesRep.email}
									</option>
								))}
							</select>
						</label>
						<SwitchRow
							label="Allow pickup"
							checked={form.pickupEnabled}
							onChange={(value) =>
								setForm((current) => ({
									...current,
									pickupEnabled: value,
								}))
							}
						/>
						<SwitchRow
							label="Allow delivery"
							checked={form.deliveryEnabled}
							onChange={(value) =>
								setForm((current) => ({
									...current,
									deliveryEnabled: value,
								}))
							}
						/>
						<div className="grid gap-4 sm:grid-cols-2">
							<NumberField
								label="Delivery flat rate"
								value={form.deliveryFlatRate}
								onChange={(value) =>
									setForm((current) => ({
										...current,
										deliveryFlatRate: value,
									}))
								}
							/>
							<NumberField
								label="Free delivery threshold"
								value={form.freeDeliveryThreshold || 0}
								onChange={(value) =>
									setForm((current) => ({
										...current,
										freeDeliveryThreshold: value > 0 ? value : null,
									}))
								}
							/>
						</div>
						<Button disabled={save.isPending || settings.isPending}>
							{save.isPending ? "Saving…" : "Save checkout settings"}
						</Button>
					</form>
				</CardContent>
			</Card>
			<StorefrontShippingSettingsCard />
		</div>
	);
}

function StorefrontShippingSettingsCard() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const settings = useQuery(
		trpc.storefrontAdmin.settings.shipping.queryOptions(),
	);
	const [form, setForm] = useState<NonNullable<typeof settings.data> | null>(
		null,
	);
	const [originSearch, setOriginSearch] = useState("");
	const [sessionToken, setSessionToken] = useState(() => crypto.randomUUID());
	const [profiles, setProfiles] = useState({
		doors: "[]",
		mouldings: "[]",
		shelves: "[]",
		overrides: "[]",
	});
	useEffect(() => {
		if (!settings.data) return;
		setForm(settings.data);
		setOriginSearch(settings.data.originFormattedAddress || "");
		setProfiles({
			doors: JSON.stringify(settings.data.doorWeightProfiles, null, 2),
			mouldings: JSON.stringify(settings.data.mouldingWeightProfiles, null, 2),
			shelves: JSON.stringify(settings.data.shelfCategoryWeights, null, 2),
			overrides: JSON.stringify(settings.data.productWeightOverrides, null, 2),
		});
	}, [settings.data]);
	const originSuggestions = useQuery(
		trpc.storefrontAdmin.settings.addressAutocomplete.queryOptions(
			{
				query: originSearch.length >= 3 ? originSearch : "___",
				sessionToken,
			},
			{ enabled: originSearch.length >= 3 },
		),
	);
	const save = useMutation(
		trpc.storefrontAdmin.settings.saveShipping.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.storefrontAdmin.settings.shipping.queryKey(),
				});
				toast({
					title: "Shipping policy published",
					description:
						"New quotes will use this version; existing quotes keep their original evidence.",
					variant: "success",
				});
			},
			onError: (error) =>
				toast({
					title: "Unable to publish shipping policy",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	if (!form) {
		return (
			<Card>
				<CardContent className="py-8 text-sm text-muted-foreground">
					Loading shipping policy…
				</CardContent>
			</Card>
		);
	}
	const numberKeys = [
		["baseDispatchFee", "Base dispatch fee"],
		["baseVehicleRatePerMile", "Vehicle rate / route mile"],
		["roundTripMultiplier", "Route multiplier (2 = round trip)"],
		["includedWeightLb", "Included weight (lb)"],
		["weightUnitLb", "Excess-weight unit (lb)"],
		["weightDistanceRate", "Weight × mile rate"],
		["packagingMultiplier", "Packaging multiplier"],
		["weightRoundingIncrementLb", "Round weight up to (lb)"],
		["minimumCharge", "Minimum delivery charge"],
		["maximumCharge", "Maximum delivery charge"],
		["maxDistanceMiles", "Maximum one-way miles"],
		["maxWeightLb", "Maximum shipment weight (lb)"],
		["freeDeliveryThreshold", "Free delivery subtotal"],
		["globalDoorWeightLb", "Fallback door weight (lb)"],
		["globalMouldingLbPerLinearFoot", "Fallback moulding weight / linear ft"],
		["globalShelfWeightPerUnitLb", "Fallback shelf item weight (lb)"],
		["autoApprovalMaxDistanceMiles", "Auto max one-way miles"],
		["autoApprovalMaxWeightLb", "Auto max shipment weight (lb)"],
		["autoApprovalMaxAmount", "Auto max delivery amount"],
	] as const;
	return (
		<Card>
			<CardHeader>
				<CardTitle>Product-aware delivery calculation</CardTitle>
				<p className="text-sm text-muted-foreground">
					Formula: dispatch + route miles × vehicle rate + route miles ×
					excess-weight units × weight rate + handling. V1 always sends the
					result to the office; V2 auto-approves only quotes inside every
					confidence limit.
				</p>
			</CardHeader>
			<CardContent>
				<form
					className="space-y-6"
					onSubmit={(event) => {
						event.preventDefault();
						try {
							save.mutate({
								...form,
								doorWeightProfiles: parseProfileJson(profiles.doors),
								mouldingWeightProfiles: parseProfileJson(profiles.mouldings),
								shelfCategoryWeights: parseProfileJson(profiles.shelves),
								productWeightOverrides: parseProfileJson(profiles.overrides),
							});
						} catch (error) {
							toast({
								title: "Invalid profile JSON",
								description:
									error instanceof Error ? error.message : String(error),
								variant: "destructive",
							});
						}
					}}
				>
					<div className="grid gap-4 sm:grid-cols-2">
						<SwitchRow
							label="Enable calculated delivery"
							checked={form.enabled}
							onChange={(enabled) =>
								setForm((current) =>
									current ? { ...current, enabled } : current,
								)
							}
						/>
						<label className="grid gap-1 text-sm">
							Approval version
							<select
								className="h-9 rounded-md border bg-background px-3"
								value={form.approvalMode}
								onChange={(event) =>
									setForm((current) =>
										current
											? {
													...current,
													approvalMode: event.target.value as
														| "OFFICE_REVIEW"
														| "AUTO_WHEN_CONFIDENT",
												}
											: current,
									)
								}
							>
								<option value="OFFICE_REVIEW">
									V1 — office reviews every quote
								</option>
								<option value="AUTO_WHEN_CONFIDENT">
									V2 — auto-approve inside limits
								</option>
							</select>
						</label>
					</div>

					<div className="relative">
						<label
							htmlFor="shipping-origin-search"
							className="grid gap-1 text-sm"
						>
							Dispatch origin (Google Place)
							<Input
								id="shipping-origin-search"
								value={originSearch}
								onChange={(event) => {
									setOriginSearch(event.target.value);
									setForm((current) =>
										current
											? {
													...current,
													originPlaceId: null,
													originFormattedAddress: null,
												}
											: current,
									);
								}}
								placeholder="Search the warehouse or store address"
							/>
						</label>
						{originSuggestions.data?.length ? (
							<div className="absolute z-20 mt-1 w-full rounded-md border bg-background p-1 shadow-lg">
								{originSuggestions.data.map((suggestion) => (
									<button
										key={suggestion.placeId}
										type="button"
										className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
										onClick={async () => {
											const selected = await queryClient.fetchQuery(
												trpc.storefrontAdmin.settings.placeDetails.queryOptions(
													{
														placeId: suggestion.placeId,
														sessionToken,
													},
												),
											);
											setForm((current) =>
												current
													? {
															...current,
															originPlaceId: selected.placeId,
															originFormattedAddress: selected.formattedAddress,
														}
													: current,
											);
											setOriginSearch(selected.formattedAddress);
											setSessionToken(crypto.randomUUID());
										}}
									>
										{suggestion.text}
									</button>
								))}
								<div className="px-3 py-1 text-right text-xs text-muted-foreground">
									Powered by Google
								</div>
							</div>
						) : null}
					</div>

					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{numberKeys.map(([key, label]) => (
							<NumberField
								key={key}
								label={label}
								value={form[key] ?? 0}
								onChange={(value) =>
									setForm((current) =>
										current
											? {
													...current,
													[key]:
														key.startsWith("auto") ||
														key.startsWith("max") ||
														key === "maximumCharge" ||
														key === "freeDeliveryThreshold" ||
														key.startsWith("global")
															? value > 0
																? value
																: null
															: value,
												}
											: current,
									)
								}
							/>
						))}
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<SwitchRow
							label="Allow global fallback in V2"
							checked={form.allowGlobalFallbackForAutoApproval}
							onChange={(allowGlobalFallbackForAutoApproval) =>
								setForm((current) =>
									current
										? { ...current, allowGlobalFallbackForAutoApproval }
										: current,
								)
							}
						/>
					</div>

					<div className="grid gap-4 lg:grid-cols-2">
						<ProfileJsonField
							label="Door size weights"
							help='Example: [{"dimension":"3-0 x 6-8","weightLb":80,"handlingFeePerUnit":5}]'
							value={profiles.doors}
							onChange={(doors) =>
								setProfiles((current) => ({ ...current, doors }))
							}
						/>
						<ProfileJsonField
							label="Moulding weight profiles"
							help='Example: [{"categoryId":"category-id","lbPerLinearFoot":0.5}]'
							value={profiles.mouldings}
							onChange={(mouldings) =>
								setProfiles((current) => ({ ...current, mouldings }))
							}
						/>
						<ProfileJsonField
							label="Shelf category weights"
							help='Example: [{"categoryId":12,"weightPerUnitLb":8}]'
							value={profiles.shelves}
							onChange={(shelves) =>
								setProfiles((current) => ({ ...current, shelves }))
							}
						/>
						<ProfileJsonField
							label="Product overrides"
							help='Keys: component UID, "door:UID:size", "moulding:UID", or "shelf:productId".'
							value={profiles.overrides}
							onChange={(overrides) =>
								setProfiles((current) => ({ ...current, overrides }))
							}
						/>
					</div>
					<Button
						disabled={save.isPending || (form.enabled && !form.originPlaceId)}
					>
						{save.isPending ? "Publishing…" : "Publish shipping policy"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

function ProfileJsonField({
	label,
	help,
	value,
	onChange,
}: {
	label: string;
	help: string;
	value: string;
	onChange: (value: string) => void;
}) {
	const id = `shipping-profile-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
	return (
		<label htmlFor={id} className="grid gap-1 text-sm">
			{label}
			<Textarea
				id={id}
				className="min-h-32 font-mono text-xs"
				value={value}
				onChange={(event) => onChange(event.target.value)}
			/>
			<span className="text-xs text-muted-foreground">{help}</span>
		</label>
	);
}

function parseProfileJson(value: string) {
	const parsed = JSON.parse(value);
	if (!Array.isArray(parsed))
		throw new Error("Each profile must be a JSON array.");
	return parsed;
}

export function StorefrontContentPanel() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const pages = useQuery(trpc.storefrontAdmin.content.list.queryOptions());
	const [pageId, setPageId] = useState("");
	const [page, setPage] = useState({
		slug: "home",
		title: "Home",
		description: "",
		status: "DRAFT" as "DRAFT" | "PUBLISHED",
	});
	const [section, setSection] = useState({
		key: "hero",
		type: "hero" as
			| "hero"
			| "rich-text"
			| "category-grid"
			| "offer-grid"
			| "faq"
			| "cta",
		title: "",
		body: "",
		imageUrl: "",
		actionLabel: "",
		actionUrl: "",
		status: "DRAFT" as "DRAFT" | "PUBLISHED",
	});
	const refresh = () =>
		queryClient.invalidateQueries({
			queryKey: trpc.storefrontAdmin.content.list.queryKey(),
		});
	const savePage = useMutation(
		trpc.storefrontAdmin.content.savePage.mutationOptions({
			onSuccess: async (saved) => {
				setPageId(saved.id);
				await refresh();
				toast({ title: "Storefront page saved", variant: "success" });
			},
		}),
	);
	const saveSection = useMutation(
		trpc.storefrontAdmin.content.saveSection.mutationOptions({
			onSuccess: async () => {
				await refresh();
				toast({ title: "Storefront section saved", variant: "success" });
			},
		}),
	);
	const selectedPage = pages.data?.find((item) => item.id === pageId);
	return (
		<div className="grid gap-5 xl:grid-cols-[minmax(300px,420px)_minmax(0,1fr)]">
			<Card>
				<CardHeader>
					<CardTitle>Pages</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<select
						className="h-9 w-full rounded-md border bg-background px-3 text-sm"
						value={pageId}
						onChange={(event) => {
							const selected = pages.data?.find(
								(item) => item.id === event.target.value,
							);
							setPageId(event.target.value);
							if (selected) {
								setPage({
									slug: selected.slug,
									title: selected.title,
									description: selected.description || "",
									status:
										selected.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
								});
							}
						}}
					>
						<option value="">Create a page</option>
						{pages.data?.map((item) => (
							<option key={item.id} value={item.id}>
								{item.title}
							</option>
						))}
					</select>
					<TextField
						label="Page title"
						value={page.title}
						onChange={(value) =>
							setPage((current) => ({ ...current, title: value }))
						}
					/>
					<TextField
						label="Slug"
						value={page.slug}
						onChange={(value) =>
							setPage((current) => ({ ...current, slug: value }))
						}
					/>
					<label className="grid gap-1 text-sm">
						Description
						<Textarea
							value={page.description}
							onChange={(event) =>
								setPage((current) => ({
									...current,
									description: event.target.value,
								}))
							}
						/>
					</label>
					<SwitchRow
						label="Published"
						checked={page.status === "PUBLISHED"}
						onChange={(value) =>
							setPage((current) => ({
								...current,
								status: value ? "PUBLISHED" : "DRAFT",
							}))
						}
					/>
					<Button
						disabled={savePage.isPending}
						onClick={() =>
							savePage.mutate({
								id: pageId || undefined,
								...page,
								description: page.description || null,
								seo: {},
							})
						}
					>
						Save page
					</Button>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Sections</CardTitle>
					<p className="text-sm text-muted-foreground">
						{selectedPage
							? `${selectedPage.sections.length} section(s) on ${selectedPage.title}`
							: "Save or choose a page before adding sections."}
					</p>
				</CardHeader>
				<CardContent className="space-y-4">
					{selectedPage?.sections.map((item) => (
						<div
							key={item.id}
							className="flex items-center justify-between rounded-md border p-3"
						>
							<div>
								<p className="font-medium">{item.key}</p>
								<p className="text-xs text-muted-foreground">
									{item.type} · {item.status.toLowerCase()}
								</p>
							</div>
						</div>
					))}
					<select
						className="h-9 w-full rounded-md border bg-background px-3 text-sm"
						value={section.type}
						onChange={(event) =>
							setSection((current) => ({
								...current,
								type: event.target.value as typeof section.type,
							}))
						}
					>
						<option value="hero">Hero</option>
						<option value="rich-text">Rich text</option>
						<option value="category-grid">Category grid</option>
						<option value="offer-grid">Product grid</option>
						<option value="faq">FAQ</option>
						<option value="cta">Call to action</option>
					</select>
					<div className="grid gap-4 sm:grid-cols-2">
						<TextField
							label="Section key"
							value={section.key}
							onChange={(value) =>
								setSection((current) => ({ ...current, key: value }))
							}
						/>
						<TextField
							label="Heading"
							value={section.title}
							onChange={(value) =>
								setSection((current) => ({ ...current, title: value }))
							}
						/>
						<TextField
							label="Image URL"
							value={section.imageUrl}
							onChange={(value) =>
								setSection((current) => ({
									...current,
									imageUrl: value,
								}))
							}
						/>
						<TextField
							label="Action URL"
							value={section.actionUrl}
							onChange={(value) =>
								setSection((current) => ({
									...current,
									actionUrl: value,
								}))
							}
						/>
					</div>
					<label className="grid gap-1 text-sm">
						Body
						<Textarea
							value={section.body}
							onChange={(event) =>
								setSection((current) => ({
									...current,
									body: event.target.value,
								}))
							}
						/>
					</label>
					<SwitchRow
						label="Published"
						checked={section.status === "PUBLISHED"}
						onChange={(value) =>
							setSection((current) => ({
								...current,
								status: value ? "PUBLISHED" : "DRAFT",
							}))
						}
					/>
					<Button
						disabled={!pageId || saveSection.isPending}
						onClick={() =>
							saveSection.mutate({
								pageId,
								key: section.key,
								type: section.type,
								content: {
									title: section.title,
									body: section.body,
									imageUrl: section.imageUrl,
									actionLabel: section.actionLabel,
									actionUrl: section.actionUrl,
								},
								status: section.status,
								sortOrder: selectedPage?.sections.length || 0,
							})
						}
					>
						Add section
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

function OperationsTable({
	headers,
	rows,
	loading,
	error,
}: {
	headers: string[];
	rows: React.ReactNode[][];
	loading: boolean;
	error?: string;
}) {
	if (loading) return <p className="py-10 text-center">Loading…</p>;
	if (error)
		return <p className="py-10 text-center text-destructive">{error}</p>;
	if (!rows.length) {
		return (
			<p className="py-10 text-center text-muted-foreground">
				No records found.
			</p>
		);
	}
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b text-left text-muted-foreground">
						{headers.map((header) => (
							<th key={header} className="px-3 py-2 font-medium">
								{header}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, rowIndex) => (
						<tr key={rowIndex} className="border-b last:border-0">
							{row.map((cell, cellIndex) => (
								<td key={cellIndex} className="px-3 py-3">
									{cell}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function SwitchRow({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (value: boolean) => void;
}) {
	return (
		<label className="flex items-center justify-between rounded-md border p-3 text-sm">
			{label}
			<Switch checked={checked} onCheckedChange={onChange} />
		</label>
	);
}

function NumberField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: number;
	onChange: (value: number) => void;
}) {
	return (
		<label className="grid gap-1 text-sm">
			{label}
			<Input
				type="number"
				min={0}
				step="0.01"
				value={value}
				onChange={(event) => onChange(Number(event.target.value || 0))}
			/>
		</label>
	);
}

function TextField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<label className="grid gap-1 text-sm">
			{label}
			<Input value={value} onChange={(event) => onChange(event.target.value)} />
		</label>
	);
}
