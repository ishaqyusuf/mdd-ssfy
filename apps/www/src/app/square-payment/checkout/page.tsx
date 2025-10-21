import { CheckoutSkeleton } from "@/components/checkout/checkout-skeleton";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { SearchParams } from "nuqs";
import { Suspense } from "react";
import { decodeData, encodeData } from "@gnd/utils/encrypt";
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
    // const enc = encodeData({
    //     ...searchParams,
    // });
    // const ss = decodeData(enc);

    // console.log({
    //     enc,
    //     ss,
    // });
    return (
        <div>
            <Suspense fallback={<CheckoutSkeleton />}>
                {/* <div>{JSON.stringify(ss)}</div>
                <div>{searchParams.token}</div> */}
            </Suspense>
        </div>
    );
}

