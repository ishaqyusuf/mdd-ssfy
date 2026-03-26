import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { ProductionWorkspace } from "@/components/production-workspace";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Production - gndprodesk.com",
	});
}
export default async function SalesBookPage() {
	return (
		<FPage can={["viewProduction"]}>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<ProductionWorkspace mode="worker" />
			</ErrorBoundary>
		</FPage>
	);
}
