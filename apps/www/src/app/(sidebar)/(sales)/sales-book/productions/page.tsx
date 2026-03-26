import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { ProductionWorkspace } from "@/components/production-workspace";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Production - gndprodesk.com",
	});
}
export default async function Page() {
	return (
		<FPage can={["viewOrders"]} className="">
			<ErrorBoundary errorComponent={ErrorFallback}>
				<ProductionWorkspace mode="admin" />
			</ErrorBoundary>
		</FPage>
	);
}
