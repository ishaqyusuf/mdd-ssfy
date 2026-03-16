import { SquareTokenCheckout } from "@/components/square-token-checkout";
import { SquareTokenCheckoutSkeleton } from "@/components/square-token-checkout-skeleton";
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
    params;
};
export default async function Page(props: Props) {
    const params = await props.params;

    return (
        <div>
            <Suspense fallback={<SquareTokenCheckoutSkeleton />}>
                <SquareTokenCheckout token={params.token} />
            </Suspense>
        </div>
    );
}

