"use client";

import { Footer } from "@/components/footer";
import { OrderItemsSummary } from "@/components/order-items-summary";
import { CartProvider, useCart } from "@/hooks/use-cart";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import type { StorefrontRouterOutputs } from "@gnd/api/trpc/routers/storefront-app";
import {
	addMoney,
	multiplyMoney,
	roundMoney,
} from "@gnd/sales/payment-system/money";
import { calculatePaymentChannelCharge } from "@gnd/sales/payment-system/payment-channel-charge";
import { Alert, AlertDescription } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { FormInput } from "@gnd/ui/controls/form-input";
import { Form } from "@gnd/ui/form";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { type FieldPath, useFormContext } from "react-hook-form";
import { z } from "zod";

const addressSchema = z.object({
	id: z.number().optional().nullable(),
	name: z.string().min(1),
	email: z.string().email(),
	phone: z.string().min(7),
	address1: z.string().min(1),
	address2: z.string().optional().nullable(),
	city: z.string().min(1),
	state: z.string().min(1),
	postalCode: z.string().min(3),
	country: z.string().min(2),
	placeId: z.string().optional().nullable(),
	formattedAddress: z.string().optional().nullable(),
	lat: z.number().optional().nullable(),
	lng: z.number().optional().nullable(),
});
const checkoutFormSchema = z
	.object({
		fulfillment: z.enum(["pickup", "delivery"]),
		shippingAddress: addressSchema,
		billingSameAsShipping: z.boolean(),
		billingAddress: addressSchema.optional().nullable(),
	})
	.superRefine((value, ctx) => {
		if (!value.billingSameAsShipping && !value.billingAddress) {
			ctx.addIssue({
				code: "custom",
				path: ["billingAddress"],
				message: "Billing address is required.",
			});
		}
	});
type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export function CheckoutPage() {
	return (
		<CartProvider>
			<CheckoutContent />
		</CartProvider>
	);
}

function CheckoutContent() {
	const trpc = useTRPC();
	const { data, isPending, error } = useQuery(
		trpc.storefrontCommerce.checkout.state.queryOptions(),
	);
	const cart = useCart();

	if (isPending || cart.loadingCart) {
		return (
			<div className="container mx-auto animate-pulse px-4 py-16">
				Loading secure checkout…
			</div>
		);
	}
	if (error) {
		return (
			<div className="container mx-auto px-4 py-16 text-center">
				<h1 className="text-2xl font-bold">Sign in to continue</h1>
				<p className="mt-2 text-muted-foreground">{error.message}</p>
				<Button asChild className="mt-5">
					<Link href="/login?callbackUrl=/checkout">Sign in</Link>
				</Button>
			</div>
		);
	}
	if (!data || !cart.data?.items.length) {
		return (
			<div className="container mx-auto px-4 py-16 text-center">
				<h1 className="text-2xl font-bold">Your cart is empty</h1>
				<Button asChild className="mt-5">
					<Link href="/search">Browse products</Link>
				</Button>
			</div>
		);
	}
	return <CheckoutForm state={data} cartVersion={cart.data.version} />;
}

