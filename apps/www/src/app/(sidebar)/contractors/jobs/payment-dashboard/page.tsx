import { PaymentDashboard } from "@/components/payment-dashboard";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Contractor Payment Dashboard | GND",
	});
}

export default async function ContractorsPaymentDashboardPage() {
	const queryClient = getQueryClient();
	await queryClient.fetchQuery(trpc.jobs.paymentDashboard.queryOptions({}));

	return (
		<PageShell>
			<HydrateClient>
				{" "}
				<PaymentDashboard />
			</HydrateClient>
		</PageShell>
	);
}
