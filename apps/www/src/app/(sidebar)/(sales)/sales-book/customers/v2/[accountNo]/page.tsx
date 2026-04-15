import { AuthGuard } from "@/components/auth-guard";
import { CustomerOverviewV2Content } from "@/components/customer-v2/customer-overview-v2-content";
import PageShell from "@/components/page-shell";
import { _role } from "@/components/sidebar/links";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";

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
	const queryClient = getQueryClient();
	const initialOverviewData = await queryClient.fetchQuery(
		trpc.customer.getCustomerOverviewV2.queryOptions({
			accountNo: decodedAccountNo,
		}),
	);

	return (
		<PageShell>
			<HydrateClient>
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
						initialOverviewData={initialOverviewData as any}
					/>
				</AuthGuard>
			</HydrateClient>
		</PageShell>
	);
}
