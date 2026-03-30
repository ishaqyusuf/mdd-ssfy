import { ErrorBoundary } from "next/dist/client/components/error-boundary";

import { ErrorFallback } from "@/components/error-fallback";
import { ProductionAdminBoardV2 } from "@/components/production-v2/shared";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { PageTitle } from "@gnd/ui/custom/page-title";

import PageShell from "@/components/page-shell";
export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Production v2 - gndprodesk.com",
	});
}

export default function Page() {
	return (
		<PageShell className="">
			<PageTitle>Sales Production</PageTitle>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<ProductionAdminBoardV2 />
			</ErrorBoundary>
		</PageShell>
	);
}
