import { DealershipDashboard } from "@/components/dealership-dashboard";
import { DealershipShell } from "@/components/dealership-shell";
import PageShell from "@/components/page-shell";
import { requireDealer } from "@/lib/dealer-session";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";

export default async function DealershipPage() {
  const { dealer } = await requireDealer();
  const queryClient = getQueryClient();
  const dealerName =
    dealer.companyName ||
    dealer.dealer?.businessName ||
    dealer.name ||
    dealer.dealer?.name ||
    dealer.email;

  await queryClient.prefetchQuery(trpc.dealerPortal.dashboard.queryOptions());

  return (
    <DealershipShell dealer={dealer}>
      <PageShell>
        <HydrateClient>
          <DealershipDashboard dealerName={dealerName} />
        </HydrateClient>
      </PageShell>
    </DealershipShell>
  );
}
