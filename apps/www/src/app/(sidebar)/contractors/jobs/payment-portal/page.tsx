import { PaymentPortal } from "@/components/payment-dashboard/payment-portal";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Contractor Payment Portal | GND",
	});
}

export default async function ContractorsPaymentPortalPage() {
	const queryClient = getQueryClient();
	await queryClient.fetchQuery(trpc.jobs.paymentDashboard.queryOptions({}));

	return (
		<PageShell>
			<HydrateClient>
				<>
					<PageTitle>Contractor Payment Portal</PageTitle>
					<PaymentPortal />
				</>
			</HydrateClient>
		</PageShell>
	);
}
