import PageShell from "@/components/page-shell";
import { SalesFormAdoptionPage } from "@/components/sales-form-adoption-page";
import { ScrollableContent } from "@/components/scrollable-content";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";

export default function Page() {
	batchPrefetch([
		trpc.newSalesForm.adoption.queryOptions({
			days: 30,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex min-w-0 flex-col gap-4">
						<div>
							<PageTitle>Sales Form Adoption</PageTitle>
							<p className="mt-1 text-sm text-muted-foreground">
								Monitor saved form preferences and actual new-versus-legacy
								usage.
							</p>
						</div>
						<SalesFormAdoptionPage />
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
