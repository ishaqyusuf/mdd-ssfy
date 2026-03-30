import { ErrorFallback } from "@/components/error-fallback";
import { ProductionWorkspace } from "@/components/production-workspace";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { redirect } from "next/navigation";

import PageShell from "@/components/page-shell";
export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Production - gndprodesk.com",
	});
}
export default async function Page() {
	redirect("/sales-book/productions/v2"); // Temporary redirect to the new production page while we transition
	return (
		<PageShell className="">
			<ErrorBoundary errorComponent={ErrorFallback}>
				<ProductionWorkspace mode="admin" />
			</ErrorBoundary>
		</PageShell>
	);
}