function CheckoutForm({
	state,
	cartVersion,
}: {
	state: StorefrontRouterOutputs["storefrontCommerce"]["checkout"]["state"];
	cartVersion: number;
}) {
	const primary = state.addresses.find((address) => address.isPrimary);
	const defaultAddress = {
		id: primary?.id ?? null,
		name:
			primary?.name || state.customer.businessName || state.customer.name || "",
		email: primary?.email || state.customer.email || "",
		phone: primary?.phone || state.customer.phoneNo || "",
		address1: primary?.address1 || "",
		address2: primary?.address2 || "",
		city: primary?.city || "",
		state: primary?.state || "",
		postalCode: primary?.postalCode || "",
		country: primary?.country || "US",
		placeId: primary?.placeId || null,
		formattedAddress: primary?.formattedAddress || null,
		lat: primary?.lat ?? null,
		lng: primary?.lng ?? null,
	};
	const form = useZodForm(checkoutFormSchema, {
		defaultValues: {
			fulfillment: state.fulfillment.pickupEnabled ? "pickup" : "delivery",
			shippingAddress: defaultAddress,
			billingSameAsShipping: true,
			billingAddress: null,
		},
	});
	const [idempotencyKey] = useState(() => {
		const storageKey = "gnd-storefront-checkout-idempotency";
		const stored = globalThis.sessionStorage?.getItem(storageKey);
		if (stored) return stored;
		const created = crypto.randomUUID();
		globalThis.sessionStorage?.setItem(storageKey, created);
		return created;
	});
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const createCheckout = useMutation(
		trpc.storefrontCommerce.checkout.create.mutationOptions({
			onSuccess: (result) => {
				globalThis.sessionStorage?.removeItem(
					"gnd-storefront-checkout-idempotency",
				);
				window.location.assign(
					result.paymentUrl || `/orders/${encodeURIComponent(result.orderId)}`,
				);
			},
			onError: (error) => {
				if (error.data?.code === "CONFLICT") {
					void queryClient.invalidateQueries({
						queryKey: trpc.storefrontCommerce.cart.get.queryKey(),
					});
				}
			},
		}),
	);
	const [shippingQuote, setShippingQuote] = useState<{
		id: string;
		status: string;
		amount: number;
		calculation: {
			breakdown: {
				oneWayDistanceMiles: number | null;
				estimatedWeightLb: number;
			};
		};
	} | null>(null);
	const shippingPreview = useMutation(
		trpc.storefrontCommerce.checkout.shippingPreview.mutationOptions({
			onSuccess: (quote) => setShippingQuote(quote),
			onError: () => setShippingQuote(null),
		}),
	);
	const billingSame = form.watch("billingSameAsShipping");
	const fulfillment = form.watch("fulfillment");
	useEffect(() => {
		if (
			fulfillment !== "delivery" ||
			!state.fulfillment.calculatedDeliveryEnabled ||
			!defaultAddress.placeId ||
			!defaultAddress.formattedAddress
		) {
			return;
		}
		shippingPreview.mutate({
			cartVersion,
			destination: {
				placeId: defaultAddress.placeId,
				formattedAddress: defaultAddress.formattedAddress,
			},
		});
	}, [
		cartVersion,
		defaultAddress.formattedAddress,
		defaultAddress.placeId,
		fulfillment,
		shippingPreview.mutate,
		state.fulfillment.calculatedDeliveryEnabled,
	]);

	const submit = (value: CheckoutFormValues) =>
		createCheckout.mutate({
			...value,
			idempotencyKey,
			cartVersion,
			shippingQuoteId:
				value.fulfillment === "delivery" &&
				state.fulfillment.calculatedDeliveryEnabled
					? shippingQuote?.id
					: null,
		});

	return (
		<div className="min-h-screen bg-background">
			<main className="container mx-auto px-4 py-10">
				<nav className="mb-6 text-sm text-muted-foreground">
					<Link href="/cart" className="hover:text-foreground">
						Cart
					</Link>
					<span className="mx-2">/</span>
					<span className="text-foreground">Checkout</span>
				</nav>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(submit)}
						className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]"
					>
						<div className="space-y-6">
							{createCheckout.error && (
								<Alert variant="destructive">
									<AlertDescription>
										{createCheckout.error.message}
									</AlertDescription>
								</Alert>
							)}

							<Card>
								<CardHeader>
									<CardTitle>Fulfillment</CardTitle>
								</CardHeader>
								<CardContent>
									<select
										{...form.register("fulfillment")}
										className="h-10 w-full rounded-md border bg-background px-3"
									>
										{state.fulfillment.pickupEnabled && (
											<option value="pickup">Pickup</option>
										)}
										{state.fulfillment.deliveryEnabled && (
											<option value="delivery">
												Delivery
												{state.fulfillment.deliveryFlatRate > 0
													? ` — $${state.fulfillment.deliveryFlatRate.toFixed(2)}`
													: ""}
											</option>
										)}
									</select>
								</CardContent>
							</Card>

							<AddressFields
								title="Shipping information"
								prefix="shippingAddress"
								deliveryAddress={
									fulfillment === "delivery" &&
									state.fulfillment.calculatedDeliveryEnabled
								}
								onVerifiedAddress={(destination) =>
									shippingPreview.mutate({
										cartVersion,
										destination,
									})
								}
							/>
							{fulfillment === "delivery" &&
							state.fulfillment.calculatedDeliveryEnabled ? (
								<ShippingQuoteStatus
									quote={shippingQuote}
									loading={shippingPreview.isPending}
									error={shippingPreview.error?.message}
								/>
							) : null}

							<Card>
								<CardContent className="pt-6">
									<label className="flex items-center gap-2 text-sm">
										<input
											type="checkbox"
											{...form.register("billingSameAsShipping")}
										/>
										Billing address is the same as shipping
									</label>
								</CardContent>
							</Card>

							{!billingSame && (
								<AddressFields
									title="Billing information"
									prefix="billingAddress"
								/>
							)}

							<Button
								type="submit"
								className="w-full bg-amber-800 text-lg hover:bg-amber-900"
								disabled={
									createCheckout.isPending ||
									shippingPreview.isPending ||
									(fulfillment === "delivery" &&
										state.fulfillment.calculatedDeliveryEnabled &&
										!shippingQuote)
								}
							>
								<Icons.Lock className="mr-2 size-4" />
								{createCheckout.isPending
									? "Submitting order…"
									: "Submit order for review"}
							</Button>
						</div>

						<aside className="space-y-6">
							<OrderItemsSummary />
							<CheckoutOrderSummary
								state={state}
								fulfillment={fulfillment}
								calculatedDelivery={shippingQuote?.amount ?? null}
							/>
							<p className="text-center text-xs text-muted-foreground">
								Product prices and online availability are revalidated before
								the order is created. Payment is processed securely by Square.
							</p>
						</aside>
					</form>
				</Form>
			</main>
			<Footer />
		</div>
	);
}

