import { AuthGuard } from "@/components/auth-guard";
import { CustomerOverviewV2Content } from "@/components/customer-v2/customer-overview-v2-content";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { _role } from "@/components/sidebar-links";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Customer Overview V2 | GND",
	});
}

export default async function CustomerOverviewV2Page({
	params,
}: {
	params: Promise<{ accountNo: string }>;
}) {
	const { accountNo } = await params;
	const decodedAccountNo = decodeURIComponent(accountNo);
	const customerOverviewSalesPreviewInitialSettings =
		await getInitialTableSettings("customer-overview-sales-preview");

	batchPrefetch([
		trpc.customers.getCustomerOverviewV2.queryOptions({
			accountNo: decodedAccountNo,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<PageTitle>Customer Overview V2</PageTitle>
					<AuthGuard
						Fallback={
							<div className="rounded-xl border p-6 text-sm text-muted-foreground">
								You do not have access to this customer v2 workspace.
							</div>
						}
						rules={[_role.is("Super Admin")]}
					>
						<CustomerOverviewV2Content
							accountNo={decodedAccountNo}
							customerOverviewSalesPreviewInitialSettings={
								customerOverviewSalesPreviewInitialSettings
							}
						/>
					</AuthGuard>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
