import { getLoggedInProfile } from "@/actions/cache/get-loggedin-profile";
import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { AssistantAccessDataTable } from "@/components/tables-2/assistant-access/data-table";
import { AssistantAccessSkeleton } from "@/components/tables-2/assistant-access/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const metadata = constructMetadata({
	title: "Assistant Administration | GND",
});

export default async function AssistantAdministrationPage() {
	const profile = await getLoggedInProfile();
	if (profile.role?.toLowerCase() !== "super admin") redirect("/");
	await batchPrefetch([
		trpc.assistant.adminEntitlements.queryOptions({ take: 100 }),
	]);
	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6 pt-6">
						<div>
							<PageTitle>Assistant Administration</PageTitle>
							<p className="mt-1 text-sm text-muted-foreground">
								Control employee access and review each account's current
								status.
							</p>
						</div>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense fallback={<AssistantAccessSkeleton />}>
								<AssistantAccessDataTable />
							</Suspense>
						</ErrorBoundary>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
