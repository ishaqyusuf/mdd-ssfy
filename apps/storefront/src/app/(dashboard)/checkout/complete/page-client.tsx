"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export function CheckoutCompleteClient() {
	const checkoutId = useSearchParams().get("checkoutId") || "";
	const router = useRouter();
	const trpc = useTRPC();
	const started = useRef(false);
	const confirmation = useMutation(
		trpc.storefrontCommerce.checkout.confirmPayment.mutationOptions({
			onSuccess: (result) => {
				if (result.status === "COMPLETED") {
					globalThis.sessionStorage?.removeItem(
						"gnd-storefront-checkout-idempotency",
					);
					router.replace("/orders");
					router.refresh();
				}
			},
		}),
	);
	const confirmPayment = confirmation.mutate;

	useEffect(() => {
		if (checkoutId && !started.current) {
			started.current = true;
			confirmPayment({ checkoutId });
		}
	}, [checkoutId, confirmPayment]);

	const complete = confirmation.data?.status === "COMPLETED";
	return (
		<main className="container mx-auto flex min-h-[70vh] items-center justify-center px-4">
			<Card className="w-full max-w-lg">
				<CardContent className="p-8 text-center">
					<h1 className="text-2xl font-bold">
						{complete
							? "Payment complete"
							: confirmation.error
								? "Unable to confirm payment"
								: "Confirming your payment…"}
					</h1>
					<p className="mt-3 text-muted-foreground">
						{complete
							? "Your order is now available in your account."
							: confirmation.error?.message ||
								"Square may take a moment to finalize the transaction."}
					</p>
					{!complete &&
						!confirmation.isPending &&
						!confirmation.error &&
						checkoutId && (
							<Button
								className="mt-5"
								onClick={() => confirmation.mutate({ checkoutId })}
							>
								Check again
							</Button>
						)}
					<div className="mt-6 flex justify-center gap-3">
						<Button asChild variant="outline">
							<Link href="/orders">View orders</Link>
						</Button>
						<Button asChild>
							<Link href="/search">Continue shopping</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</main>
	);
}
