"use client";

import { useTRPC } from "@/trpc/client";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Icons } from "@gnd/ui/icons";
import { Spinner } from "@gnd/ui/spinner";
import { useQuery } from "@gnd/ui/tanstack";
import { format } from "date-fns";
import { useState } from "react";
import { SpecialOrderOverviewControls } from "../../special-order-overview-card";
import { SectionHeading } from "./section-heading";
import { getSpecialOrderSignalState } from "./special-order-signal";
import type { SalesOverviewData } from "./types";

export function FulfillmentSignalSection({
	data,
}: {
	data: SalesOverviewData;
}) {
	const trpc = useTRPC();
	const [open, setOpen] = useState(false);
	const specialOrder = data.specialOrder;
	const governed = specialOrder?.declaration === "YES";
	const signal = getSpecialOrderSignalState(
		specialOrder?.declaration,
		specialOrder?.status,
	);
	const historyQuery = useQuery(
		trpc.specialOrder.history.queryOptions(
			{ salesId: data.id },
			{ enabled: open && governed },
		),
	);
	const currentEvidence =
		historyQuery.data?.evidence.find(
			(entry) =>
				String(entry.id) === String(specialOrder?.currentApprovalId) &&
				!entry.supersededAt,
		) ??
		(signal.label === "Signed"
			? historyQuery.data?.evidence.find(
					(entry) =>
						entry.outcome === "APPROVED" &&
						entry.orderRevision === specialOrder?.revision &&
						!entry.supersededAt,
				)
			: undefined);

	return (
		<section
			className="flex flex-col gap-3"
			aria-labelledby="general-v2-fulfillment-signal"
		>
			<SectionHeading
				id="general-v2-fulfillment-signal"
				icon={Icons.Star}
				title="Fulfillment signal"
			/>
			<Collapsible open={open} onOpenChange={setOpen}>
				<CollapsibleTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						className="h-auto w-full justify-between px-0 py-1.5"
						aria-label={`${open ? "Hide" : "Show"} Special Order signature details`}
					>
						<span className="font-semibold">Special Order</span>
						<span className="flex items-center gap-2">
							<Badge variant={signal.variant}>{signal.label}</Badge>
							<Icons.ChevronDown
								aria-hidden="true"
								className={open ? "rotate-180" : undefined}
							/>
						</span>
					</Button>
				</CollapsibleTrigger>
				<CollapsibleContent className="pt-3">
					<div className="flex flex-col gap-3 border-l-2 border-muted px-3 py-1">
						<div className="grid grid-cols-2 gap-3 text-xs">
							<div className="flex flex-col gap-1">
								<span className="text-muted-foreground">Status</span>
								<strong>{signal.detail}</strong>
							</div>
							{currentEvidence ? (
								<>
									<div className="flex flex-col gap-1">
										<span className="text-muted-foreground">Signed</span>
										<strong>
											{format(
												new Date(currentEvidence.acknowledgedAt),
												"MMM d, yyyy h:mm a",
											)}
										</strong>
									</div>
									<div className="flex flex-col gap-1">
										<span className="text-muted-foreground">Name</span>
										<strong>
											{currentEvidence.customerName || "Not recorded"}
										</strong>
									</div>
								</>
							) : null}
						</div>

						{governed && historyQuery.isPending ? (
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<Spinner />
								Loading signature details
							</div>
						) : null}
						{governed && historyQuery.isError ? (
							<Alert variant="destructive">
								<AlertTitle>Signature details unavailable</AlertTitle>
								<AlertDescription>
									Close and expand this section to try again.
								</AlertDescription>
							</Alert>
						) : null}
						{currentEvidence?.hasSignature ? (
							<div className="flex flex-col gap-2">
								<span className="text-xs text-muted-foreground">Signature</span>
								<img
									src={`/api/sales/special-order/evidence/${currentEvidence.id}/signature`}
									alt={`Signature from ${currentEvidence.customerName || "customer"}`}
									className="max-h-28 w-auto max-w-full object-contain object-left"
									loading="lazy"
								/>
							</div>
						) : governed && !historyQuery.isPending ? (
							<p className="text-xs text-muted-foreground">
								{signal.label === "Signed"
									? "No signature image is available for the current approval."
									: "The current revision has not been signed."}
							</p>
						) : null}

						<SpecialOrderOverviewControls presentation="inline" />
					</div>
				</CollapsibleContent>
			</Collapsible>
		</section>
	);
}
