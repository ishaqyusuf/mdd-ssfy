import { ErrorFallback } from "@/components/error-fallback";
import { MasterPasswordLoginAuditPage } from "@/components/master-password-login-audit-page";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { MasterPasswordLoginsSkeleton } from "@/components/tables-2/master-password-logins/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function Page() {
	const initialSettings = await getInitialTableSettings(
		"master-password-logins",
	);

	batchPrefetch([
		trpc.masterPasswordLoginAudits.list.queryOptions({
			size: 25,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4">
						<PageTitle>Master Password Logins</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<MasterPasswordLoginsSkeleton
										initialSettings={initialSettings}
									/>
								}
							>
								<MasterPasswordLoginAuditPage
									initialSettings={initialSettings}
								/>
							</Suspense>
						</ErrorBoundary>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
