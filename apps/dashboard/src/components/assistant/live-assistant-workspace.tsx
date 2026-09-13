"use client";

import { useTRPCClient } from "@/trpc/client";
import { useChat } from "@ai-sdk/react";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Input } from "@gnd/ui/input";
import { Textarea } from "@gnd/ui/textarea";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
	Archive,
	ArrowUp,
	Globe2,
	History,
	LoaderCircle,
	MessageSquare,
	Plus,
	RefreshCw,
	Search,
	Sparkles,
	Square,
	Trash2,
	WifiOff,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { parseAsString, useQueryStates } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AssistantArtifactCanvas } from "./assistant-artifact-canvas";
import {
	AssistantAttachmentPicker,
	useAssistantAttachments,
} from "./assistant-attachment-picker";
import {
	type AssistantAttachment,
	assistantAttachmentParts,
} from "./assistant-attachments";
import {
	assistantScrollBehavior,
	buildAssistantChatRequest,
	getAssistantIntegrationIdsForMessage,
	getAssistantRequestId,
	initialAssistantStreamState,
	parseAssistantRequestLimit,
	persistedMessagesToUi,
	reduceAssistantData,
	rotateAssistantRequestId,
	shouldStickToAssistantBottom,
	shouldSubmitAssistantComposerKey,
} from "./assistant-chat-state";
import { findAssistantDocumentEntity } from "./assistant-entities";
import { AssistantMessageRenderer } from "./assistant-message-renderer";
import type { AssistantResponseCardKind } from "./assistant-message-view-model";
import styles from "./assistant.module.css";
import { useAssistantEntityNavigation } from "./use-assistant-entity-navigation";
import { useAssistantToolInvalidation } from "./use-assistant-tool-invalidation";

type ConversationSummary = {
	id: string;
	title: string | null;
	updatedAt: Date | string;
	archivedAt: Date | string | null;
};

type LoadedConversation = ConversationSummary & {
	messages: UIMessage[];
	latestRun: { id: string; status: string; lastSequence: number } | null;
};

const activeStatuses = new Set([
	"queued",
	"running",
	"waiting_for_tool",
	"waiting_for_approval",
]);

const defaultSuggestions = [
	{
		id: "find-order-status" as const,
		title: "Find an order",
		description: "Check current status, customer, and next step.",
		prompt: "Find an order and show its current status and next step.",
	},
	{
		id: "customer-summary" as const,
		title: "Summarize a customer",
		description: "Review authorized customer and sales context.",
		prompt: "Summarize a customer’s recent authorized account activity.",
	},
	{
		id: "inventory-availability" as const,
		title: "Check inventory",
		description: "Find availability for a product or component.",
		prompt: "Check inventory availability for a product or component.",
	},
	{
		id: "create-document" as const,
		title: "Create a document",
		description: "Prepare a PDF from authorized workspace data.",
		prompt: "Help me create a PDF document from authorized workspace data.",
	},
];

