import { ErrorBoundary } from "next/dist/client/components/error-boundary";

import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { ErrorFallback } from "@/components/error-fallback";
import { ProductionAdminBoardV2 } from "@/components/production-v2/shared";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Production v2 - gndprodesk.com",
	});
}

export default function Page() {
	return (
		<FPage can={["viewOrders"]} className="">
			<ErrorBoundary errorComponent={ErrorFallback}>
				<ProductionAdminBoardV2 />
			</ErrorBoundary>
		</FPage>
	);
}
