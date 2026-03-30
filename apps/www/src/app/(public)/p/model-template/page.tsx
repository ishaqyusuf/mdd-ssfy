import { ErrorFallback } from "@/components/error-fallback";
import { PrintLoading } from "@/components/print-loading";
import { PrintModelTemplate } from "@/components/print-model-template";
import { loadModelTemplatePrintFilterParams } from "@/hooks/use-model-template-print-filter-params";
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
	const filter = loadModelTemplatePrintFilterParams(searchParams);
	batchPrefetch([
		trpc.print.modelTemplate.queryOptions({
			...(filter as any),
		}),
	]);

	return (
		<PageShell>
			<>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<PrintLoading />}>
						<PrintModelTemplate />
					</Suspense>
				</ErrorBoundary>
			</>
		</PageShell>
	);
}