function AssistantConversation(props: {
	conversation: LoadedConversation;
	pendingPrompt: {
		text: string;
		attachments: AssistantAttachment[];
	} | null;
	onPendingSent: () => void;
	onChanged: () => void;
	onOpenProviders: () => void;
	mentionedIntegrationIds: string[];
	onIntegrationsSent: () => void;
}) {
	const client = useTRPCClient();
	const [input, setInput] = useState("");
	const [online, setOnline] = useState(
		() => typeof navigator === "undefined" || navigator.onLine,
	);
	const [streamState, setStreamState] = useState(initialAssistantStreamState);
	const [reconnecting, setReconnecting] = useState(false);
	const attachmentState = useAssistantAttachments();
	const [requestLimitError, setRequestLimitError] = useState<{
		limit: number;
		remaining: number;
		resetAt: string;
	} | null>(null);
	const [artifactParams, setArtifactParams] = useQueryStates({
		assistantArtifact: parseAsString,
	});
	const mountedRef = useRef(true);
	const bodyRef = useRef<HTMLDivElement>(null);
	const bottomRef = useRef<HTMLDivElement>(null);
	const shouldStickRef = useRef(true);
	const requestIdsRef = useRef(new Map<string, string>());
	const integrationIdsRef = useRef(new Map<string, string[]>());

	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: "/api/assistant/chat",
				credentials: "same-origin",
				fetch: async (input, init) => {
					const response = await fetch(input, init);
					if (response.status === 429) {
						const limit = parseAssistantRequestLimit(
							await response
								.clone()
								.json()
								.catch(() => null),
						);
						if (limit) setRequestLimitError(limit);
					}
					return response;
				},
				prepareSendMessagesRequest: ({ messages }) => {
					const latestUser = [...messages]
						.reverse()
						.find((message) => message.role === "user");
					return {
						body: buildAssistantChatRequest(props.conversation.id, messages, {
							requestId: latestUser
								? getAssistantRequestId(requestIdsRef.current, latestUser.id)
								: undefined,
							mentionedIntegrationIds: latestUser
								? getAssistantIntegrationIdsForMessage(
										integrationIdsRef.current,
										latestUser.id,
										props.mentionedIntegrationIds,
									)
								: [],
						}),
					};
				},
			}),
		[props.conversation.id, props.mentionedIntegrationIds],
	);

	const chat = useChat({
		id: props.conversation.id,
		messages: props.conversation.messages,
		transport,
		onData: (part) => {
			setStreamState((state) => reduceAssistantData(state, part));
			if (part.type === "data-rate-limit") setRequestLimitError(null);
			if (
				part.type === "data-title" &&
				part.data &&
				typeof part.data === "object" &&
				"title" in part.data
			) {
				const title = String(part.data.title);
				void client.assistant.setTitle
					.mutate({ conversationId: props.conversation.id, title })
					.then(props.onChanged);
			}
		},
		onFinish: () => props.onChanged(),
	});
	const documentArtifact = useMemo(
		() =>
			findAssistantDocumentEntity(
				chat.messages,
				artifactParams.assistantArtifact,
			),
		[artifactParams.assistantArtifact, chat.messages],
	);
	const openDocument = useCallback(
		(document: NonNullable<typeof documentArtifact>) =>
			void setArtifactParams({ assistantArtifact: document.id }),
		[setArtifactParams],
	);
	const closeDocument = useCallback(
		() => void setArtifactParams({ assistantArtifact: null }),
		[setArtifactParams],
	);
	const openEntity = useAssistantEntityNavigation(openDocument);
	useAssistantToolInvalidation(chat.messages);

	useEffect(() => {
		const update = () => setOnline(navigator.onLine);
		window.addEventListener("online", update);
		window.addEventListener("offline", update);
		return () => {
			window.removeEventListener("online", update);
			window.removeEventListener("offline", update);
		};
	}, []);
	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);
	useEffect(() => {
		const latestRun = props.conversation.latestRun;
		if (!latestRun) return;
		setStreamState((state) => ({
			...state,
			runId: latestRun.id,
			status: latestRun.status,
			runSequence: latestRun.lastSequence,
		}));
	}, [props.conversation.latestRun]);

	const latestMessageId = chat.messages.at(-1)?.id;
	useEffect(() => {
		if ((latestMessageId || chat.status) && shouldStickRef.current) {
			bottomRef.current?.scrollIntoView({
				behavior: assistantScrollBehavior(
					window.matchMedia("(prefers-reduced-motion: reduce)").matches,
				),
				block: "nearest",
			});
		}
	}, [latestMessageId, chat.status]);

	useEffect(() => {
		if (!latestMessageId) return;
		const body = bodyRef.current;
		const messageContent = bottomRef.current?.parentElement;
		if (!body || !messageContent || typeof ResizeObserver === "undefined")
			return;
		const observer = new ResizeObserver(() => {
			if (!shouldStickRef.current) return;
			bottomRef.current?.scrollIntoView({
				behavior: assistantScrollBehavior(
					window.matchMedia("(prefers-reduced-motion: reduce)").matches,
				),
				block: "nearest",
			});
		});
		observer.observe(messageContent);
		return () => observer.disconnect();
	}, [latestMessageId]);

	useEffect(() => {
		if (!props.pendingPrompt) return;
		shouldStickRef.current = true;
		void chat.sendMessage({
			parts: [
				...(props.pendingPrompt.text
					? [{ type: "text" as const, text: props.pendingPrompt.text }]
					: []),
				...assistantAttachmentParts(props.pendingPrompt.attachments),
			],
		});
		props.onPendingSent();
		props.onIntegrationsSent();
	}, [
		chat.sendMessage,
		props.pendingPrompt,
		props.onPendingSent,
		props.onIntegrationsSent,
	]);

	const send = useCallback(() => {
		const value = input.trim();
		if (
			(!value && !attachmentState.attachments.length) ||
			!online ||
			attachmentState.uploading ||
			chat.status === "streaming" ||
			chat.status === "submitted"
		)
			return;
		shouldStickRef.current = true;
		setInput("");
		setRequestLimitError(null);
		chat.clearError();
		void chat.sendMessage({
			parts: [
				...(value ? [{ type: "text" as const, text: value }] : []),
				...assistantAttachmentParts(attachmentState.attachments),
			],
		});
		attachmentState.clear();
		props.onIntegrationsSent();
	}, [chat, input, online, attachmentState, props.onIntegrationsSent]);

	const reconnect = async () => {
		const run = streamState.runId
			? { id: streamState.runId }
			: props.conversation.latestRun;
		if (!run) return;
		setReconnecting(true);
		try {
			let messageSequence = streamState.messageSequence;
			let runSequence = streamState.runSequence;
			for (let attempt = 0; attempt < 60 && mountedRef.current; attempt += 1) {
				const params = new URLSearchParams({
					afterSequence: String(messageSequence),
					afterRunSequence: String(runSequence),
				});
				const response = await fetch(
					`/api/assistant/chat/runs/${encodeURIComponent(run.id)}?${params}`,
				);
				if (!response.ok)
					throw new Error("Unable to reconnect to this response");
				const result = (await response.json()) as {
					status: string;
					lastSequence: number;
					messages: Array<{
						id?: string;
						role?: string;
						parts?: unknown;
						sequence?: number;
					}>;
				};
				const received = persistedMessagesToUi(result.messages);
				if (received.length) {
					chat.setMessages((current) => {
						const byId = new Map(
							current.map((message) => [message.id, message]),
						);
						for (const message of received) byId.set(message.id, message);
						return [...byId.values()];
					});
				}
				messageSequence = Math.max(
					messageSequence,
					...result.messages.map((message) => message.sequence ?? 0),
				);
				runSequence = Math.max(runSequence, result.lastSequence ?? 0);
				setStreamState((state) => ({
					...state,
					status: result.status,
					messageSequence,
					runSequence,
				}));
				if (!activeStatuses.has(result.status)) break;
				await new Promise((resolve) => setTimeout(resolve, 1_000));
			}
			props.onChanged();
		} catch (error) {
			setStreamState((state) => ({
				...state,
				notice: error instanceof Error ? error.message : "Reconnect failed",
			}));
		} finally {
			setReconnecting(false);
		}
	};

	const busy = chat.status === "streaming" || chat.status === "submitted";
	const retryLatest = useCallback(
		(_kind?: AssistantResponseCardKind) => {
			shouldStickRef.current = true;
			const latestUser = [...chat.messages]
				.reverse()
				.find((message) => message.role === "user");
			if (latestUser) {
				rotateAssistantRequestId(requestIdsRef.current, latestUser.id);
			}
			chat.clearError();
			void chat.regenerate();
		},
		[chat],
	);
	const activeRun =
		props.conversation.latestRun &&
		activeStatuses.has(props.conversation.latestRun.status);
	return (
		<>
			<div
				ref={bodyRef}
				className={`${styles.body} ${chat.messages.length ? styles.withMessages : ""} ${documentArtifact ? styles.bodyCanvasOpen : ""}`}
				onScroll={(event) => {
					shouldStickRef.current = shouldStickToAssistantBottom({
						scrollHeight: event.currentTarget.scrollHeight,
						scrollTop: event.currentTarget.scrollTop,
						clientHeight: event.currentTarget.clientHeight,
					});
				}}
			>
				{chat.messages.length ? (
					<>
						<div
							className={styles.messages}
							role="log"
							aria-label="Assistant conversation"
						>
							{chat.messages.map((message) => (
								<AssistantMessageRenderer
									key={message.id}
									message={message}
									isStreaming={busy}
									isLastMessage={message.id === latestMessageId}
									onCardAction={
										message.id === latestMessageId ? retryLatest : undefined
									}
									onOpenEntity={openEntity}
								/>
							))}
							<div ref={bottomRef} />
						</div>
						{busy ? (
							<output className={styles.liveStatus}>
								<LoaderCircle className={styles.spin} size={14} />{" "}
								{chat.status === "submitted" ? "Connecting…" : "Working…"}
							</output>
						) : null}
					</>
				) : (
					<section className={styles.welcome}>
						<div className={styles.welcomeLabel}>
							<Sparkles size={19} /> YOUR GND ASSISTANT
						</div>
						<h1>
							Your work.
							<br />
							<span>A conversation away.</span>
						</h1>
						<p>
							Ask about an order, customer, inventory, production, or document.
							The assistant only uses actions your account can access.
						</p>
					</section>
				)}
			</div>
			<footer
				className={`${styles.composerArea} ${documentArtifact ? styles.composerCanvasOpen : ""}`}
				onDragOver={(event) => event.preventDefault()}
				onDrop={(event) => {
					event.preventDefault();
					void attachmentState.addFiles(Array.from(event.dataTransfer.files));
				}}
			>
				{!online ? (
					<div className={styles.liveWarning} role="alert">
						<WifiOff size={14} /> You’re offline. Your draft is safe; reconnect
						to send.
					</div>
				) : null}
				{chat.error && requestLimitError ? (
					<div className={styles.liveWarning} role="alert">
						<span>
							Request limit reached. You have {requestLimitError.remaining} of{" "}
							{requestLimitError.limit} requests left. Try again after{" "}
							{new Date(requestLimitError.resetAt).toLocaleString()}.
						</span>
					</div>
				) : chat.error ? (
					<div className={styles.liveWarning} role="alert">
						<span>The response stopped before it finished.</span>
						<Button size="sm" variant="outline" onClick={() => retryLatest()}>
							<RefreshCw size={13} /> Retry
						</Button>
					</div>
				) : null}
				{streamState.notice ? (
					<output className={styles.limitNotice}>{streamState.notice}</output>
				) : null}
				{activeRun && !busy ? (
					<output className={styles.liveWarning}>
						<span>A response was still running when this chat loaded.</span>
						<Button
							size="sm"
							variant="outline"
							disabled={reconnecting}
							onClick={reconnect}
						>
							<RefreshCw size={13} /> Reconnect
						</Button>
					</output>
				) : null}
				{streamState.rateLimit && streamState.rateLimit.remaining <= 10 ? (
					<div className={styles.limitNotice}>
						You have {streamState.rateLimit.remaining} of{" "}
						{streamState.rateLimit.limit} assistant requests left in this
						window.
					</div>
				) : null}
				<form
					className={styles.composer}
					onSubmit={(event) => {
						event.preventDefault();
						send();
					}}
				>
					<AssistantAttachmentPicker
						attachments={attachmentState.attachments}
						uploading={attachmentState.uploading}
						error={attachmentState.error}
						onAdd={(files) => void attachmentState.addFiles(files)}
						onRemove={attachmentState.remove}
					/>
					<Textarea
						value={input}
						onChange={(event) => setInput(event.target.value)}
						onPaste={(event) => {
							const files = Array.from(event.clipboardData.files);
							if (files.length) void attachmentState.addFiles(files);
						}}
						placeholder="Ask anything about your work…"
						aria-label="Message the assistant"
						rows={2}
						onKeyDown={(event) => {
							if (
								shouldSubmitAssistantComposerKey({
									key: event.key,
									shiftKey: event.shiftKey,
									isComposing: event.nativeEvent.isComposing,
								})
							) {
								event.preventDefault();
								send();
							}
						}}
					/>
					<div className={styles.composerBottom}>
						<span className={styles.contextButton}>
							GND workspace
							{props.mentionedIntegrationIds.length
								? ` + ${props.mentionedIntegrationIds.length} app`
								: ""}
						</span>
						<span className={styles.composerHint}>
							Shift + Enter for a new line
						</span>
						{busy ? (
							<Button
								type="button"
								size="icon"
								variant="outline"
								aria-label="Stop response"
								onClick={() => {
									setStreamState((state) => ({
										...state,
										status: "cancelling",
									}));
									chat.stop();
								}}
							>
								<Square size={15} />
							</Button>
						) : (
							<Button
								type="submit"
								size="icon"
								disabled={
									(!input.trim() && !attachmentState.attachments.length) ||
									!online ||
									attachmentState.uploading
								}
								aria-label="Send message"
							>
								<ArrowUp size={18} />
							</Button>
						)}
					</div>
				</form>
				<div className={styles.footerNote}>
					<button type="button" onClick={props.onOpenProviders}>
						<Globe2 size={11} /> Sources and connected apps
					</button>
					<span>
						{streamState.status
							? `Last action: ${streamState.status}`
							: "AI can make mistakes. Review business actions."}
					</span>
				</div>
			</footer>
			<AssistantArtifactCanvas
				document={documentArtifact}
				onClose={closeDocument}
			/>
		</>
	);
}

