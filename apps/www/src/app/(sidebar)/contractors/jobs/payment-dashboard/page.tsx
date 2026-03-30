import { PaymentDashboard } from "@/components/payment-dashboard";
import { constructMetadata } from "@gnd/utils/construct-metadata";

import PageShell from "@/components/page-shell";
export async function generateMetadata() {
	return constructMetadata({
		title: "Contractor Payment Dashboard | GND",
	});
}

export default function ContractorsPaymentDashboardPage() {
	return (
		<PageShell>
			{" "}
			<PaymentDashboard />
		</PageShell>
	);
}
