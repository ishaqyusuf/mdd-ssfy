import { PaymentPortal } from "@/components/payment-dashboard/payment-portal";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";

import PageShell from "@/components/page-shell";
export async function generateMetadata() {
	return constructMetadata({
		title: "Contractor Payment Portal | GND",
	});
}

export default function ContractorsPaymentPortalPage() {
	return (
		<PageShell>
			<>
				<PageTitle>Contractor Payment Portal</PageTitle>
				<PaymentPortal />
			</>
		</PageShell>
	);
}
