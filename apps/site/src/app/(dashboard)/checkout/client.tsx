"use client";

import { Footer } from "@/components/footer";
import { OrderItemsSummary } from "@/components/order-items-summary";
import { CartProvider, useCart } from "@/hooks/use-cart";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import type { StorefrontRouterOutputs } from "@gnd/api/trpc/routers/storefront-app";
import {
	addMoney,
	calculatePaymentChannelCharge,
	multiplyMoney,
	roundMoney,
} from "@gnd/sales/payment-system";
import { Alert, AlertDescription } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { FormInput } from "@gnd/ui/controls/form-input";
import { Form } from "@gnd/ui/form";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type { FieldPath } from "react-hook-form";
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
	};
	const form = useZodForm(checkoutFormSchema, {
		defaultValues: {
			fulfillment: state.fulfillment.pickupEnabled ? "pickup" : "delivery",
			shippingAddress: defaultAddress,
			billingSameAsShipping: true,
			billingAddress: defaultAddress,
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
				window.location.assign(result.paymentUrl);
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
	const billingSame = form.watch("billingSameAsShipping");
	const fulfillment = form.watch("fulfillment");

	const submit = (value: CheckoutFormValues) =>
		createCheckout.mutate({
			...value,
			idempotencyKey,
			cartVersion,
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
							/>

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
								disabled={createCheckout.isPending}
							>
								<Icons.Lock className="mr-2 size-4" />
								{createCheckout.isPending
									? "Preparing payment…"
									: "Continue to secure payment"}
							</Button>
						</div>

						<aside className="space-y-6">
							<OrderItemsSummary />
							<CheckoutOrderSummary state={state} fulfillment={fulfillment} />
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

function CheckoutOrderSummary({
	state,
	fulfillment,
}: {
	state: StorefrontRouterOutputs["storefrontCommerce"]["checkout"]["state"];
	fulfillment: "pickup" | "delivery";
}) {
	const cart = useCart();
	const subtotal = cart.data?.estimate.subtotal || 0;
	const delivery =
		fulfillment === "delivery" &&
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
}: {
	title: string;
	prefix: "shippingAddress" | "billingAddress";
}) {
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
