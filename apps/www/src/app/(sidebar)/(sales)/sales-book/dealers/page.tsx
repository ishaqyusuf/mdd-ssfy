import { AuthGuard } from "@/components/auth-guard";
import { DealersAdminPage } from "@/components/dealers/dealers-admin-page";
import PageShell from "@/components/page-shell";
import { _role } from "@/components/sidebar-links";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Dealers | GND",
	});
}

export default async function SalesDealersPage() {
	const queryClient = getQueryClient();

	await queryClient.prefetchQuery(
		trpc.dealer.list.queryOptions({
			size: 50,
		}),
	);

	return (
		<PageShell>
			<HydrateClient>
				<PageTitle>Dealers</PageTitle>
				<AuthGuard
					Fallback={
						<div className="rounded-lg border p-6 text-sm text-muted-foreground">
							You do not have access to dealer account management.
						</div>
					}
					rules={[_role.is("Super Admin")]}
				>
					<DealersAdminPage />
				</AuthGuard>
			</HydrateClient>
		</PageShell>
	);
}
