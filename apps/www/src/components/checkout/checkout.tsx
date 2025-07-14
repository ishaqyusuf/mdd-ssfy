import { useSquarePaymentCheckoutFilterParams } from "@/hooks/use-square-payment-checkout-filter";
import { useTRPC } from "@/trpc/client";

export function Checkout() {
    const trpc = useTRPC();
    const { params } = useSquarePaymentCheckoutFilterParams();

    // const {} = useSuspenseQuery(
    //     trpc.checkout.
    // )
    return <></>;
}