function ShippingQuoteStatus({
	quote,
	loading,
	error,
}: {
	quote: {
		status: string;
		amount: number;
		calculation: {
			breakdown: {
				oneWayDistanceMiles: number | null;
				estimatedWeightLb: number;
			};
		};
	} | null;
	loading: boolean;
	error?: string;
}) {
	if (loading) {
		return (
			<Alert>
				<AlertDescription>
					Calculating the driving route and product weight…
				</AlertDescription>
			</Alert>
		);
	}
	if (error) {
		return (
			<Alert variant="destructive">
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		);
	}
	if (!quote) {
		return (
			<Alert>
				<AlertDescription>
					Select a Google-verified address to calculate delivery.
				</AlertDescription>
			</Alert>
		);
	}
	const officeReview = quote.status !== "AUTO_APPROVED";
	return (
		<Alert>
			<AlertDescription>
				<strong>${quote.amount.toFixed(2)} delivery estimate.</strong>{" "}
				{quote.calculation.breakdown.oneWayDistanceMiles?.toFixed(1) || "—"}{" "}
				miles one way and approximately{" "}
				{quote.calculation.breakdown.estimatedWeightLb.toFixed(0)} lb of
				product.{" "}
				{officeReview
					? "The office will confirm or adjust this amount before sending payment."
					: "This quote passed the automatic approval limits."}
			</AlertDescription>
		</Alert>
	);
}

function CheckoutOrderSummary({
	state,
	fulfillment,
	calculatedDelivery,
}: {
	state: StorefrontRouterOutputs["storefrontCommerce"]["checkout"]["state"];
	fulfillment: "pickup" | "delivery";
	calculatedDelivery: number | null;
}) {
	const cart = useCart();
	const subtotal = cart.data?.estimate.subtotal || 0;
	const delivery =
		fulfillment === "delivery" && calculatedDelivery != null
			? calculatedDelivery
			: fulfillment === "delivery" &&
					!(
						state.fulfillment.freeDeliveryThreshold &&
						subtotal >= state.fulfillment.freeDeliveryThreshold
					)
				? state.fulfillment.deliveryFlatRate
				: 0;
	const tax = roundMoney(multiplyMoney(subtotal, state.pricing.taxRate / 100));
	const orderTotal = addMoney(subtotal, delivery, tax);
	const paymentCharge = calculatePaymentChannelCharge({
		paymentMethod: "link",
		paymentAmount: orderTotal,
		cccPercentage: state.pricing.cardFeePercentage,
	});
	return (
		<div className="rounded-lg bg-gray-50 p-6">
			<h3 className="mb-4 text-lg font-semibold">Order summary</h3>
			<div className="space-y-2">
				<SummaryRow label="Subtotal" value={subtotal} />
				<SummaryRow
					label={fulfillment === "delivery" ? "Delivery" : "Pickup"}
					value={delivery}
				/>
				<SummaryRow label={`Tax (${state.pricing.taxRate}%)`} value={tax} />
				{paymentCharge.applies && paymentCharge.amount > 0 ? (
					<SummaryRow
						label={`Card processing (${paymentCharge.percentage}%)`}
						value={paymentCharge.amount}
					/>
				) : null}
				<div className="mt-2 border-t pt-2">
					<SummaryRow
						label="Total charged"
						value={paymentCharge.chargeAmount}
						emphasized
					/>
				</div>
			</div>
		</div>
	);
}

