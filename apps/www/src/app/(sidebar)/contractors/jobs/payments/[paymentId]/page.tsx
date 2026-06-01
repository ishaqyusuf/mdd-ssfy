import { PaymentOverviewPage } from "@/components/payment-dashboard/payment-overview-page";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ paymentId: string }>;
}) {
    const { paymentId } = await params;

    return constructMetadata({
        title: `Payout #${paymentId} | GND`,
    });
}

export default async function ContractorPaymentOverviewRoute({
    params,
}: {
    params: Promise<{ paymentId: string }>;
}) {
    const { paymentId } = await params;
    const numericPaymentId = Number(paymentId);
    const queryClient = getQueryClient();

    await queryClient.fetchQuery(
        trpc.jobs.contractorPayoutOverview.queryOptions({
            paymentId: numericPaymentId,
        }),
    );

    return (
        <HydrateClient>
            <PaymentOverviewPage paymentId={numericPaymentId} />
        </HydrateClient>
    );
}
