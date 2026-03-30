import PageClient from "./page.client";

import PageShell from "@/components/page-shell";
export default function Page({}) {
	return (
		<PageShell>
			<div>
				<PageClient />
			</div>
		</PageShell>
	);
}
