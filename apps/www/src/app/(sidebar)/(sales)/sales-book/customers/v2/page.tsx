import { AuthGuard } from "@/components/auth-guard";
import { CustomerDirectoryV2Page } from "@/components/customer-v2/customer-directory-v2-page";
import PageShell from "@/components/page-shell";
import { loadCustomerFilterParams } from "@/hooks/use-customer-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { _role } from "@/components/sidebar-links";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import type { SearchParams } from "nuqs";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Customers V2 | GND",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function SalesCustomersV2Page(props: Props) {
	const searchParams = await props.searchParams;
	const queryClient = getQueryClient();
	const filter = loadCustomerFilterParams(searchParams);
	const [initialSummaryData, _initialCustomerRows] = await Promise.all([
		queryClient.fetchQuery(
			trpc.customer.getCustomerDirectoryV2Summary.queryOptions({}),
		),
		queryClient.fetchInfiniteQuery(
			trpc.sales.customersIndex.infiniteQueryOptions(filter) as any,
		),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<PageTitle>Sales Customers V2</PageTitle>
				<AuthGuard
					Fallback={
						<div className="rounded-xl border p-6 text-sm text-muted-foreground">
							You do not have access to this customer v2 workspace.
						</div>
					}
					rules={[_role.is("Super Admin")]}
				>
					<CustomerDirectoryV2Page
						initialSummaryData={initialSummaryData as any}
					/>
				</AuthGuard>
			</HydrateClient>
		</PageShell>
	);
}
