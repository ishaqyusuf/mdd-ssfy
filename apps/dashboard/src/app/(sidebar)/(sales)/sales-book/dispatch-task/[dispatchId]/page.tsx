import { DriverStopRoute } from "@/components/driver-dashboard/driver-stop-route";
import PageShell from "@/components/page-shell";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { notFound } from "next/navigation";

export async function generateMetadata() {
	return constructMetadata({ title: "Dispatch Stop | GND" });
}

export default async function DriverStopPage({
	params,
}: {
	params: Promise<{ dispatchId: string }>;
}) {
	const { dispatchId: value } = await params;
	const dispatchId = Number(value);
	if (!Number.isInteger(dispatchId) || dispatchId <= 0) notFound();

	return (
		<PageShell className="p-0">
			<PageTitle>Dispatch Stop</PageTitle>
			<div className="min-h-[calc(100dvh-70px)]">
				<DriverStopRoute dispatchId={dispatchId} />
			</div>
		</PageShell>
	);
}
