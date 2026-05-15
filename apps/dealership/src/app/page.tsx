import { DealershipDashboard } from "@/components/dealership-dashboard";
import { DealershipShell } from "@/components/dealership-shell";

export default function DealershipPage() {
  return (
    <DealershipShell>
      <DealershipDashboard />
    </DealershipShell>
  );
}
