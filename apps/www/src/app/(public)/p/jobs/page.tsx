import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { PrintJobs } from "@/components/print-jobs";
import { PrintLoading } from "@/components/print-loading";
import { loadJobsPrintFilterParams } from "@/hooks/use-jobs-print-filter";
import { batchPrefetch, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export async function generateMetadata() {
	return constructMetadata({
		title: "Selected Jobs Print | GND",
	});
}

export default async function Page(props) {
	const searchParams = await props.searchParams;
	const filter = loadJobsPrintFilterParams(searchParams);

	batchPrefetch([
		trpc.print.jobs.queryOptions({
			token: filter.token ?? "",
			preview: filter.preview ?? false,
		}),
	]);

	return (
		<PageShell>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<PrintLoading />}>
					<PrintJobs />
				</Suspense>
			</ErrorBoundary>
		</PageShell>
	);
}
