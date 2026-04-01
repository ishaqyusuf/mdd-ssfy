import { AuthGuard } from "@/components/auth-guard";
import { CustomerDirectoryV2Page } from "@/components/customer-v2/customer-directory-v2-page";
import PageShell from "@/components/page-shell";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { _role } from "@/components/sidebar/links";
import { PageTitle } from "@gnd/ui/custom/page-title";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Customers V2 | GND",
	});
}

export default function SalesCustomersV2Page() {
	return (
		<PageShell>
			<PageTitle>Sales Customers V2</PageTitle>
			<AuthGuard
				Fallback={
					<div className="rounded-xl border p-6 text-sm text-muted-foreground">
						You do not have access to this customer v2 workspace.
					</div>
				}
				rules={[_role.is("Super Admin")]}
			>
				<CustomerDirectoryV2Page />
			</AuthGuard>
		</PageShell>
	);
}
