import { ErrorFallback } from "@/components/error-fallback";
import { InventoryKindReviewPage } from "@/components/inventory/inventory-kind-review-page";
import PageShell from "@/components/page-shell";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";

export async function generateMetadata() {
	return constructMetadata({
		title: "Inventory Kind Review | GND",
	});
}

export default function Page() {
	return (
		<PageShell>
			<PageTitle>Inventory Kind Review</PageTitle>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<InventoryKindReviewPage />
			</ErrorBoundary>
		</PageShell>
	);
}
