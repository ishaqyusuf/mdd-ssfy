import { ErrorFallback } from "@/components/error-fallback";
import { PrintLoading } from "@/components/print-loading";
import { PrintSalesV2 } from "@/components/print-sales-v2";

import { loadSalesPrintFilterParams } from "@/hooks/use-sales-print-filter";
import { batchPrefetch, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
export async function generateMetadata(props) {
	return constructMetadata({
		title: "Model Template Preview | GND",
	});
}
export default async function Page(props) {
	const searchParams = await props.searchParams;
	const filter = loadSalesPrintFilterParams(searchParams);
	batchPrefetch([
		trpc.print.salesV2.queryOptions({
			token: filter.token ?? "",
			accessToken: filter.accessToken ?? "",
			preview: filter.preview ?? false,
			templateId: filter.templateId ?? "template-2",
		}),
	]);

	return (
		<>
			<>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<PrintLoading />}>
						<PrintSalesV2 />
					</Suspense>
				</ErrorBoundary>
			</>
		</>
	);
}
