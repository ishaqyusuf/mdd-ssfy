import { DriverStopSkeleton } from "@/components/driver-dashboard/driver-stop-skeleton";
import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";

export default function DispatchStopLoading() {
	return (
		<PageShell className="p-0">
			<PageTitle>Dispatch Stop</PageTitle>
			<div className="min-h-[calc(100dvh-70px)]">
				<DriverStopSkeleton showWorkspaceHeader={false} />
			</div>
		</PageShell>
	);
}
