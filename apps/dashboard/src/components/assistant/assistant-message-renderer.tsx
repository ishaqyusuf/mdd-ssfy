"use client";

import type { UIMessage } from "ai";
import {
	AlertCircle,
	Check,
	ChevronDown,
	ChevronRight,
	ChevronUp,
	CircleDashed,
	Copy,
	ExternalLink,
	FilePlus2,
	FileText,
	LoaderCircle,
	LockKeyhole,
	Pencil,
	RefreshCw,
	Sparkles,
} from "lucide-react";
import { memo, useId, useState } from "react";
import type { ReactNode } from "react";
import { Streamdown } from "streamdown";
import { AssistantAnalyticsResultCard } from "./assistant-analytics-result";
import { AssistantOutcomeHelp } from "./assistant-outcome-help";
import { presentAssistantOutcome } from "@api/assistant/outcomes";
import { assistantFindingText } from "@api/assistant/finding-contract";
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

function AssistantToolProgress({
	tools,
}: {
	tools: AssistantMessageViewModel["tools"];
}) {
	const active = [...tools]
		.reverse()
		.find(({ status }) => status === "queued" || status === "running");
	if (active)
		return (
			<div className={styles.toolProgress} role="status">
				<LoaderCircle className={styles.spin} size={13} aria-hidden="true" />
				{active.label}…
			</div>
		);
	if (tools.some((tool) => tool.status === "approval-required"))
		return (
			<div className={styles.toolProgress}>
				<LockKeyhole size={13} aria-hidden="true" /> Please review before
				continuing.
			</div>
		);
	return null;
}

