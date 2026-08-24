"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { DriverStopContent } from "./driver-stop-content";
import { DriverStopHeader } from "./driver-stop-header";
import type { DriverStopDetail } from "./driver-stop-types";
import { DriverStopFormContext } from "./driver-stop/form-context";

export function DriverStopWorkspace({
	dispatchId,
	modal = false,
}: {
	dispatchId: number;
	modal?: boolean;
}) {
	const trpc = useTRPC();
	const router = useRouter();
	const { data } = useSuspenseQuery(
		trpc.dispatch.manifest.queryOptions({ dispatchId }, { staleTime: 15_000 }),
	);
	const detail = data as DriverStopDetail;
	const close = () => {
		if (modal) {
			router.back();
			return;
		}
		router.replace("/sales-book/dispatch-task");
	};

	if (!detail.dispatch) {
		return (
			<div className="flex h-full min-h-[24rem] items-center justify-center bg-background p-6 text-center text-sm text-muted-foreground">
				This stop is no longer assigned to you.
			</div>
		);
	}

	return (
		<div className="flex h-full min-h-0 flex-col bg-background">
			<DriverStopHeader detail={detail} modal={modal} onClose={close} />
			<DriverStopFormContext
				dispatchId={detail.dispatch.id}
				defaultReceivedBy={
					detail.order.customer?.businessName || detail.order.customer?.name
				}
				defaultNoteType={
					detail.dispatch.deliveryMode === "pickup" ? "pickup" : "dispatch"
				}
			>
				<DriverStopContent detail={detail} onCompleted={close} />
			</DriverStopFormContext>
		</div>
	);
}
