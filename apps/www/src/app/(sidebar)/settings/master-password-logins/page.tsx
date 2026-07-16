import { ErrorFallback } from "@/components/error-fallback";
import { MasterPasswordLoginAuditPage } from "@/components/master-password-login-audit-page";
import PageShell from "@/components/page-shell";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function Page() {
	const queryClient = getQueryClient();
	await queryClient.fetchQuery(
		trpc.masterPasswordLoginAudits.list.queryOptions({
			size: 25,
		}),
	);

	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col gap-6 pt-6">
					<PageTitle>Master Password Logins</PageTitle>
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<div>Loading master password logins...</div>}>
							<MasterPasswordLoginAuditPage />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
