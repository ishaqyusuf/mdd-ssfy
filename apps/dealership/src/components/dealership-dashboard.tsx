import { ArrowUpRight, CircleDollarSign, FileText, Users } from "lucide-react";

const metrics = [
  {
    label: "Open Quotes",
    value: "0",
    icon: FileText,
  },
  {
    label: "Active Orders",
    value: "0",
    icon: ArrowUpRight,
  },
  {
    label: "Customers",
    value: "0",
    icon: Users,
  },
  {
    label: "Ledger Balance",
    value: "$0.00",
    icon: CircleDollarSign,
  },
];

export function DealershipDashboard({
  dealerName,
}: {
  dealerName: string;
}) {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 border-b pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Dealer workspace
          </p>
          <h2 className="text-2xl font-semibold tracking-normal">
            {dealerName}
          </h2>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div className="rounded-lg border bg-card p-4" key={metric.label}>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </p>
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold">{metric.value}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-h-80 rounded-lg border bg-card p-5">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-base font-semibold">Sales Activity</h3>
            <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
              Month
            </span>
          </div>
          <div className="flex h-56 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No activity
          </div>
        </div>

        <div className="min-h-80 rounded-lg border bg-card p-5">
          <h3 className="mb-6 text-base font-semibold">Recent Work</h3>
          <div className="flex h-56 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No recent records
          </div>
        </div>
      </section>
    </div>
  );
}
