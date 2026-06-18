import { DealerOrderOverview } from "@/components/dealer-portal/dealer-order-overview";
import { DealershipShell } from "@/components/dealership-shell";
import PageShell from "@/components/page-shell";
import { requireDealer } from "@/lib/dealer-session";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DealerOrderPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const orderId = Number(id);
	if (!Number.isFinite(orderId)) notFound();
	const { dealer } = await requireDealer();
	const queryClient = getQueryClient();

	await queryClient.prefetchQuery(
		trpc.dealerPortal.salesDocument.queryOptions({ id: orderId }),
	);

	return (
		<DealershipShell dealer={dealer}>
			<PageShell>
				<HydrateClient>
					<DealerOrderOverview orderId={orderId} />
				</HydrateClient>
			</PageShell>
		</DealershipShell>
	);
}