export function LiveAssistantWorkspace() {
	const client = useTRPCClient();
	const searchParams = useSearchParams();
	const [conversationId, setConversationId] = useState(() =>
		searchParams.get("chat"),
	);
	const [conversation, setConversation] = useState<LoadedConversation | null>(
		null,
	);
	const [history, setHistory] = useState<ConversationSummary[]>([]);
	const [historyError, setHistoryError] = useState<string | null>(null);
	const [historyOpen, setHistoryOpen] = useState(false);
	const [providersOpen, setProvidersOpen] = useState(false);
	const [providers, setProviders] = useState<{
		webSearch: {
			id: string;
			name: string;
			enabled: boolean;
			alwaysActive: true;
		};
		connectedApps: Array<{ id: string; name: string }>;
		managementUrl: string | null;
	}>({
		webSearch: {
			id: "web_search",
			name: "Web search",
			enabled: false,
			alwaysActive: true,
		},
		connectedApps: [],
		managementUrl: null,
	});
	const [mentionedIntegrationIds, setMentionedIntegrationIds] = useState<
		string[]
	>([]);
	const [suggestions, setSuggestions] =
		useState<
			Array<{
				id:
					| "find-order-status"
					| "customer-summary"
					| "inventory-availability"
					| "create-document";
				title: string;
				description: string;
				prompt: string;
			}>
		>(defaultSuggestions);
	const [search, setSearch] = useState("");
	const [loading, setLoading] = useState(Boolean(conversationId));
	const [error, setError] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [draft, setDraft] = useState("");
	const [pendingPrompt, setPendingPrompt] = useState<{
		conversationId: string;
		text: string;
		attachments: AssistantAttachment[];
	} | null>(null);
	const attachmentState = useAssistantAttachments();
	const requestedConversationId = searchParams.get("chat");
	const historyRequestRef = useRef(0);
	const conversationRequestRef = useRef(0);
	const startRequestRef = useRef(0);

	const updateUrl = useCallback((id: string | null) => {
		window.history.replaceState(
			null,
			"",
			id ? `/assistant?chat=${encodeURIComponent(id)}` : "/assistant",
		);
	}, []);

	const loadHistory = useCallback(
		async (value: string) => {
			const request = ++historyRequestRef.current;
			try {
				setHistoryError(null);
				const rows = await client.assistant.list.query({
					search: value || undefined,
					includeArchived: false,
					take: 50,
				});
				if (request !== historyRequestRef.current) return;
				setHistory(
					rows.flatMap((row) =>
						row.id
							? [
									{
										id: row.id,
										title: row.title ?? null,
										updatedAt: row.updatedAt ?? new Date(0),
										archivedAt: row.archivedAt ?? null,
									},
								]
							: [],
					),
				);
			} catch {
				if (request !== historyRequestRef.current) return;
				setHistory([]);
				setHistoryError("Conversation history could not be loaded.");
			}
		},
		[client],
	);

	const loadConversation = useCallback(
		async (id: string) => {
			const request = ++conversationRequestRef.current;
			setLoading(true);
			setError(null);
			try {
				const row = await client.assistant.get.query({ conversationId: id });
				if (request !== conversationRequestRef.current) return;
				if (!row.id) throw new Error("Conversation was not found");
				setConversation({
					id: row.id,
					title: row.title ?? null,
					updatedAt: row.updatedAt ?? new Date(0),
					archivedAt: row.archivedAt ?? null,
					messages: persistedMessagesToUi(row.messages),
					latestRun: row.latestRun?.id
						? {
								id: row.latestRun.id,
								status: row.latestRun.status ?? "unknown",
								lastSequence: row.latestRun.lastSequence ?? 0,
							}
						: null,
				});
			} catch {
				if (request !== conversationRequestRef.current) return;
				setPendingPrompt((pending) =>
					pending?.conversationId === id ? null : pending,
				);
				setConversation(null);
				setError(
					"This conversation is unavailable or you no longer have access.",
				);
			} finally {
				if (request === conversationRequestRef.current) setLoading(false);
			}
		},
		[client],
	);

	useEffect(() => {
		void loadHistory("");
	}, [loadHistory]);
	useEffect(() => {
		void client.assistant.providers
			.query()
			.then(setProviders)
			.catch(() => null);
		void client.assistant.suggestions
			.query()
			.then((availableSuggestions) => {
				if (availableSuggestions.length) setSuggestions(availableSuggestions);
			})
			.catch(() => null);
	}, [client]);
	useEffect(() => {
		if (conversationId === requestedConversationId) return;
		const currentUrlConversationId = new URL(
			window.location.href,
		).searchParams.get("chat");
		if (currentUrlConversationId === conversationId) return;
		startRequestRef.current += 1;
		setPendingPrompt(null);
		setMentionedIntegrationIds([]);
		setConversationId(requestedConversationId);
	}, [conversationId, requestedConversationId]);
	useEffect(() => {
		if (conversationId) void loadConversation(conversationId);
		else {
			conversationRequestRef.current += 1;
			setConversation(null);
			setLoading(false);
		}
	}, [conversationId, loadConversation]);

	const selectConversation = (id: string) => {
		startRequestRef.current += 1;
		setPendingPrompt(null);
		setMentionedIntegrationIds([]);
		attachmentState.discard();
		setConversationId(id);
		updateUrl(id);
		setHistoryOpen(false);
	};
	const newChat = () => {
		startRequestRef.current += 1;
		conversationRequestRef.current += 1;
		setConversationId(null);
		setConversation(null);
		setLoading(false);
		setPendingPrompt(null);
		setMentionedIntegrationIds([]);
		attachmentState.discard();
		setDraft("");
		setError(null);
		setActionError(null);
		updateUrl(null);
	};
	const start = async () => {
		const prompt = draft.trim();
		if (
			(!prompt && !attachmentState.attachments.length) ||
			attachmentState.uploading
		)
			return;
		const request = ++startRequestRef.current;
		setLoading(true);
		try {
			const created = await client.assistant.create.mutate({
				title: (
					prompt ||
					attachmentState.attachments[0]?.name ||
					"New chat"
				).slice(0, 80),
			});
			if (request !== startRequestRef.current) return;
			setDraft("");
			setPendingPrompt({
				conversationId: created.id,
				text: prompt,
				attachments: attachmentState.attachments,
			});
			attachmentState.clear();
			setConversationId(created.id);
			updateUrl(created.id);
			await loadHistory("");
		} catch {
			if (request !== startRequestRef.current) return;
			setError("A new conversation could not be created.");
			setLoading(false);
		}
	};
	const remove = async (kind: "archive" | "delete") => {
		if (!conversationId) return;
		setActionError(null);
		try {
			if (kind === "archive")
				await client.assistant.archive.mutate({
					conversationId,
					archived: true,
				});
			else await client.assistant.delete.mutate({ conversationId });
			newChat();
			await loadHistory("");
		} catch {
			setActionError(
				kind === "archive"
					? "This conversation could not be archived."
					: "This conversation could not be deleted.",
			);
		}
	};

	return (
		<main className={styles.workspace}>
			<nav className={styles.liveToolbar} aria-label="Conversation actions">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => {
						setHistoryOpen(true);
						void loadHistory(search);
					}}
				>
					<History size={16} /> History
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setProvidersOpen(true)}
				>
					<Globe2 size={16} /> Sources
				</Button>
				<Button variant="outline" size="sm" onClick={newChat}>
					<Plus size={16} /> New chat
				</Button>
				{conversationId ? (
					<>
						<Button
							variant="ghost"
							size="icon"
							aria-label="Archive conversation"
							onClick={() => void remove("archive")}
						>
							<Archive size={16} />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							aria-label="Delete conversation"
							onClick={() => void remove("delete")}
						>
							<Trash2 size={16} />
						</Button>
					</>
				) : null}
			</nav>
			{actionError ? (
				<div className={styles.actionError} role="alert">
					{actionError}
				</div>
			) : null}
			{loading ? (
				<output className={styles.shellState}>
					<LoaderCircle className={styles.spin} size={20} /> Loading
					conversation…
				</output>
			) : conversation ? (
				<AssistantConversation
					key={conversation.id}
					conversation={conversation}
					pendingPrompt={
						pendingPrompt?.conversationId === conversation.id
							? {
									text: pendingPrompt.text,
									attachments: pendingPrompt.attachments,
								}
							: null
					}
					onPendingSent={() =>
						setPendingPrompt((pending) =>
							pending?.conversationId === conversation.id ? null : pending,
						)
					}
					onChanged={() => {
						void loadConversation(conversation.id);
						void loadHistory("");
					}}
					onOpenProviders={() => setProvidersOpen(true)}
					mentionedIntegrationIds={mentionedIntegrationIds}
					onIntegrationsSent={() => setMentionedIntegrationIds([])}
				/>
			) : (
				<>
					<div className={styles.body}>
						<section className={styles.welcome}>
							<div className={styles.welcomeLabel}>
								<Sparkles size={19} /> YOUR GND ASSISTANT
							</div>
							<h1>
								Your work.
								<br />
								<span>A conversation away.</span>
							</h1>
							<p>
								Ask about an order, customer, inventory, production, or
								document. The assistant only uses actions your account can
								access.
							</p>
							<div className={styles.liveSuggestions}>
								{suggestions.map((suggestion) => (
									<button
										type="button"
										key={suggestion.title}
										onClick={() => {
											setDraft(suggestion.prompt);
											void client.assistant.recordSuggestionUse.mutate({
												id: suggestion.id,
											});
										}}
									>
										<strong>{suggestion.title}</strong>
										<span>{suggestion.description}</span>
									</button>
								))}
							</div>
							{error ? (
								<div className={styles.liveWarning} role="alert">
									{error}
								</div>
							) : null}
						</section>
					</div>
					<footer
						className={styles.composerArea}
						onDragOver={(event) => event.preventDefault()}
						onDrop={(event) => {
							event.preventDefault();
							void attachmentState.addFiles(
								Array.from(event.dataTransfer.files),
							);
						}}
					>
						<form
							className={styles.composer}
							onSubmit={(event) => {
								event.preventDefault();
								void start();
							}}
						>
							<AssistantAttachmentPicker
								attachments={attachmentState.attachments}
								uploading={attachmentState.uploading}
								error={attachmentState.error}
								onAdd={(files) => void attachmentState.addFiles(files)}
								onRemove={attachmentState.remove}
							/>
							<Textarea
								autoFocus
								value={draft}
								onChange={(event) => setDraft(event.target.value)}
								onPaste={(event) => {
									const files = Array.from(event.clipboardData.files);
									if (files.length) void attachmentState.addFiles(files);
								}}
								placeholder="Ask anything about your work…"
								aria-label="Message the assistant"
								rows={2}
								onKeyDown={(event) => {
									if (
										shouldSubmitAssistantComposerKey({
											key: event.key,
											shiftKey: event.shiftKey,
											isComposing: event.nativeEvent.isComposing,
										})
									) {
										event.preventDefault();
										void start();
									}
								}}
							/>
							<div className={styles.composerBottom}>
								<span className={styles.contextButton}>
									GND workspace
									{mentionedIntegrationIds.length
										? ` + ${mentionedIntegrationIds.length} app`
										: ""}
								</span>
								<span className={styles.composerHint}>
									Shift + Enter for a new line
								</span>
								<Button
									type="submit"
									size="icon"
									disabled={
										(!draft.trim() && !attachmentState.attachments.length) ||
										attachmentState.uploading
									}
									aria-label="Send message"
								>
									<ArrowUp size={18} />
								</Button>
							</div>
						</form>
					</footer>
				</>
			)}
			<Dialog open={providersOpen} onOpenChange={setProvidersOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Sources and connected apps</DialogTitle>
						<DialogDescription>
							Choose a connected app to mention in your next message. Web search
							is controlled by workspace policy.
						</DialogDescription>
					</DialogHeader>
					<div className={styles.providerList}>
						<div>
							<Globe2 size={17} />
							<span>
								<strong>{providers?.webSearch.name ?? "Web search"}</strong>
								<small>
									{providers?.webSearch.enabled
										? "Available for current public information"
										: "Not configured for this workspace"}
								</small>
							</span>
						</div>
						{providers?.connectedApps.map((provider) => {
							const selected = mentionedIntegrationIds.includes(provider.id);
							return (
								<button
									type="button"
									key={provider.id}
									aria-pressed={selected}
									onClick={() =>
										setMentionedIntegrationIds((current) =>
											selected
												? current.filter((id) => id !== provider.id)
												: [...current, provider.id],
										)
									}
								>
									<MessageSquare size={17} />
									<span>
										<strong>{provider.name}</strong>
										<small>
											{selected ? "Mentioned in next message" : "Mention app"}
										</small>
									</span>
								</button>
							);
						})}
						{!providers.connectedApps.length ? (
							<p className={styles.muted}>
								No connected-app provider is configured yet. Unavailable or
								forged mentions are rejected by the server.
							</p>
						) : null}
						{providers?.managementUrl ? (
							<a href={providers.managementUrl}>Manage connected apps</a>
						) : null}
					</div>
				</DialogContent>
			</Dialog>
			<Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
				<DialogContent className="max-h-[80dvh] overflow-y-auto sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>Conversation history</DialogTitle>
						<DialogDescription>
							Search and reopen your saved assistant conversations.
						</DialogDescription>
					</DialogHeader>
					<form
						className={styles.historySearch}
						onSubmit={(event) => {
							event.preventDefault();
							void loadHistory(search);
						}}
					>
						<Search size={15} />
						<Input
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search conversations…"
							aria-label="Search conversations"
						/>
					</form>
					<div className={styles.list}>
						{history.map((item) => (
							<button
								type="button"
								key={item.id}
								onClick={() => selectConversation(item.id)}
							>
								<MessageSquare size={16} />
								<span>
									<strong>{item.title || "Untitled conversation"}</strong>
									<small>{new Date(item.updatedAt).toLocaleString()}</small>
								</span>
							</button>
						))}
						{historyError ? (
							<p className={styles.liveWarning} role="alert">
								{historyError}
							</p>
						) : !history.length ? (
							<p className={styles.muted}>No matching conversations.</p>
						) : null}
					</div>
				</DialogContent>
			</Dialog>
		</main>
	);
}
