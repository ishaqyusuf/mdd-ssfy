import { getMailGridAction } from "./actions";
import ClientPage from "./client-page";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
export default async function MailGridPage() {
	const p = getMailGridAction();

	return (
		<PageShell>
			<PageTitle>Mail Templates</PageTitle>
			<ClientPage response={p} />
		</PageShell>
	);
}
