"use client";

import { AlertCircle, Check, CircleDashed, LockKeyhole } from "lucide-react";
import type { AssistantStreamState } from "./assistant-chat-state";
import { formatAssistantToolLabel } from "./assistant-message-view-model";
import styles from "./assistant.module.css";

function recoveredStatusLabel(status: string) {
	switch (status) {
		case "succeeded":
			return "Completed";
		case "failed":
			return "Failed";
		case "cancelled":
			return "Cancelled";
		case "pending":
		case "waiting_for_approval":
			return "Awaiting review";
		case "rejected":
			return "Declined";
		case "expired":
			return "Expired";
		case "unknown":
			return "Needs a status check";
		case "queued":
		case "running":
		case "executing":
		case "processing":
			return "In progress";
		default:
			return "Status recovered";
	}
}

function RecoveredStatusIcon({ status }: { status: string }) {
	if (status === "succeeded") return <Check size={13} aria-hidden="true" />;
	if (["failed", "cancelled", "unknown"].includes(status)) {
		return <AlertCircle size={13} aria-hidden="true" />;
	}
	if (["pending", "waiting_for_approval"].includes(status)) {
		return <LockKeyhole size={13} aria-hidden="true" />;
	}
	return <CircleDashed size={13} aria-hidden="true" />;
}

export function AssistantReconnectActivity({
	state,
}: {
	state: AssistantStreamState;
}) {
	const hasTerminalFailure =
		["failed", "cancelled"].includes(state.status ?? "");
	if (
		!state.toolExecutions.length &&
		!state.actionProposals.length &&
		!hasTerminalFailure
	) {
		return null;
	}
	const requiresFreshApproval = state.actionProposals.some((proposal) =>
		["pending", "waiting_for_approval"].includes(proposal.status),
	);
	const activities = [
		...state.toolExecutions.map((execution) => ({
			id: execution.id,
			eventSequence: execution.eventSequence,
			kind: "tool" as const,
			toolId: execution.toolId,
			status: execution.status,
		})),
		...state.actionProposals.map((proposal) => ({
			id: proposal.id,
			eventSequence: proposal.eventSequence,
			kind: "proposal" as const,
			toolId: proposal.toolId,
			status: proposal.status,
		})),
	]
		.sort((left, right) => left.eventSequence - right.eventSequence)
		.slice(-8);
	const hiddenCount =
		state.toolExecutions.length +
		state.actionProposals.length -
		activities.length;

	return (
		<aside
			className={styles.reconnectActivity}
			aria-label="Recovered Assistant activity"
		>
			<strong>Recovered activity</strong>
			{activities.length ? (
				<ul aria-label="Recovered tool and approval activity">
					{activities.map((activity) => (
						<li
							key={`${activity.kind}:${activity.id}`}
							data-status={activity.status}
						>
							<RecoveredStatusIcon status={activity.status} />
							<span>
								{activity.kind === "proposal" ? "Approval: " : ""}
								{formatAssistantToolLabel(activity.toolId)}
							</span>
							<small>{recoveredStatusLabel(activity.status)}</small>
						</li>
					))}
				</ul>
			) : null}
			{hiddenCount > 0 ? (
				<p>{hiddenCount} earlier activities are hidden.</p>
			) : null}
			{requiresFreshApproval ? (
				<p>For safety, start this approval again after reloading the page.</p>
			) : null}
			{hasTerminalFailure ? (
				<p role="alert">The recovered response did not finish successfully.</p>
			) : null}
		</aside>
	);
}
