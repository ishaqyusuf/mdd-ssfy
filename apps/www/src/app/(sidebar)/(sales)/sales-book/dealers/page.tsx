import { AuthGuard } from "@/components/auth-guard";
import { DealersAdminPage } from "@/components/dealers/dealers-admin-page";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { _role } from "@/components/sidebar-links";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import type { SearchParams } from "nuqs";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Dealers | GND",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function SalesDealersPage(props: Props) {
	const searchParams = await props.searchParams;
	const search = Array.isArray(searchParams.search)
		? searchParams.search.at(-1)
		: searchParams.search;
	const initialSettings = await getInitialTableSettings("dealers");

	const queryClient = getQueryClient();
	await Promise.all([
		queryClient.fetchQuery(
			trpc.dealer.list.queryOptions({
				search: search || null,
				size: 50,
			}),
		),
		queryClient.fetchQuery(trpc.dealer.salesProfiles.queryOptions()),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<PageTitle>Dealers</PageTitle>
					<AuthGuard
						Fallback={
							<div className="rounded-lg border p-6 text-sm text-muted-foreground">
								You do not have access to dealer account management.
							</div>
						}
						rules={[_role.is("Super Admin")]}
					>
						<DealersAdminPage initialSettings={initialSettings} />
					</AuthGuard>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
