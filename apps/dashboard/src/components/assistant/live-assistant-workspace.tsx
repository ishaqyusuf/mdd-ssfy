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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	buildAssistantChatRequest,
	initialAssistantStreamState,
	parseAssistantRequestLimit,
	persistedMessagesToUi,
	reduceAssistantData,
} from "./assistant-chat-state";
import styles from "./assistant.module.css";

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

function textFromMessage(message: UIMessage) {
	return message.parts
		.filter(
			(part): part is Extract<UIMessage["parts"][number], { type: "text" }> =>
				part.type === "text",
		)
		.map((part) => part.text)
		.join("\n");
}

function AssistantConversation(props: {
	conversation: LoadedConversation;
	pendingPrompt: string | null;
	onPendingSent: () => void;
	onChanged: () => void;
}) {
	const client = useTRPCClient();
	const [input, setInput] = useState("");
	const [online, setOnline] = useState(
		() => typeof navigator === "undefined" || navigator.onLine,
	);
	const [streamState, setStreamState] = useState(initialAssistantStreamState);
	const [reconnecting, setReconnecting] = useState(false);
	const [requestLimitError, setRequestLimitError] = useState<{
		limit: number;
		remaining: number;
		resetAt: string;
	} | null>(null);
	const mountedRef = useRef(true);
	const bottomRef = useRef<HTMLDivElement>(null);

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
				prepareSendMessagesRequest: ({ messages }) => ({
					body: buildAssistantChatRequest(props.conversation.id, messages),
				}),
			}),
		[props.conversation.id],
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
		if (latestMessageId || chat.status) {
			bottomRef.current?.scrollIntoView({
				behavior: "smooth",
				block: "nearest",
			});
		}
	}, [latestMessageId, chat.status]);

	useEffect(() => {
		if (!props.pendingPrompt) return;
		void chat.sendMessage({ text: props.pendingPrompt });
		props.onPendingSent();
	}, [chat.sendMessage, props.pendingPrompt, props.onPendingSent]);

	const send = useCallback(() => {
		const value = input.trim();
		if (
			!value ||
			!online ||
			chat.status === "streaming" ||
			chat.status === "submitted"
		)
			return;
		setInput("");
		setRequestLimitError(null);
		chat.clearError();
		void chat.sendMessage({ text: value });
	}, [chat, input, online]);

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
	const activeRun =
		props.conversation.latestRun &&
		activeStatuses.has(props.conversation.latestRun.status);
	return (
		<>
			<div
				className={`${styles.body} ${chat.messages.length ? styles.withMessages : ""}`}
			>
				{chat.messages.length ? (
					<div
						className={styles.messages}
						role="log"
						aria-live="polite"
						aria-label="Assistant conversation"
					>
						{chat.messages.map((message) => (
							<section
								key={message.id}
								className={
									message.role === "user"
										? styles.liveUserTurn
										: styles.liveAssistantTurn
								}
							>
								{message.role === "assistant" ? (
									<div className={styles.answerHeading}>
										<Sparkles size={16} />
										<strong>GND Assistant</strong>
									</div>
								) : null}
								<div
									className={
										message.role === "user"
											? styles.userMessage
											: styles.liveAnswer
									}
								>
									{textFromMessage(message) ||
										(message.role === "assistant" && busy ? "Thinking…" : "")}
								</div>
							</section>
						))}
						{busy ? (
							<output className={styles.liveStatus}>
								<LoaderCircle className={styles.spin} size={14} />{" "}
								{chat.status === "submitted" ? "Connecting…" : "Working…"}
							</output>
						) : null}
						<div ref={bottomRef} />
					</div>
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
			<footer className={styles.composerArea}>
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
						<Button
							size="sm"
							variant="outline"
							onClick={() => {
								chat.clearError();
								void chat.regenerate();
							}}
						>
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
					<Textarea
						value={input}
						onChange={(event) => setInput(event.target.value)}
						placeholder="Ask anything about your work…"
						aria-label="Message the assistant"
						rows={2}
						onKeyDown={(event) => {
							if (
								event.key === "Enter" &&
								!event.shiftKey &&
								!event.nativeEvent.isComposing
							) {
								event.preventDefault();
								send();
							}
						}}
					/>
					<div className={styles.composerBottom}>
						<span className={styles.contextButton}>GND workspace</span>
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
								disabled={!input.trim() || !online}
								aria-label="Send message"
							>
								<ArrowUp size={18} />
							</Button>
						)}
					</div>
				</form>
				<div className={styles.footerNote}>
					<span>Responses follow your current permissions</span>
					<span>
						{streamState.status
							? `Last action: ${streamState.status}`
							: "AI can make mistakes. Review business actions."}
					</span>
				</div>
			</footer>
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
	const [search, setSearch] = useState("");
	const [loading, setLoading] = useState(Boolean(conversationId));
	const [error, setError] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [draft, setDraft] = useState("");
	const [pendingPrompt, setPendingPrompt] = useState<{
		conversationId: string;
		prompt: string;
	} | null>(null);
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
		if (conversationId === requestedConversationId) return;
		const currentUrlConversationId = new URL(
			window.location.href,
		).searchParams.get("chat");
		if (currentUrlConversationId === conversationId) return;
		startRequestRef.current += 1;
		setPendingPrompt(null);
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
		setDraft("");
		setError(null);
		setActionError(null);
		updateUrl(null);
	};
	const start = async () => {
		const prompt = draft.trim();
		if (!prompt) return;
		const request = ++startRequestRef.current;
		setLoading(true);
		try {
			const created = await client.assistant.create.mutate({
				title: prompt.slice(0, 80),
			});
			if (request !== startRequestRef.current) return;
			setDraft("");
			setPendingPrompt({ conversationId: created.id, prompt });
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
							? pendingPrompt.prompt
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
							{error ? (
								<div className={styles.liveWarning} role="alert">
									{error}
								</div>
							) : null}
						</section>
					</div>
					<footer className={styles.composerArea}>
						<form
							className={styles.composer}
							onSubmit={(event) => {
								event.preventDefault();
								void start();
							}}
						>
							<Textarea
								autoFocus
								value={draft}
								onChange={(event) => setDraft(event.target.value)}
								placeholder="Ask anything about your work…"
								aria-label="Message the assistant"
								rows={2}
								onKeyDown={(event) => {
									if (
										event.key === "Enter" &&
										!event.shiftKey &&
										!event.nativeEvent.isComposing
									) {
										event.preventDefault();
										void start();
									}
								}}
							/>
							<div className={styles.composerBottom}>
								<span className={styles.contextButton}>GND workspace</span>
								<span className={styles.composerHint}>
									Shift + Enter for a new line
								</span>
								<Button
									type="submit"
									size="icon"
									disabled={!draft.trim()}
									aria-label="Send message"
								>
									<ArrowUp size={18} />
								</Button>
							</div>
						</form>
					</footer>
				</>
			)}
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