function AssistantReadRetries({
	tools,
	onRetry,
	consumedRetryIds,
}: {
	tools: AssistantMessageViewModel["tools"];
	onRetry?: (tool: AssistantMessageViewModel["tools"][number]) => void;
	consumedRetryIds?: ReadonlySet<string>;
}) {
	if (!onRetry) return null;
	const retryable = tools.filter(
		(tool) =>
			tool.status === "failed" &&
			tool.retryId &&
			!consumedRetryIds?.has(tool.retryId) &&
			tool.retryExpiresAt &&
			new Date(tool.retryExpiresAt).getTime() > Date.now(),
	);
	if (!retryable.length) return null;
	return (
		<div className={styles.toolProgress}>
			{retryable.map((tool) => (
				<button type="button" key={tool.id} onClick={() => onRetry(tool)}>
					<RefreshCw size={13} aria-hidden="true" /> Retry{" "}
					{tool.label.toLowerCase()}
				</button>
			))}
		</div>
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
					key={`${entity.kind}:${entity.kind === "order" ? (entity.salesType ?? "order") : entity.kind === "community" ? entity.communityType : ""}:${entity.id}`}
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

function AssistantApprovalActions({
	actions,
	onCreateProposal,
}: {
	actions: AssistantMessageViewModel["approvalActions"];
	onCreateProposal?: (
		action: AssistantMessageViewModel["approvalActions"][number],
	) => void;
}) {
	if (!actions.length || !onCreateProposal) return null;
	return (
		<nav className={styles.entityLinks} aria-label="Available reviewed actions">
			{actions.map((action) => (
				<button
					type="button"
					key={action.id}
					onClick={() => onCreateProposal(action)}
				>
					{action.data.toolId === "sales_update_purchase_order" ? (
						<Pencil size={15} />
					) : (
						<FilePlus2 size={15} />
					)}
					<span>
						{action.data.label}
						<small>Review the exact change before it runs</small>
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
	onAction?: (card: AssistantMessageViewModel["cards"][number]) => void;
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
					<button type="button" onClick={() => onAction(card)}>
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

function sanitizeAssistantMarkdownLinks(text: string) {
	return text.replace(
		/(?<!!)\[([^\]\n]+)\]\(([^)\n]+)\)/g,
		(link, label: string, destination: string) => {
			const href = destination.trim().split(/\s+/)[0];
			if (!href?.startsWith("https://")) return label;
			try {
				const hostname = new URL(href).hostname.toLowerCase();
				const isWorkspaceHost =
					hostname === "gndprodesk.com" ||
					hostname.endsWith(".gndprodesk.com") ||
					hostname === "localhost" ||
					hostname.endsWith(".localhost");
				return isWorkspaceHost ? label : link;
			} catch {
				return label;
			}
		},
	);
}

function CollapsibleMessageContent({
	children,
	text,
	enabled = true,
}: {
	children: ReactNode;
	text: string;
	enabled?: boolean;
}) {
	const [expanded, setExpanded] = useState(false);
	const contentId = useId();
	const canCollapse = text.length > 600 || text.split("\n").length > 8;
	const collapsed = enabled && canCollapse && !expanded;
	return (
		<>
			<div
				id={contentId}
				className={collapsed ? styles.collapsibleMessageCollapsed : undefined}
			>
				{children}
			</div>
			{enabled && canCollapse ? (
				<button
					type="button"
					className={styles.messageToggle}
					onClick={() => setExpanded((current) => !current)}
					aria-controls={contentId}
					aria-expanded={expanded}
				>
					{expanded ? "Show less" : "Show more"}
					{expanded ? (
						<ChevronUp size={14} aria-hidden="true" />
					) : (
						<ChevronDown size={14} aria-hidden="true" />
					)}
				</button>
			) : null}
		</>
	);
}

function UserMessage({ message }: { message: UIMessage }) {
	const view = normalizeAssistantMessage(message, {
		isLastMessage: false,
		isStreaming: false,
	});
	return (
		<section className={styles.liveUserTurn}>
			<div className={styles.userMessage}>
				<CollapsibleMessageContent text={view.text}>
					{view.text}
				</CollapsibleMessageContent>
			</div>
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
	onCreateApprovalProposal,
	onRetryRead,
	consumedRetryIds,
}: {
	message: UIMessage;
	isStreaming: boolean;
	isLastMessage: boolean;
	onCardAction?: (card: AssistantMessageViewModel["cards"][number]) => void;
	onOpenEntity?: (
		entity: AssistantMessageViewModel["entities"][number],
	) => void;
	onOpenOrderDraft?: (
		draft: AssistantMessageViewModel["orderDrafts"][number],
	) => void;
	onCreateApprovalProposal?: (
		action: AssistantMessageViewModel["approvalActions"][number],
	) => void;
	onRetryRead?: (tool: AssistantMessageViewModel["tools"][number]) => void;
	consumedRetryIds?: ReadonlySet<string>;
}) {
	const [copied, setCopied] = useState(false);
	const view = normalizeAssistantMessage(message, {
		isStreaming,
		isLastMessage,
	});
	const renderedText = sanitizeAssistantMarkdownLinks(view.text);
	if (!view.hasContent && !view.showThinking) return null;
	return (
		<section className={styles.liveAssistantTurn}>
			<div className={styles.answerHeading}>
				<Sparkles size={16} />
				<strong>GND Assistant</strong>
			</div>
			<div className={styles.liveAnswer}>
				{view.showThinking ? <AssistantThinkingIndicator /> : null}
				{view.text ? (
					<div className={styles.markdownAnswer}>
						<CollapsibleMessageContent
							text={renderedText}
							enabled={!isStreaming}
						>
							<Streamdown
								isAnimating={isLastMessage && isStreaming}
								controls={{
									table: { copy: true, download: true, fullscreen: false },
								}}
								components={assistantStreamdownComponents}
							>
								{renderedText}
							</Streamdown>
						</CollapsibleMessageContent>
						<button
							type="button"
							className={styles.copyAnswer}
							onClick={() => {
								void navigator.clipboard
									.writeText(
										[
											renderedText,
											...view.findings.map(assistantFindingText),
										].join("\n\n"),
									)
									.then(() => {
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
				{isStreaming ? <AssistantToolProgress tools={view.tools} /> : null}
				{!isStreaming ? (
					<AssistantReadRetries
						tools={view.tools}
						onRetry={onRetryRead}
						consumedRetryIds={consumedRetryIds}
					/>
				) : null}
				{view.outcome?.reference ? (
					<AssistantOutcomeHelp reference={view.outcome.reference} />
				) : null}
				{view.findings.length ? (
					<section
						className="mt-3 space-y-2 rounded-md border p-3 text-sm"
						aria-label="Completed checks"
					>
						<p className="font-medium">What I found</p>
						<ul className="space-y-2">
							{view.findings.map((finding) => (
								<li key={`${finding.salesType}:${finding.orderNo}`}>
									<p>{assistantFindingText(finding)}</p>
									<p className="text-xs text-muted-foreground">
										Checked {new Date(finding.observedAt).toLocaleString()}
									</p>
								</li>
							))}
						</ul>
					</section>
				) : null}
				{view.historyNotice ? (
					<aside className="mt-3 text-sm text-muted-foreground" role="status">
						{presentAssistantOutcome(view.historyNotice).message}
						{view.historyNotice.reference ? (
							<AssistantOutcomeHelp reference={view.historyNotice.reference} />
						) : null}
					</aside>
				) : null}
				{view.analytics.map((analytics) => (
					<AssistantAnalyticsResultCard
						key={analytics.id}
						result={analytics.data}
					/>
				))}
				<AssistantResponseCards cards={view.cards} onAction={onCardAction} />
				<AssistantEntityLinks entities={view.entities} onOpen={onOpenEntity} />
				<AssistantOrderDraftLinks
					drafts={view.orderDrafts}
					onOpen={onOpenOrderDraft}
				/>
				<AssistantApprovalActions
					actions={view.approvalActions}
					onCreateProposal={onCreateApprovalProposal}
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
		previous.onOpenOrderDraft === next.onOpenOrderDraft &&
		previous.onCreateApprovalProposal === next.onCreateApprovalProposal &&
		previous.onRetryRead === next.onRetryRead &&
		previous.consumedRetryIds === next.consumedRetryIds
	);
});

export function AssistantMessageRenderer(props: {
	message: UIMessage;
	isStreaming: boolean;
	isLastMessage: boolean;
	onCardAction?: (card: AssistantMessageViewModel["cards"][number]) => void;
	onOpenEntity?: (
		entity: AssistantMessageViewModel["entities"][number],
	) => void;
	onOpenOrderDraft?: (
		draft: AssistantMessageViewModel["orderDrafts"][number],
	) => void;
	onCreateApprovalProposal?: (
		action: AssistantMessageViewModel["approvalActions"][number],
	) => void;
	onRetryRead?: (tool: AssistantMessageViewModel["tools"][number]) => void;
	consumedRetryIds?: ReadonlySet<string>;
}) {
	if (props.message.role === "user") {
		return <UserMessage message={props.message} />;
	}
	return <MemoizedAssistantMessage {...props} />;
}
