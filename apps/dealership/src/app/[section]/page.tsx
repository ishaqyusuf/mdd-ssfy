import { DealerPortalSection } from "@/components/dealer-portal-section";
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
  const supportedSections = ["orders", "quotes", "customers", "profiles", "settings"];
  const portalSection = supportedSections.includes(section)
    ? (section as "orders" | "quotes" | "customers" | "profiles" | "settings")
    : null;

  return (
    <DealershipShell dealer={dealer}>
      <div className="space-y-6">
        <header className="border-b pb-6">
          <p className="text-sm font-medium text-muted-foreground">
            Dealer workspace
          </p>
          <h2 className="text-2xl font-semibold tracking-normal">{title}</h2>
        </header>

        {portalSection ? <DealerPortalSection section={portalSection} /> : null}
      </div>
    </DealershipShell>
  );
}
