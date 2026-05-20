import { DealershipDashboard } from "@/components/dealership-dashboard";
import { DealershipShell } from "@/components/dealership-shell";
import PageShell from "@/components/page-shell";
import { requireDealer } from "@/lib/dealer-session";

export default async function DealershipPage() {
  const { dealer } = await requireDealer();
  const dealerName =
    dealer.companyName ||
    dealer.dealer?.businessName ||
    dealer.name ||
    dealer.dealer?.name ||
    dealer.email;

  return (
    <DealershipShell dealer={dealer}>
      <PageShell>
        <DealershipDashboard dealerName={dealerName} />
      </PageShell>
    </DealershipShell>
  );
}