function SummaryRow({
	label,
	value,
	emphasized = false,
}: {
	label: string;
	value: number;
	emphasized?: boolean;
}) {
	return (
		<div
			className={`flex justify-between ${emphasized ? "text-lg font-bold" : ""}`}
		>
			<span>{label}</span>
			<span>${value.toFixed(2)}</span>
		</div>
	);
}

function AddressFields({
	title,
	prefix,
	deliveryAddress = false,
	onVerifiedAddress,
}: {
	title: string;
	prefix: "shippingAddress" | "billingAddress";
	deliveryAddress?: boolean;
	onVerifiedAddress?: (destination: {
		placeId: string;
		formattedAddress: string;
		sessionToken: string;
	}) => void;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const form = useFormContext<CheckoutFormValues>();
	const [addressSearch, setAddressSearch] = useState("");
	const [sessionToken, setSessionToken] = useState(() => crypto.randomUUID());
	const suggestions = useQuery(
		trpc.storefrontCommerce.checkout.addressAutocomplete.queryOptions(
			{
				query: addressSearch.length >= 3 ? addressSearch : "___",
				sessionToken,
			},
			{ enabled: deliveryAddress && addressSearch.length >= 3 },
		),
	);
	type AddressFieldName =
		| "name"
		| "email"
		| "phone"
		| "country"
		| "address1"
		| "address2"
		| "city"
		| "state"
		| "postalCode";
	const field = (name: AddressFieldName) =>
		`${prefix}.${name}` as FieldPath<CheckoutFormValues>;
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-4 sm:grid-cols-2">
				{deliveryAddress ? (
					<div className="relative sm:col-span-2">
						<label className="grid gap-1 text-sm font-medium">
							Find delivery address
							<input
								type="search"
								autoComplete="street-address"
								className="h-10 rounded-md border bg-background px-3"
								placeholder="Start typing a street address"
								value={addressSearch}
								onChange={(event) => {
									setAddressSearch(event.target.value);
									form.setValue("shippingAddress.placeId", null);
								}}
							/>
						</label>
						{suggestions.data?.length ? (
							<ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background p-1 shadow-lg">
								{suggestions.data.map((suggestion) => (
									<li key={suggestion.placeId}>
										<button
											type="button"
											className="w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
											onClick={async () => {
												const selected = await queryClient.fetchQuery(
													trpc.storefrontCommerce.checkout.placeDetails.queryOptions(
														{
															placeId: suggestion.placeId,
															sessionToken,
														},
													),
												);
												form.setValue(
													"shippingAddress.placeId",
													selected.placeId,
													{
														shouldValidate: true,
													},
												);
												form.setValue(
													"shippingAddress.formattedAddress",
													selected.formattedAddress,
												);
												form.setValue(
													"shippingAddress.address1",
													selected.address1 || selected.formattedAddress,
												);
												form.setValue("shippingAddress.city", selected.city);
												form.setValue("shippingAddress.state", selected.state);
												form.setValue(
													"shippingAddress.postalCode",
													selected.postalCode,
												);
												form.setValue(
													"shippingAddress.country",
													selected.country || "US",
												);
												form.setValue("shippingAddress.lat", selected.lat);
												form.setValue("shippingAddress.lng", selected.lng);
												setAddressSearch(selected.formattedAddress);
												onVerifiedAddress?.({
													placeId: selected.placeId,
													formattedAddress: selected.formattedAddress,
													sessionToken,
												});
												setSessionToken(crypto.randomUUID());
											}}
										>
											<span className="block font-medium">
												{suggestion.mainText}
											</span>
											<span className="text-muted-foreground">
												{suggestion.secondaryText}
											</span>
										</button>
									</li>
								))}
								<li className="px-3 py-1 text-right text-xs text-muted-foreground">
									Powered by Google
								</li>
							</ul>
						) : null}
					</div>
				) : null}
				<FormInput name={field("name")} label="Name" />
				<FormInput name={field("email")} label="Email" type="email" />
				<FormInput name={field("phone")} label="Phone" />
				<FormInput name={field("country")} label="Country" />
				<FormInput
					name={field("address1")}
					label="Address"
					className="sm:col-span-2"
				/>
				<FormInput
					name={field("address2")}
					label="Address line 2"
					className="sm:col-span-2"
				/>
				<FormInput name={field("city")} label="City" />
				<FormInput name={field("state")} label="State" />
				<FormInput name={field("postalCode")} label="Postal code" />
			</CardContent>
		</Card>
	);
}
