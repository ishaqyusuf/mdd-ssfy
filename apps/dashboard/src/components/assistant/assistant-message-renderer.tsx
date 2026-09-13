"use client";

import type { UIMessage } from "ai";
import {
	AlertCircle,
	Check,
	ChevronRight,
	CircleDashed,
	Copy,
	ExternalLink,
	FilePlus2,
	FileText,
	LoaderCircle,
	LockKeyhole,
	Sparkles,
} from "lucide-react";
import { memo, useState } from "react";
import type { ReactNode } from "react";
import { Streamdown } from "streamdown";
import {
	type AssistantMessageViewModel,
	normalizeAssistantMessage,
} from "./assistant-message-view-model";
import styles from "./assistant.module.css";

function AssistantThinkingIndicator() {
	return (
		<div className={styles.messageThinking} aria-label="Assistant is thinking">
			<span />
			<span />
			<span />
			Thinking
		</div>
	);
}

const toolStatusLabels: Record<
	AssistantMessageViewModel["tools"][number]["status"],
	string
> = {
	queued: "Queued",
	running: "Running",
	complete: "Complete",
	failed: "Failed",
	"approval-required": "Approval required",
};

function AssistantToolProgress({
	tools,
}: {
	tools: AssistantMessageViewModel["tools"];
}) {
	if (!tools.length) return null;
	const active = [...tools]
		.reverse()
		.find(({ status }) => status === "queued" || status === "running");
	if (active) {
		return (
			<div className={styles.toolProgress} data-status={active.status}>
				<LoaderCircle className={styles.spin} size={13} /> {active.label} —{" "}
				{toolStatusLabels[active.status]}
			</div>
		);
	}
	if (tools.length === 1) {
		const tool = tools[0];
		return (
			<div className={styles.toolProgress} data-status={tool?.status}>
				{tool?.status === "failed" ? (
					<AlertCircle size={13} />
				) : tool?.status === "approval-required" ? (
					<LockKeyhole size={13} />
				) : (
					<Check size={13} />
				)}
				{tool?.label} — {tool ? toolStatusLabels[tool.status] : ""}
			</div>
		);
	}
	const approvalCount = tools.filter(
		(tool) => tool.status === "approval-required",
	).length;
	const failedCount = tools.filter((tool) => tool.status === "failed").length;
	const SummaryIcon = approvalCount
		? LockKeyhole
		: failedCount
			? AlertCircle
			: Check;
	const summary = approvalCount
		? `${tools.length} tools · ${approvalCount} approval required`
		: failedCount
			? `${tools.length} tools · ${failedCount} failed`
			: `Used ${tools.length} tools`;
	return (
		<details className={styles.toolGroup}>
			<summary>
				<SummaryIcon size={13} /> {summary} <ChevronRight size={13} />
			</summary>
			<div>
				{tools.map((tool) => (
					<span key={tool.id} data-status={tool.status}>
						{tool.status === "failed" ? (
							<AlertCircle size={13} />
						) : tool.status === "approval-required" ? (
							<LockKeyhole size={13} />
						) : (
							<Check size={13} />
						)}
						{tool.label} — {toolStatusLabels[tool.status]}
					</span>
				))}
			</div>
		</details>
	);
}

function AssistantSources({
	sources,
}: {
	sources: AssistantMessageViewModel["sources"];
}) {
	if (!sources.length) return null;
	return (
		<section className={styles.messageSources} aria-label="Response sources">
			<strong>{sources.length === 1 ? "Source" : "Sources"}</strong>
			<div>
				{sources.map((source) =>
					source.url ? (
						<a
							key={source.id}
							href={source.url}
							target="_blank"
							rel="noreferrer"
						>
							<span>{source.label}</span>
							<small>
								{source.scope === "public" ? "Public" : "Workspace"}
								{source.freshness ? ` · ${source.freshness}` : ""}
								{source.observedAt ? ` · observed ${source.observedAt}` : ""}
							</small>
							<ExternalLink size={12} />
						</a>
					) : (
						<div key={source.id}>
							<span>{source.label}</span>
							<small>
								Workspace
								{source.observedAt ? ` · observed ${source.observedAt}` : ""}
							</small>
						</div>
					),
				)}
			</div>
		</section>
	);
}

function AssistantEntityLinks({
	entities,
	onOpen,
}: {
	entities: AssistantMessageViewModel["entities"];
	onOpen?: (entity: AssistantMessageViewModel["entities"][number]) => void;
}) {
	if (!entities.length || !onOpen) return null;
	return (
		<nav className={styles.entityLinks} aria-label="Related workspace records">
			{entities.map((entity) => (
				<button
					type="button"
					key={`${entity.kind}:${entity.id}`}
					onClick={() => onOpen(entity)}
				>
					<span>{entity.label}</span>
					<small>
						{entity.kind === "app" ? "Open page" : `Open ${entity.kind}`}
					</small>
					<ChevronRight size={14} />
				</button>
			))}
		</nav>
	);
}

function AssistantOrderDraftLinks({
	drafts,
	onOpen,
}: {
	drafts: AssistantMessageViewModel["orderDrafts"];
	onOpen?: (draft: AssistantMessageViewModel["orderDrafts"][number]) => void;
}) {
	if (!drafts.length || !onOpen) return null;
	return (
		<nav className={styles.entityLinks} aria-label="Generated Sales drafts">
			{drafts.map((draft) => (
				<button type="button" key={draft.id} onClick={() => onOpen(draft)}>
					<FilePlus2 size={15} />
					<span>
						Review {draft.data.type} draft
						<small>
							{draft.data.seed.lineItems.length} line item
							{draft.data.seed.lineItems.length === 1 ? "" : "s"} ·{" "}
							{draft.data.unresolvedCount} unresolved
						</small>
					</span>
					<ChevronRight size={14} />
				</button>
			))}
		</nav>
	);
}

