import { DriverStopModal } from "@/components/driver-dashboard/driver-stop-modal";
import { DriverStopSkeleton } from "@/components/driver-dashboard/driver-stop-skeleton";

export default function DispatchStopModalLoading() {
	return (
		<DriverStopModal>
			<DriverStopSkeleton showWorkspaceHeader />
		</DriverStopModal>
	);
}
