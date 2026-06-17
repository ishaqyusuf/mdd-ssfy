/** @jsxImportSource react */
"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import type { WorkflowPanelStatus } from "./workflow-query-state";

export type WorkflowPanelNoticeProps = WorkflowPanelStatus & {
	actionLabel?: string;
	onRetry?: () => void;
};

export function WorkflowPanelNotice(props: WorkflowPanelNoticeProps) {
	const isError = props.tone === "error";

	return (
		<div
			className={`rounded-lg border px-4 py-3 text-sm ${
				isError
					? "border-destructive/30 bg-destructive/5 text-destructive"
					: "border-border bg-muted/30 text-muted-foreground"
			}`}
			role={isError ? "alert" : "status"}
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0 space-y-1">
					<p className="font-semibold">{props.title}</p>
					<p className={isError ? "text-destructive/80" : ""}>
						{props.description}
					</p>
				</div>
				{props.onRetry ? (
					<Button
						type="button"
						size="sm"
						variant={isError ? "destructive" : "outline"}
						className="shrink-0 gap-2"
						onClick={props.onRetry}
					>
						<Icons.RefreshCw className="size-4" />
						{props.actionLabel || "Refresh"}
					</Button>
				) : null}
			</div>
		</div>
	);
}
