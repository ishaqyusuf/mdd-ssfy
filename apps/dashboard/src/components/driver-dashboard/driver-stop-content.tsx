"use client";

import {
	DRIVER_STOP_URL_OPTIONS,
	useDriverDashboardParams,
} from "@/hooks/use-driver-dashboard-params";
import { useDriverDispatchActions } from "@/hooks/use-driver-dispatch-actions";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Textarea } from "@gnd/ui/textarea";
import { AlertTriangle, CircleHelp } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DriverPackingCommandDashboard } from "./driver-packing-command-dashboard";
import type { DriverStopDetail } from "./driver-stop-types";
import { DriverProofForm } from "./driver-stop/proof-form";

function HelpForm({ detail }: { detail: DriverStopDetail }) {
	const { setParams } = useDriverDashboardParams();
	const actions = useDriverDispatchActions();
	const [reasonCode, setReasonCode] = useState<
		| "wrong_address"
		| "customer_not_home"
		| "damaged_items"
		| "access_issue"
		| "other"
	>("wrong_address");
	const [notes, setNotes] = useState("");
	const reasons = [
		["wrong_address", "Wrong or missing address"],
		["customer_not_home", "Customer is not available"],
		["damaged_items", "Items are damaged"],
		["access_issue", "Cannot access destination"],
		["other", "Another issue"],
	] as const;

	return (
		<div className="space-y-5 p-4 sm:p-5">
			<Alert>
				<CircleHelp />
				<AlertTitle>Pause before taking another action</AlertTitle>
				<AlertDescription>
					Dispatch will see this request against the current stop. Keep the
					assignment open until you receive direction.
				</AlertDescription>
			</Alert>
			<fieldset className="space-y-2">
				<legend className="mb-2 text-sm font-medium">What happened?</legend>
				{reasons.map(([value, label]) => (
					<label
						key={value}
						className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${reasonCode === value ? "border-primary bg-primary/5" : ""}`}
					>
						<input
							type="radio"
							name="driver-help-reason"
							value={value}
							checked={reasonCode === value}
							onChange={() => setReasonCode(value)}
						/>
						{label}
					</label>
				))}
			</fieldset>
			<div className="space-y-2">
				<Label htmlFor="driver-help-notes">Details</Label>
				<Textarea
					id="driver-help-notes"
					value={notes}
					onChange={(event) => setNotes(event.target.value)}
					placeholder="Tell dispatch what you need"
					maxLength={5000}
				/>
			</div>
			<Button
				className="min-h-12 w-full"
				disabled={actions.reportException.isPending || !detail.dispatch}
				onClick={async () => {
					if (!detail.dispatch) return;
					try {
						await actions.reportException.mutateAsync({
							dispatchId: detail.dispatch.id,
							reasonCode,
							notes: notes.trim() || undefined,
							requestId: `driver-help:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`,
						});
						toast.success("Dispatch has been notified.");
						void setParams({ mode: "details" }, DRIVER_STOP_URL_OPTIONS);
					} catch (error) {
						toast.error(
							error instanceof Error
								? error.message
								: "Unable to send the help request.",
						);
					}
				}}
			>
				<AlertTriangle className="mr-2 size-4" />
				{actions.reportException.isPending
					? "Notifying dispatch…"
					: "Send help request"}
			</Button>
		</div>
	);
}

export function DriverStopContent({
	detail,
	onCompleted,
}: {
	detail: DriverStopDetail;
	onCompleted: () => void;
}) {
	const { params, setParams } = useDriverDashboardParams();
	const status = detail.dispatch?.status;
	const canCaptureProof = status === "in progress";
	const canReportException = !["completed", "cancelled"].includes(
		String(status),
	);

	useEffect(() => {
		if (
			(params.mode === "proof" && !canCaptureProof) ||
			(params.mode === "help" && !canReportException)
		) {
			void setParams({ mode: "details" }, DRIVER_STOP_URL_OPTIONS);
		}
	}, [canCaptureProof, canReportException, params.mode, setParams]);

	if (params.mode === "proof" && detail.dispatch && canCaptureProof) {
		return (
			<ScrollArea className="min-h-0 flex-1">
				<DriverProofForm
					dispatchId={detail.dispatch.id}
					onCompleted={onCompleted}
				/>
			</ScrollArea>
		);
	}

	if (params.mode === "help" && canReportException) {
		return (
			<ScrollArea className="min-h-0 flex-1">
				<HelpForm detail={detail} />
			</ScrollArea>
		);
	}

	return (
		<DriverPackingCommandDashboard detail={detail} onCompleted={onCompleted} />
	);
}
