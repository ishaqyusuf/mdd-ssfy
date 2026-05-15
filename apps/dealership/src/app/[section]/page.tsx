import { DealershipShell } from "@/components/dealership-shell";
import { requireDealer } from "@/lib/dealer-session";

const titles: Record<string, string> = {
  orders: "Orders",
  quotes: "Quotes",
  customers: "Customers",
  profiles: "Sales Profiles",
  settings: "Company Settings",
};

export default async function DealershipSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const { dealer } = await requireDealer();
  const title = titles[section] || "Dealership";

  return (
    <DealershipShell dealer={dealer}>
      <div className="space-y-6">
        <header className="border-b pb-6">
          <p className="text-sm font-medium text-muted-foreground">
            Dealer workspace
          </p>
          <h2 className="text-2xl font-semibold tracking-normal">{title}</h2>
        </header>

        <div className="min-h-96 rounded-lg border bg-card p-5">
          <div className="flex h-72 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            Ready for implementation
          </div>
        </div>
      </div>
    </DealershipShell>
  );
}
