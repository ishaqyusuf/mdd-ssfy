import { useSquarePaymentCheckoutFilterParams } from "@/hooks/use-square-payment-checkout-filter";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

export function Checkout() {
    const trpc = useTRPC();
    const { params } = useSquarePaymentCheckoutFilterParams();

    // const {} = useSuspenseQuery(
    //     trpc.checkout.
    // )
    return <></>;
}

