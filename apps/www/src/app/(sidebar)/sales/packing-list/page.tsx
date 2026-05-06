import { AuthGuard } from "@/components/auth-guard";
import PageShell from "@/components/page-shell";
import { _perm } from "@/components/sidebar-links";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { PackingListClient } from "./packing-list-client";

export const dynamic = "force-dynamic";

export default function PackingListPage() {
	return (
		<PageShell className="overflow-x-hidden p-3 sm:p-4 md:p-6">
			<PageTitle>Packing List</PageTitle>

			<PackingListClient />
		</PageShell>
	);
}