function AssistantResponseCards({
	cards,
	onAction,
}: {
	cards: AssistantMessageViewModel["cards"];
	onAction?: (kind: AssistantMessageViewModel["cards"][number]["kind"]) => void;
}) {
	return cards.map((card, index) => (
		<aside
			key={`${card.kind}-${card.title}-${index}`}
			className={styles.responseCard}
			data-kind={card.kind}
		>
			{card.kind === "permission" ? (
				<LockKeyhole size={16} />
			) : card.kind === "empty" || card.kind === "ambiguity" ? (
				<CircleDashed size={16} />
			) : (
				<AlertCircle size={16} />
			)}
			<div>
				<strong>{card.title}</strong>
				{card.description ? <p>{card.description}</p> : null}
				{card.actionLabel && onAction ? (
					<button type="button" onClick={() => onAction(card.kind)}>
						{card.actionLabel}
					</button>
				) : null}
			</div>
		</aside>
	));
}

const assistantStreamdownComponents = {
	a: ({ href, children }: { href?: string; children?: ReactNode }) =>
		typeof href === "string" && href.startsWith("https://") ? (
			<a href={href} target="_blank" rel="noreferrer">
				{children}
			</a>
		) : (
			<span>{children}</span>
		),
	img: () => null,
};

function UserMessage({ message }: { message: UIMessage }) {
	const view = normalizeAssistantMessage(message, {
		isLastMessage: false,
		isStreaming: false,
	});
	return (
		<section className={styles.liveUserTurn}>
			<div className={styles.userMessage}>{view.text}</div>
			{view.files.length ? (
				<div className={styles.messageFiles}>
					{view.files.map((file) => (
						<span key={file.id}>
							<FileText size={13} /> {file.name}
						</span>
					))}
				</div>
			) : null}
		</section>
	);
}

function AssistantMessage({
	message,
	isStreaming,
	isLastMessage,
	onCardAction,
	onOpenEntity,
	onOpenOrderDraft,
}: {
	message: UIMessage;
	isStreaming: boolean;
	isLastMessage: boolean;
	onCardAction?: (
		kind: AssistantMessageViewModel["cards"][number]["kind"],
	) => void;
	onOpenEntity?: (
		entity: AssistantMessageViewModel["entities"][number],
	) => void;
	onOpenOrderDraft?: (
		draft: AssistantMessageViewModel["orderDrafts"][number],
	) => void;
}) {
	const [copied, setCopied] = useState(false);
	const view = normalizeAssistantMessage(message, {
		isStreaming,
		isLastMessage,
	});
	if (!view.hasContent && !view.showThinking) return null;
	return (
		<section className={styles.liveAssistantTurn}>
			<div className={styles.answerHeading}>
				<Sparkles size={16} />
				<strong>GND Assistant</strong>
				{view.reasoningStatus === "streaming" ? (
					<small>Reasoning…</small>
				) : null}
			</div>
			<div className={styles.liveAnswer}>
				{view.showThinking ? <AssistantThinkingIndicator /> : null}
				{view.text ? (
					<div className={styles.markdownAnswer}>
						<Streamdown
							isAnimating={isLastMessage && isStreaming}
							controls={{
								table: { copy: true, download: true, fullscreen: false },
							}}
							components={assistantStreamdownComponents}
						>
							{view.text}
						</Streamdown>
						<button
							type="button"
							className={styles.copyAnswer}
							onClick={() => {
								void navigator.clipboard.writeText(view.text).then(() => {
									setCopied(true);
									setTimeout(() => setCopied(false), 1_500);
								});
							}}
							aria-label="Copy assistant response"
						>
							{copied ? <Check size={13} /> : <Copy size={13} />}
							{copied ? "Copied" : "Copy"}
						</button>
					</div>
				) : null}
				<AssistantToolProgress tools={view.tools} />
				<AssistantResponseCards cards={view.cards} onAction={onCardAction} />
				<AssistantEntityLinks entities={view.entities} onOpen={onOpenEntity} />
				<AssistantOrderDraftLinks
					drafts={view.orderDrafts}
					onOpen={onOpenOrderDraft}
				/>
				<AssistantSources sources={view.sources} />
			</div>
		</section>
	);
}

const MemoizedAssistantMessage = memo(AssistantMessage, (previous, next) => {
	if (previous.isLastMessage || next.isLastMessage) return false;
	return (
		previous.message === next.message &&
		previous.onCardAction === next.onCardAction &&
		previous.onOpenEntity === next.onOpenEntity &&
		previous.onOpenOrderDraft === next.onOpenOrderDraft
	);
});

export function AssistantMessageRenderer(props: {
	message: UIMessage;
	isStreaming: boolean;
	isLastMessage: boolean;
	onCardAction?: (
		kind: AssistantMessageViewModel["cards"][number]["kind"],
	) => void;
	onOpenEntity?: (
		entity: AssistantMessageViewModel["entities"][number],
	) => void;
	onOpenOrderDraft?: (
		draft: AssistantMessageViewModel["orderDrafts"][number],
	) => void;
}) {
	if (props.message.role === "user") {
		return <UserMessage message={props.message} />;
	}
	return <MemoizedAssistantMessage {...props} />;
}
