import { DriverStopModal } from "@/components/driver-dashboard/driver-stop-modal";
import { DriverStopRoute } from "@/components/driver-dashboard/driver-stop-route";
import { notFound } from "next/navigation";

export default async function DriverStopModalPage({
	params,
}: {
	params: Promise<{ dispatchId: string }>;
}) {
	const { dispatchId: value } = await params;
	const dispatchId = Number(value);
	if (!Number.isInteger(dispatchId) || dispatchId <= 0) notFound();

	return (
		<DriverStopModal>
			<DriverStopRoute dispatchId={dispatchId} modal />
		</DriverStopModal>
	);
}
