import { ErrorFallback } from "@/components/error-fallback";
import { _role } from "@/components/sidebar/links";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { TaskEventDetail } from "../_components/task-event-detail";

import PageShell from "@/components/page-shell";
type Props = {
	params: Promise<{
		eventName: string;
	}>;
};

export default async function Page(props: Props) {
	const params = await props.params;

	return (
		<PageShell>
			<div className="flex flex-col gap-6 pt-6">
				<PageTitle>Task Event</PageTitle>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<div>Loading event...</div>}>
						<TaskEventDetail eventName={params.eventName} />
					</Suspense>
				</ErrorBoundary>
			</div>
		</PageShell>
	);
}
