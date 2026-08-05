import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { SalesAccountingHeader } from "@/components/sales-accounting-header";
import { SalesFinanceAdoptionTracker } from "@/components/sales-finance/adoption";
import { DataTable } from "@/components/tables-2/sales-accounting/data-table";
import { SalesAccountingSkeleton } from "@/components/tables-2/sales-accounting/skeleton";
import { loadSalesAccountingFilterParams } from "@/hooks/use-sales-accounting-filter-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { buttonVariants } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { Icons } from "@gnd/ui/icons";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import Link from "next/link";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

type SalesAccountingInput = RouterInputs["sales"]["getSalesAccountings"];

type Props = {
	searchParams: Promise<SearchParams>;
	title?: string;
};

export async function SalesBookAccountingPage({
	searchParams,
	title = "Sales Accounting",
}: Props) {
	const resolvedSearchParams = await searchParams;
	const filter = loadSalesAccountingFilterParams(
		resolvedSearchParams,
	) as SalesAccountingInput;
	const initialSettings = await getInitialTableSettings("sales-accounting");

	batchPrefetch([
		trpc.sales.getSalesAccountings.infiniteQueryOptions(filter, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col gap-6">
					<SalesFinanceAdoptionTracker surface="legacy-accounting" />
					<PageTitle>{title}</PageTitle>
					<LegacyAccountingMigrationBanner />
					<SalesAccountingHeader />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense
							fallback={
								<SalesAccountingSkeleton initialSettings={initialSettings} />
							}
						>
							<DataTable initialSettings={initialSettings} />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}

function LegacyAccountingMigrationBanner() {
	return (
		<div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex min-w-0 gap-3">
				<Icons.Info
					className="mt-0.5 size-5 shrink-0 text-amber-700"
					aria-hidden="true"
				/>
				<div>
					<p className="font-medium">You’re using legacy Accounting.</p>
					<p className="mt-1 text-sm text-amber-900/80">
						Sales Finance is now the recommended workspace for sales-related
						financial operations.
					</p>
				</div>
			</div>
			<Link
				href="/sales-book/finance"
				className={cn(
					buttonVariants({ variant: "outline", size: "sm" }),
					"shrink-0 border-amber-300 bg-white text-amber-950 hover:bg-amber-100",
				)}
			>
				Go to Sales Finance
			</Link>
		</div>
	);
}
