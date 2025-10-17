import { CheckoutSkeleton } from "@/components/checkout/checkout-skeleton";
import { loadSquarePaymentCheckoutFilterParams } from "@/hooks/use-square-payment-checkout-filter";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { SearchParams } from "nuqs";
import { Suspense } from "react";

export async function generateMetadata({ params }) {
    return constructMetadata({
        title: `Square Checkout - gndprodesk.com`,
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
    const searchParams = await props.searchParams;
    // const filter = loadSquarePaymentCheckoutFilterParams(searchParams);
    return (
        <div>
            <Suspense fallback={<CheckoutSkeleton />}></Suspense>
        </div>
    );
}

