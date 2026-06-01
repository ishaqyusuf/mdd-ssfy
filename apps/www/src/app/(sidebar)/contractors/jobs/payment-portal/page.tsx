import { LazyPaymentPortal } from "@/components/payment-dashboard/lazy-payment-dashboard";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import type { SearchParams } from "nuqs";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return constructMetadata({
        title: "Contractor Payment Portal | GND",
    });
}

type Props = {
    searchParams: Promise<SearchParams>;
};

export default async function ContractorsPaymentPortalPage(props: Props) {
    const searchParams = await props.searchParams;
    const queryClient = getQueryClient();
    const initialDashboard = await queryClient.fetchQuery(
        trpc.jobs.paymentDashboard.queryOptions({}),
    );
    const requestedContractorId = Number(searchParams.contractorId || 0);
    const initialContractorId = initialDashboard.contractors.some(
        (contractor) => contractor.id === requestedContractorId,
    )
        ? requestedContractorId
        : initialDashboard.contractors[0]?.id;

    if (initialContractorId) {
        await queryClient.fetchQuery(
            trpc.jobs.paymentPortal.queryOptions({
                userId: initialContractorId,
                q: undefined,
                status: "all",
            }),
        );
    }

    return (
        <PageShell>
            <HydrateClient>
                <>
                    <PageTitle>Contractor Payment Portal</PageTitle>
                    <LazyPaymentPortal />
                </>
            </HydrateClient>
        </PageShell>
    );
}
