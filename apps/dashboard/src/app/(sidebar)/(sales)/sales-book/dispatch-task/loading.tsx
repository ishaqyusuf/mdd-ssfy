import { DriverDashboardSkeleton } from "@/components/driver-dashboard/skeleton";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { PageTitle } from "@gnd/ui/custom/page-title";

export default function DispatchTasksLoading() {
	return (
		<PageShell className="p-4 pb-4 sm:p-6 sm:pb-4">
			<ScrollableContent>
				<PageTitle>Dispatch Tasks</PageTitle>
				<DriverDashboardSkeleton />
			</ScrollableContent>
		</PageShell>
	);
}
