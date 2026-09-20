"use client";

import { useTRPC, useTRPCClient } from "@/trpc/client";
import { useChat } from "@ai-sdk/react";
import { assistantErrorReference } from "@api/assistant/diagnostic-contract";
import {
	type AssistantOutcome,
	assistantOutcomeSchema,
	presentAssistantOutcome,
} from "@api/assistant/outcomes";
import { assistantReconnectResponseSchema } from "@api/schemas/assistant";
import { Button } from "@gnd/ui/button";
import { PageTitle } from "@gnd/ui/custom/page-title";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@gnd/ui/empty";
import { Input } from "@gnd/ui/input";
import { useQuery } from "@gnd/ui/tanstack";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
	Globe2,
	LoaderCircle,
	MessageSquare,
	RefreshCw,
	Search,
	WifiOff,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseAsString, useQueryStates } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	type AssistantApprovalReview,
	assistantDocumentApprovalSummary,
	parseAssistantApprovalReview,
} from "./assistant-approval-review";
import { AssistantArtifactCanvas } from "./assistant-artifact-canvas";
import { useAssistantAttachments } from "./assistant-attachment-picker";
import {
	type AssistantAttachment,
	assistantAttachmentParts,
} from "./assistant-attachments";
import {
	activateAssistantRunState,
	assistantScrollBehavior,
	buildAssistantChatRequest,
	claimAssistantPendingPrompt,
	getAssistantIntegrationIdsForMessage,
	getAssistantRequestId,
	hydrateAssistantReconnectState,
	initialAssistantStreamState,
	parseAssistantQuotaLimit,
	parseAssistantRequestLimit,
	persistedMessagesToUi,
	reduceAssistantData,
	rotateAssistantRequestId,
	shouldStickToAssistantBottom,
} from "./assistant-chat-state";
import { readAssistantContextPrompt } from "./assistant-context";
import { findAssistantDocumentEntity } from "./assistant-entities";
import { AssistantFeatureRequestsDialog } from "./assistant-feature-requests-dialog";
import { AssistantHeader } from "./assistant-header";
import {
	AssistantInput,
	type AssistantInputSuggestion,
} from "./assistant-input";
import { AssistantMessageBoundary } from "./assistant-message-boundary";
import { AssistantMessageRenderer } from "./assistant-message-renderer";
import {
	type AssistantMessageViewModel,
	normalizeAssistantMessage,
} from "./assistant-message-view-model";
import {
	type AssistantOrderDraft,
	AssistantOrderDraftCanvas,
} from "./assistant-order-draft-canvas";
import { AssistantOutcomeHelp } from "./assistant-outcome-help";
import { AssistantReconnectActivity } from "./assistant-reconnect-activity";
import { AssistantSalesRequestQuestionnaire } from "./assistant-sales-request-questionnaire";
import { AssistantSavedActionsDialog } from "./assistant-saved-actions-dialog";
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

type PendingAssistantApproval = {
	proposalId: string;
	confirmationRequestId: string;
	requiresStatusCheck: boolean;
	approvalToken: string;
	expiresAt: Date | string;
	review: AssistantApprovalReview;
	summary: ReturnType<typeof assistantDocumentApprovalSummary>;
};

type PendingAssistantPrompt = {
	id: string;
	conversationId: string | null;
	text: string;
	attachments: AssistantAttachment[];
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
		id: string;
		text: string;
		attachments: AssistantAttachment[];
	} | null;
	onPendingSent: () => void;
	onChanged: () => void;
	onOpenProviders: () => void;
	suggestions: AssistantInputSuggestion[];
	connectedApps: Array<{ id: string; name: string }>;
	mentionedIntegrationIds: string[];
	onToggleIntegration: (id: string) => void;
	onIntegrationsSent: () => void;
	onSuccessfulRun: (runId: string | null) => void;
	onFeatureRequest: (input: {
		summary: string;
		runId: string | null;
		messageId: string;
	}) => void;
	initialSalesRequestType: "order" | "quote" | null;
}) {
	const client = useTRPCClient();
	const [input, setInput] = useState("");
	const [salesRequestType, setSalesRequestType] = useState(
		props.initialSalesRequestType,
	);
	const [salesRequestBusy, setSalesRequestBusy] = useState(false);
	const [salesRequestError, setSalesRequestError] = useState<string | null>(
		null,
	);
	const [salesRequestRefresh, setSalesRequestRefresh] = useState(0);
	const salesRequestIdRef = useRef<string | null>(null);
	const [online, setOnline] = useState(
		() => typeof navigator === "undefined" || navigator.onLine,
	);
	const [streamState, setStreamState] = useState(initialAssistantStreamState);
	const [reconnecting, setReconnecting] = useState(false);
	const [pendingApproval, setPendingApproval] =
		useState<PendingAssistantApproval | null>(null);
	const [approvalBusy, setApprovalBusy] = useState(false);
	const [approvalNotice, setApprovalNotice] = useState<string | null>(null);
	const [approvalReference, setApprovalReference] = useState<string | null>(
		null,
	);
	const [readRetryBusy, setReadRetryBusy] = useState(false);
	const [readRetryNotice, setReadRetryNotice] = useState<string | null>(null);
	const attachmentState = useAssistantAttachments(props.conversation.id);
	const [requestOutcome, setRequestOutcome] = useState<AssistantOutcome | null>(
		null,
	);
	const [requestLimitError, setRequestLimitError] = useState<{
		limit: number;
		remaining: number;
		resetAt: string;
	} | null>(null);
	const [quotaLimitError, setQuotaLimitError] = useState<{
		dimension: string;
		limit: number;
		remaining: number;
		resetAt: string;
	} | null>(null);
	const [orderDraft, setOrderDraft] = useState<AssistantOrderDraft | null>(
		null,
	);
	const [artifactParams, setArtifactParams] = useQueryStates({
		assistantArtifact: parseAsString,
	});
	const mountedRef = useRef(true);
	const bodyRef = useRef<HTMLDivElement>(null);
	const bottomRef = useRef<HTMLDivElement>(null);
	const shouldStickRef = useRef(true);
	const requestIdsRef = useRef(new Map<string, string>());
	const transportAttemptRef = useRef(0);
	const submittedTextRef = useRef("");
	const integrationIdsRef = useRef(new Map<string, string[]>());
	const sentPendingPromptIdsRef = useRef(new Set<string>());

	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: "/api/assistant/chat",
				credentials: "same-origin",
				fetch: async (input, init) => {
					const attempt = ++transportAttemptRef.current;
					const submittedText = submittedTextRef.current;
					setRequestOutcome(null);
					let response: Response;
					try {
						response = await fetch(input, init);
					} catch (error) {
						if (!init?.signal?.aborted) {
							void client.assistant.reportClientFailure
								.mutate({
									eventId: crypto.randomUUID(),
									conversationId: props.conversation.id,
									stage: "transport",
								})
								.then((report) => {
									if (
										mountedRef.current &&
										transportAttemptRef.current === attempt
									)
										setRequestOutcome({
											kind: "uncertain",
											reference: report.reference,
										});
								})
								.catch(() => undefined);
						}
						throw error;
					}
					if (!response.ok) {
						const body = await response
							.clone()
							.json()
							.catch(() => null);
						const parsed = assistantOutcomeSchema.safeParse(body?.outcome);
						if (parsed.success) setRequestOutcome(parsed.data);
						if (
							response.status === 401 &&
							mountedRef.current &&
							transportAttemptRef.current === attempt
						) {
							setRequestOutcome(
								parsed.success ? parsed.data : { kind: "signed-out" },
							);
							// Restore the rejected text without overwriting a newer draft.
							setInput((current) => current || submittedText);
						}
					}
					if (response.status === 429) {
						const body = await response
							.clone()
							.json()
							.catch(() => null);
						const quota = parseAssistantQuotaLimit(body);
						if (quota) setQuotaLimitError(quota);
						else {
							const limit = parseAssistantRequestLimit(body);
							if (limit) setRequestLimitError(limit);
						}
					}
					return response;
				},
				prepareSendMessagesRequest: ({ messages }) => {
					const latestUser = [...messages]
						.reverse()
						.find((message) => message.role === "user");
					submittedTextRef.current =
						latestUser?.parts
							.flatMap((part) => (part.type === "text" ? [part.text] : []))
							.join("\n") ?? "";
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
		[client, props.conversation.id, props.mentionedIntegrationIds],
	);

	const chat = useChat({
		id: props.conversation.id,
		messages: props.conversation.messages,
		transport,
		onData: (part) => {
			setStreamState((state) => reduceAssistantData(state, part));
			if (part.type === "data-rate-limit") {
				setRequestLimitError(null);
				setQuotaLimitError(null);
			}
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
		(document: NonNullable<typeof documentArtifact>) => {
			setOrderDraft(null);
			return void setArtifactParams({ assistantArtifact: document.id });
		},
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
		setStreamState((state) => activateAssistantRunState(state, latestRun));
	}, [props.conversation.latestRun]);
	useEffect(() => {
		if (streamState.status === "succeeded" && streamState.runId) {
			const runId = streamState.runId;
			let current = true;
			client.assistant.savedActionEligibility
				.query({ runId })
				.then(({ eligible }) => {
					if (current) props.onSuccessfulRun(eligible ? runId : null);
				})
				.catch(() => {
					if (current) props.onSuccessfulRun(null);
				});
			return () => {
				current = false;
			};
		}
		props.onSuccessfulRun(null);
	}, [client, props.onSuccessfulRun, streamState.runId, streamState.status]);

	const latestMessageId = chat.messages.at(-1)?.id;
	const consumedReadRetryIds = useMemo(() => {
		const consumed = new Set<string>();
		for (const message of chat.messages) {
			for (const part of message.parts) {
				if (
					part &&
					typeof part === "object" &&
					"type" in part &&
					part.type === "data-assistant-read-retry" &&
					"data" in part &&
					part.data &&
					typeof part.data === "object" &&
					"retryId" in part.data &&
					typeof part.data.retryId === "string"
				) {
					consumed.add(part.data.retryId);
				}
			}
		}
		return consumed;
	}, [chat.messages]);
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
		if (
			!props.pendingPrompt ||
			!claimAssistantPendingPrompt(
				sentPendingPromptIdsRef.current,
				props.pendingPrompt.id,
			)
		)
			return;
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

	const send = useCallback(
		(promptOverride?: string, forceSalesRequest = false) => {
			const source = promptOverride ?? input;
			const value = source.trim();
			const attachments = promptOverride ? [] : attachmentState.attachments;
			if (
				(!value && !attachments.length) ||
				!online ||
				attachmentState.uploading ||
				chat.status === "streaming" ||
				chat.status === "submitted"
			)
				return;
			if (
				(forceSalesRequest || salesRequestType) &&
				value &&
				!attachments.length
			) {
				const requestId = salesRequestIdRef.current ?? crypto.randomUUID();
				salesRequestIdRef.current = requestId;
				setSalesRequestBusy(true);
				setSalesRequestError(null);
				void client.assistant.startSalesRequest
					.mutate({
						conversationId: props.conversation.id,
						requestId,
						type: salesRequestType ?? "order",
						text: source,
					})
					.then(async () => {
						setInput("");
						setSalesRequestType(null);
						setSalesRequestRefresh((value) => value + 1);
						const updated = await client.assistant.get.query({
							conversationId: props.conversation.id,
						});
						chat.setMessages(persistedMessagesToUi(updated.messages));
						props.onChanged();
					})
					.catch((cause) => {
						setSalesRequestError(
							cause instanceof Error
								? cause.message
								: "Sales Request could not be started.",
						);
					})
					.finally(() => setSalesRequestBusy(false));
				return;
			}
			shouldStickRef.current = true;
			if (!promptOverride) setInput("");
			setRequestLimitError(null);
			chat.clearError();
			void chat.sendMessage({
				parts: [
					...(value ? [{ type: "text" as const, text: value }] : []),
					...assistantAttachmentParts(attachments),
				],
			});
			if (!promptOverride) attachmentState.clear();
			props.onIntegrationsSent();
		},
		[chat, client, input, online, attachmentState, props, salesRequestType],
	);
	const retryLatest = useCallback(() => {
		const latestUser = [...chat.messages]
			.reverse()
			.find((message) => message.role === "user");
		if (latestUser)
			rotateAssistantRequestId(requestIdsRef.current, latestUser.id);
		chat.clearError();
		void chat.regenerate();
	}, [chat]);

	const reconnect = async () => {
		const run =
			props.conversation.latestRun ??
			(streamState.runId ? { id: streamState.runId } : null);
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
				const result = assistantReconnectResponseSchema.parse(
					await response.json(),
				);
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
				setStreamState((state) =>
					hydrateAssistantReconnectState(
						{ ...state, messageSequence, runSequence },
						result,
					),
				);
				if (!activeStatuses.has(result.status)) break;
				await new Promise((resolve) => setTimeout(resolve, 1_000));
			}
			props.onChanged();
		} catch (error) {
			setStreamState((state) => ({
				...state,
				notice:
					"I couldn't load the latest response. Please check again shortly.",
			}));
			void client.assistant.reportClientFailure
				.mutate({
					eventId: crypto.randomUUID(),
					conversationId: props.conversation.id,
					runId: run.id,
					stage: "reconnect",
				})
				.catch(() => undefined);
		} finally {
			setReconnecting(false);
		}
	};

	const busy = chat.status === "streaming" || chat.status === "submitted";
	const latestMessage = chat.messages.at(-1);
	const latestOutcome =
		latestMessage?.role === "assistant"
			? normalizeAssistantMessage(latestMessage, {
					isStreaming: busy,
					isLastMessage: true,
				}).outcome
			: null;
	const showTransportError = Boolean(chat.error && !latestOutcome);
	const createDocumentProposal = useCallback(
		async (action: AssistantMessageViewModel["documentActions"][number]) => {
			setApprovalReference(null);
			setApprovalBusy(true);
			setApprovalNotice(null);
			try {
				const result = await client.assistant.createProposal.mutate({
					conversationId: props.conversation.id,
					clientRequestId: crypto.randomUUID(),
					toolId: action.data.toolId,
					toolVersion: action.data.toolVersion,
					input: action.data.input,
				});
				if (!result.review)
					throw new Error("The approval review is unavailable");
				setPendingApproval({
					proposalId: result.proposalId,
					confirmationRequestId: crypto.randomUUID(),
					requiresStatusCheck: false,
					approvalToken: result.approvalToken,
					expiresAt: result.expiresAt,
					review: parseAssistantApprovalReview(result.review),
					summary: assistantDocumentApprovalSummary(
						result.toolId,
						parseAssistantApprovalReview(result.review),
					),
				});
			} catch (error) {
				setApprovalReference(assistantErrorReference(error));
				setApprovalNotice(
					"I couldn't prepare the document for approval. Please try again.",
				);
			} finally {
				setApprovalBusy(false);
			}
		},
		[client, props.conversation.id],
	);
	const decideDocumentProposal = useCallback(
		async (decision: "approve" | "reject") => {
			if (
				!pendingApproval ||
				pendingApproval.requiresStatusCheck ||
				approvalBusy
			)
				return;
			setPendingApproval({ ...pendingApproval, requiresStatusCheck: true });
			setApprovalReference(null);
			setApprovalBusy(true);
			setApprovalNotice(null);
			try {
				const result = await client.assistant.decideProposal.mutate({
					proposalId: pendingApproval.proposalId,
					approvalToken: pendingApproval.approvalToken,
					confirmationRequestId: pendingApproval.confirmationRequestId,
					decision,
				});
				if (
					result.errorCode === "AUTHORIZATION_CHANGED" ||
					result.errorCode === "TARGET_CHANGED"
				) {
					setPendingApproval(null);
					setApprovalNotice(
						presentAssistantOutcome({
							kind:
								result.errorCode === "AUTHORIZATION_CHANGED"
									? "denied"
									: "conflict",
						}).message,
					);
					return;
				}
				const outcome = assistantOutcomeSchema.safeParse(result.outcome);
				const publicFailure = outcome.success
					? presentAssistantOutcome(outcome.data).message
					: null;
				setApprovalReference(
					outcome.success ? (outcome.data.reference ?? null) : null,
				);
				if (["processing", "unknown"].includes(result.status)) {
					setApprovalNotice(
						publicFailure ??
							(result.status === "unknown"
								? "I couldn't confirm whether that started. Check its status before trying again."
								: "Your document is still being prepared."),
					);
					return;
				}
				setPendingApproval(null);
				setApprovalNotice(
					result.status === "succeeded"
						? pendingApproval.summary.successMessage
						: result.status === "rejected"
							? "PDF generation was declined."
							: (publicFailure ??
								"I couldn't finish that document request. Please check its latest status."),
				);
				props.onChanged();
			} catch (error) {
				setApprovalReference(assistantErrorReference(error));
				setApprovalNotice(
					"I couldn't confirm whether that started. Check its status before trying again.",
				);
			} finally {
				setApprovalBusy(false);
			}
		},
		[client, pendingApproval, props, approvalBusy],
	);
	const checkDocumentProposal = useCallback(async () => {
		if (!pendingApproval || approvalBusy) return;
		setApprovalBusy(true);
		setApprovalReference(null);
		try {
			const result = await client.assistant.proposal.query({
				proposalId: pendingApproval.proposalId,
			});
			const outcome = assistantOutcomeSchema.safeParse(result.outcome);
			const publicFailure = outcome.success
				? presentAssistantOutcome(outcome.data).message
				: null;
			setApprovalReference(
				outcome.success ? (outcome.data.reference ?? null) : null,
			);
			if (
				result.errorCode === "AUTHORIZATION_CHANGED" ||
				result.errorCode === "TARGET_CHANGED"
			) {
				setPendingApproval(null);
				setApprovalNotice(
					presentAssistantOutcome({
						kind:
							result.errorCode === "AUTHORIZATION_CHANGED"
								? "denied"
								: "conflict",
					}).message,
				);
			} else if (result.status === "pending") {
				setPendingApproval({
					...pendingApproval,
					review: parseAssistantApprovalReview(result.review),
					summary: assistantDocumentApprovalSummary(
						result.toolId,
						parseAssistantApprovalReview(result.review),
					),
					requiresStatusCheck: false,
				});
				setApprovalNotice(
					"This request is still waiting for your confirmation.",
				);
			} else if (
				["executing", "processing", "unknown"].includes(result.status)
			) {
				setApprovalNotice(
					publicFailure ??
						(result.status === "unknown"
							? "I still couldn't confirm the result. Ask an administrator to check before starting another request."
							: "Your document is still being prepared. Check again shortly."),
				);
			} else {
				setPendingApproval(null);
				setApprovalNotice(
					result.status === "succeeded"
						? pendingApproval.summary.successMessage
						: result.status === "rejected"
							? "PDF generation was declined."
							: (publicFailure ??
								"This document request has ended. Review the document before starting another request."),
				);
				props.onChanged();
			}
		} catch (error) {
			setApprovalReference(assistantErrorReference(error));
			setApprovalNotice(
				"I couldn't check the result yet. Please check again shortly.",
			);
		} finally {
			setApprovalBusy(false);
		}
	}, [client, pendingApproval, props, approvalBusy]);
	const handleCardAction = useCallback(
		(card: AssistantMessageViewModel["cards"][number], messageId: string) => {
			if (card.kind === "missing-feature" && card.requestSummary) {
				props.onFeatureRequest({
					summary: card.requestSummary,
					runId: streamState.runId,
					messageId,
				});
				return;
			}
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
		[chat, props.onFeatureRequest, streamState.runId],
	);
	const retryFailedRead = useCallback(
		async (tool: AssistantMessageViewModel["tools"][number]) => {
			if (!tool.retryId || readRetryBusy) return;
			setReadRetryBusy(true);
			setReadRetryNotice(null);
			try {
				const result = await client.assistant.retryRead.mutate({
					retryId: tool.retryId,
				});
				const retriedMessages = persistedMessagesToUi([result.message]);
				chat.setMessages((current) => {
					const withoutConsumedTicket = current.map((message) => ({
						...message,
						parts: message.parts.map((part) => {
							if (!part || typeof part !== "object" || !("data" in part)) {
								return part;
							}
							const data = part.data;
							if (
								!data ||
								typeof data !== "object" ||
								!("retryId" in data) ||
								data.retryId !== tool.retryId
							) {
								return part;
							}
							const { retryId: _consumed, ...nextData } = data;
							return { ...part, data: nextData } as typeof part;
						}),
					}));
					const existingIds = new Set(
						withoutConsumedTicket.map((message) => message.id),
					);
					return [
						...withoutConsumedTicket,
						...retriedMessages.filter(
							(message) => !existingIds.has(message.id),
						),
					];
				});
				setReadRetryNotice("The failed check was retried with current access.");
				props.onChanged();
			} catch {
				setReadRetryNotice(
					"This check is no longer available. Please ask again.",
				);
			} finally {
				setReadRetryBusy(false);
			}
		},
		[chat, client, props, readRetryBusy],
	);
	const activeRun =
		props.conversation.latestRun &&
		activeStatuses.has(props.conversation.latestRun.status);
	return (
		<>
			<div
				ref={bodyRef}
				className={`${styles.body} ${chat.messages.length ? styles.withMessages : ""} ${documentArtifact || orderDraft ? styles.bodyCanvasOpen : ""}`}
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
							{chat.messages
								.filter((message) => {
									const part = message.parts[0];
									return !(
										message.role === "assistant" &&
										message.parts.length === 1 &&
										part?.type === "text" &&
										/^I need (?:\d+|a few) details before preparing the Sales draft\. Please answer the questions below\.$/.test(
											part.text,
										)
									);
								})
								.map((message) => (
									<AssistantMessageBoundary
										key={message.id}
										conversationId={props.conversation.id}
									>
										<AssistantMessageRenderer
											key={message.id}
											message={message}
											isStreaming={busy}
											isLastMessage={message.id === latestMessageId}
											onCardAction={
												message.id === latestMessageId
													? (card) => handleCardAction(card, message.id)
													: undefined
											}
											onOpenEntity={openEntity}
											onOpenOrderDraft={(draft) => {
												void setArtifactParams({ assistantArtifact: null });
												setOrderDraft(draft);
											}}
											onCreateDocumentProposal={(action) => {
												void createDocumentProposal(action);
											}}
											onRetryRead={readRetryBusy ? undefined : retryFailedRead}
											consumedRetryIds={consumedReadRetryIds}
										/>
									</AssistantMessageBoundary>
								))}
							<AssistantSalesRequestQuestionnaire
								conversationId={props.conversation.id}
								refreshKey={salesRequestRefresh}
								onChanged={() => {
									void client.assistant.get
										.query({ conversationId: props.conversation.id })
										.then((updated) => {
											chat.setMessages(persistedMessagesToUi(updated.messages));
											props.onChanged();
										});
								}}
							/>
							<div ref={bottomRef} />
						</div>
						<AssistantReconnectActivity state={streamState} />
						{busy ? (
							<output className={styles.liveStatus}>
								<LoaderCircle className={styles.spin} size={14} />{" "}
								{chat.status === "submitted" ? "Connecting…" : "Working…"}
							</output>
						) : null}
					</>
				) : null}
			</div>
			<footer
				className={`${styles.composerArea} ${documentArtifact || orderDraft ? styles.composerCanvasOpen : ""}`}
				onDragOver={(event) => event.preventDefault()}
				onDrop={(event) => {
					event.preventDefault();
					if (salesRequestType) setSalesRequestType(null);
					void attachmentState.addFiles(Array.from(event.dataTransfer.files));
				}}
			>
				{!online ? (
					<div className={styles.liveWarning} role="alert">
						<WifiOff size={14} /> You’re offline. Your draft is safe; reconnect
						to send.
					</div>
				) : null}
				{showTransportError && quotaLimitError ? (
					<div className={styles.liveWarning} role="alert">
						<span>
							Your Assistant allowance has been reached. It resets{" "}
							{new Date(quotaLimitError.resetAt).toLocaleString()}.
						</span>
					</div>
				) : showTransportError && requestLimitError ? (
					<div className={styles.liveWarning} role="alert">
						<span>
							Request limit reached. You have {requestLimitError.remaining} of{" "}
							{requestLimitError.limit} requests left. Try again after{" "}
							{new Date(requestLimitError.resetAt).toLocaleString()}.
						</span>
					</div>
				) : showTransportError ? (
					<div className={styles.liveWarning} role="alert">
						<div>
							<span>
								{requestOutcome
									? presentAssistantOutcome(requestOutcome).message
									: "The response stopped. Check whether your request completed before sending it again."}
							</span>
							{requestOutcome?.reference ? (
								<AssistantOutcomeHelp reference={requestOutcome.reference} />
							) : null}
						</div>
						{requestOutcome?.kind === "temporary" ? (
							<Button size="sm" variant="outline" onClick={() => retryLatest()}>
								<RefreshCw size={13} /> Retry
							</Button>
						) : null}
						{requestOutcome?.kind === "signed-out" ? (
							<Button size="sm" variant="outline" asChild>
								<a href="/login" target="_blank" rel="noopener noreferrer">
									Sign in
								</a>
							</Button>
						) : null}
						{requestOutcome?.kind === "signed-out" ? (
							<span>
								Sign in in the new tab, then return here to send your message.
							</span>
						) : null}
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
				{salesRequestBusy ? (
					<output className="mx-auto mb-2 block max-w-[680px] text-xs">
						Preparing request…
					</output>
				) : null}
				{salesRequestError ? (
					<p
						className="mx-auto mb-2 max-w-[680px] text-sm text-destructive"
						role="alert"
					>
						{salesRequestError}
					</p>
				) : null}
				<AssistantSalesRequestQuestionnaire
					conversationId={props.conversation.id}
					refreshKey={salesRequestRefresh}
					placement="composer"
					disabled={!online}
					onChanged={() => {
						void client.assistant.get
							.query({ conversationId: props.conversation.id })
							.then((updated) => {
								chat.setMessages(persistedMessagesToUi(updated.messages));
								props.onChanged();
							});
					}}
				>
					<AssistantInput
						value={input}
						onChange={setInput}
						onSubmit={() => send()}
						onSalesRequestSubmit={() => send(undefined, true)}
						onStop={() => {
							setStreamState((state) => ({ ...state, status: "cancelling" }));
							chat.stop();
						}}
						isStreaming={busy}
						disabled={
							(!input.trim() && !attachmentState.attachments.length) ||
							!online ||
							attachmentState.uploading ||
							salesRequestBusy
						}
						autoFocus
						placeholder={
							salesRequestType
								? "Paste the customer Sales Request…"
								: chat.messages.length
									? "Reply…"
									: "How can I help you today?"
						}
						attachments={attachmentState.attachments}
						uploading={attachmentState.uploading}
						attachmentError={attachmentState.error}
						attachmentErrorReference={attachmentState.errorReference}
						onAddFiles={(files) => void attachmentState.addFiles(files)}
						salesRequestMode={Boolean(salesRequestType)}
						onToggleSalesRequest={() =>
							setSalesRequestType((current) => (current ? null : "order"))
						}
						onRemoveAttachment={attachmentState.remove}
						suggestions={props.suggestions}
						onSuggestion={(suggestion) => send(suggestion.prompt)}
						connectedApps={props.connectedApps}
						mentionedIntegrationIds={props.mentionedIntegrationIds}
						onToggleIntegration={props.onToggleIntegration}
						onOpenSources={props.onOpenProviders}
					/>
				</AssistantSalesRequestQuestionnaire>
				<div className={styles.footerNote}>
					<span>GND AI can make mistakes. Please double-check responses.</span>
				</div>
			</footer>
			<AssistantArtifactCanvas
				document={documentArtifact}
				onClose={closeDocument}
			/>
			<AssistantOrderDraftCanvas
				draft={orderDraft}
				conversationId={props.conversation.id}
				onClose={() => setOrderDraft(null)}
			/>
			<Dialog
				open={Boolean(pendingApproval)}
				onOpenChange={(open) => {
					if (!open && !approvalBusy) setPendingApproval(null);
				}}
			>
				<DialogContent className="sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>
							{pendingApproval?.summary.title ?? "Review document"}
						</DialogTitle>
						<DialogDescription>
							{pendingApproval?.summary.description}
						</DialogDescription>
					</DialogHeader>
					{pendingApproval ? (
						<div className="space-y-4 text-sm">
							<dl className="grid gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-[8rem_1fr]">
								<dt className="text-muted-foreground">
									{pendingApproval.summary.recordLabel}
								</dt>
								<dd>{pendingApproval.summary.orderNo}</dd>
								<dt className="text-muted-foreground">Document</dt>
								<dd>{pendingApproval.summary.document}</dd>
							</dl>
							<p className="text-xs text-muted-foreground">
								Expires {new Date(pendingApproval.expiresAt).toLocaleString()}.
							</p>
							{approvalNotice ? <output>{approvalNotice}</output> : null}
							{approvalReference ? (
								<AssistantOutcomeHelp reference={approvalReference} />
							) : null}
							<div className="flex justify-end gap-2">
								{pendingApproval.requiresStatusCheck ? (
									<Button
										type="button"
										disabled={approvalBusy}
										onClick={() => void checkDocumentProposal()}
									>
										{approvalBusy ? "Checking…" : "Check status"}
									</Button>
								) : (
									<>
										<Button
											type="button"
											variant="outline"
											disabled={approvalBusy}
											onClick={() => void decideDocumentProposal("reject")}
										>
											Decline
										</Button>
										<Button
											type="button"
											disabled={approvalBusy}
											onClick={() => void decideDocumentProposal("approve")}
										>
											{approvalBusy
												? "Processing…"
												: pendingApproval.summary.confirmLabel}
										</Button>
									</>
								)}
							</div>
						</div>
					) : null}
				</DialogContent>
			</Dialog>
			{approvalNotice && !pendingApproval ? (
				<output className={styles.liveStatus}>{approvalNotice}</output>
			) : null}
			{readRetryNotice ? (
				<output className={styles.liveStatus}>{readRetryNotice}</output>
			) : null}
			{approvalReference && !pendingApproval ? (
				<AssistantOutcomeHelp reference={approvalReference} />
			) : null}
		</>
	);
}

export function LiveAssistantWorkspace() {
	const trpc = useTRPC();
	const client = useTRPCClient();
	const assistantBootstrap = useQuery({
		...trpc.assistant.bootstrap.queryOptions(),
		staleTime: 30_000,
	});
	const searchParams = useSearchParams();
	const router = useRouter();
	const contextualPrompt = readAssistantContextPrompt(searchParams);
	const requestedSalesRequestType =
		searchParams.get("newSalesRequest") === "quote"
			? "quote"
			: searchParams.get("newSalesRequest") === "order"
				? "order"
				: null;
	const [newSalesRequestType, setNewSalesRequestType] = useState<
		"order" | "quote" | null
	>(requestedSalesRequestType);
	useEffect(() => {
		if (requestedSalesRequestType)
			setNewSalesRequestType(requestedSalesRequestType);
	}, [requestedSalesRequestType]);
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
	const [favoritesOpen, setFavoritesOpen] = useState(false);
	const [preferencesOpen, setPreferencesOpen] = useState(false);
	const requestedFeatureMode =
		searchParams.get("featureRequests") === "triage" ? "triage" : "mine";
	const [featureRequestsOpen, setFeatureRequestsOpen] = useState(() =>
		["mine", "triage"].includes(searchParams.get("featureRequests") ?? ""),
	);
	const [initialFeatureRequest, setInitialFeatureRequest] = useState<{
		summary: string;
		runId: string | null;
		messageId: string | null;
	} | null>(null);
	const [suggestedRunId, setSuggestedRunId] = useState<string | null>(null);
	const [conversationRenderRevision, setConversationRenderRevision] =
		useState(0);
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
	const [draft, setDraft] = useState(contextualPrompt);
	const [pendingPrompt, setPendingPrompt] =
		useState<PendingAssistantPrompt | null>(null);
	const [creatingPrompt, setCreatingPrompt] =
		useState<PendingAssistantPrompt | null>(null);
	const attachmentState = useAssistantAttachments();
	const requestedConversationId = searchParams.get("chat");
	const historyRequestRef = useRef(0);
	const conversationRequestRef = useRef(0);
	const startRequestRef = useRef(0);
	const creatingConversationRef = useRef(false);

	const updateUrl = useCallback((id: string | null) => {
		const url = new URL(window.location.href);
		url.searchParams.delete("assistant");
		if (id) url.searchParams.delete("newSalesRequest");
		if (id) url.searchParams.set("chat", id);
		else url.searchParams.delete("chat");
		window.history.replaceState(null, "", `${url.pathname}${url.search}`);
	}, []);
	useEffect(() => {
		if (!searchParams.has("entityType")) return;
		const url = new URL(window.location.href);
		for (const key of ["entityType", "entityId", "intent"]) {
			url.searchParams.delete(key);
		}
		window.history.replaceState(null, "", `${url.pathname}${url.search}`);
	}, [searchParams]);
	const closeChat = useCallback(() => {
		router.replace("/");
	}, [router]);
	useEffect(() => {
		if (assistantBootstrap.data?.enabled === false) closeChat();
	}, [assistantBootstrap.data?.enabled, closeChat]);

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
		async (id: string, options: { showLoading?: boolean } = {}) => {
			const request = ++conversationRequestRef.current;
			const showLoading = options.showLoading ?? true;
			if (showLoading) setLoading(true);
			setError(null);
			try {
				const row = await client.assistant.get.query({ conversationId: id });
				if (request !== conversationRequestRef.current) return false;
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
				return true;
			} catch {
				if (request !== conversationRequestRef.current) return false;
				if (showLoading) {
					setPendingPrompt((pending) =>
						pending?.conversationId === id ? null : pending,
					);
					setConversation(null);
					setError(
						"This conversation is unavailable or you no longer have access.",
					);
				} else {
					setError("The latest conversation state could not be refreshed.");
				}
				return false;
			} finally {
				if (showLoading && request === conversationRequestRef.current)
					setLoading(false);
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
		setCreatingPrompt(null);
		creatingConversationRef.current = false;
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
		conversationRequestRef.current += 1;
		setPendingPrompt(null);
		setCreatingPrompt(null);
		creatingConversationRef.current = false;
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
		setCreatingPrompt(null);
		creatingConversationRef.current = false;
		setMentionedIntegrationIds([]);
		attachmentState.discard();
		setDraft("");
		setNewSalesRequestType(null);
		setError(null);
		setActionError(null);
		updateUrl(null);
	};
	const start = async (promptOverride?: string, forceSalesRequest = false) => {
		const source = promptOverride ?? draft;
		const prompt = source.trim();
		const salesType = forceSalesRequest
			? (newSalesRequestType ?? "order")
			: newSalesRequestType;
		const attachments = promptOverride ? [] : attachmentState.attachments;
		if (
			(!prompt && !attachments.length) ||
			attachmentState.uploading ||
			creatingConversationRef.current
		)
			return;
		creatingConversationRef.current = true;
		const request = ++startRequestRef.current;
		const optimisticPrompt: PendingAssistantPrompt = {
			id: crypto.randomUUID(),
			conversationId: null,
			text: prompt,
			attachments,
		};
		updateUrl(null);
		setDraft("");
		setCreatingPrompt(optimisticPrompt);
		setLoading(false);
		let createdConversationId: string | null = null;
		try {
			const created = await client.assistant.create.mutate({
				title: (prompt || attachments[0]?.name || "New chat").slice(0, 80),
			});
			createdConversationId = created.id;
			if (request !== startRequestRef.current) return;
			if (salesType && prompt && !attachments.length) {
				await client.assistant.startSalesRequest.mutate({
					conversationId: created.id,
					requestId: optimisticPrompt.id,
					type: salesType,
					text: source,
				});
				setNewSalesRequestType(null);
				setCreatingPrompt(null);
				setConversationId(created.id);
				updateUrl(created.id);
				await loadConversation(created.id);
				await loadHistory("");
				return;
			}
			setPendingPrompt({
				id: optimisticPrompt.id,
				conversationId: created.id,
				text: prompt,
				attachments,
			});
			setCreatingPrompt(null);
			attachmentState.clear();
			setConversationId(created.id);
			updateUrl(created.id);
			await loadHistory("");
		} catch (cause) {
			if (request !== startRequestRef.current) return;
			if (createdConversationId) {
				setConversationId(createdConversationId);
				updateUrl(createdConversationId);
				await loadConversation(createdConversationId);
				setActionError(
					cause instanceof Error
						? cause.message
						: "The Sales Request could not be started. Start a new chat to retry safely.",
				);
			} else if (!promptOverride) setDraft(prompt);
			setCreatingPrompt(null);
			setError(
				cause instanceof Error
					? cause.message
					: "A new conversation could not be created.",
			);
			setLoading(false);
		} finally {
			if (request === startRequestRef.current)
				creatingConversationRef.current = false;
		}
	};
	const useSavedPrompt = (prompt: string) => {
		if (conversationId) {
			setPendingPrompt({
				id: crypto.randomUUID(),
				conversationId,
				text: prompt,
				attachments: [],
			});
			return;
		}
		void start(prompt);
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

	const toggleIntegration = (id: string) =>
		setMentionedIntegrationIds((current) =>
			current.includes(id)
				? current.filter((integrationId) => integrationId !== id)
				: [...current, id],
		);
	const newChatInput = assistantBootstrap.data?.enabled ? (
		<div className="mx-auto w-full max-w-[680px]">
			<AssistantInput
				value={draft}
				onChange={setDraft}
				onSubmit={() => void start()}
				onSalesRequestSubmit={() => void start(undefined, true)}
				disabled={
					(!draft.trim() && !attachmentState.attachments.length) ||
					attachmentState.uploading ||
					Boolean(creatingPrompt)
				}
				placeholder={
					newSalesRequestType
						? "Paste the customer Sales Request…"
						: "How can I help you today?"
				}
				attachments={attachmentState.attachments}
				uploading={attachmentState.uploading}
				attachmentError={attachmentState.error}
				attachmentErrorReference={attachmentState.errorReference}
				onAddFiles={(files) => void attachmentState.addFiles(files)}
				salesRequestMode={Boolean(newSalesRequestType)}
				onToggleSalesRequest={() => {
					if (newSalesRequestType) {
						const url = new URL(window.location.href);
						url.searchParams.delete("newSalesRequest");
						window.history.replaceState(
							null,
							"",
							`${url.pathname}${url.search}`,
						);
						setNewSalesRequestType(null);
					} else setNewSalesRequestType("order");
				}}
				onRemoveAttachment={attachmentState.remove}
				suggestions={suggestions}
				onSuggestion={(suggestion) => {
					void client.assistant.recordSuggestionUse.mutate({
						id: suggestion.id,
					});
					void start(suggestion.prompt);
				}}
				connectedApps={providers.connectedApps}
				mentionedIntegrationIds={mentionedIntegrationIds}
				onToggleIntegration={toggleIntegration}
				onOpenSources={() => setProvidersOpen(true)}
			/>
		</div>
	) : null;

	return (
		<main className={styles.workspace}>
			<PageTitle>Chat Assistant</PageTitle>
			<>
				<AssistantHeader
					title={conversation?.title || "New chat"}
					quota={assistantBootstrap.data?.quota ?? null}
					onBack={closeChat}
					onNewChat={newChat}
					onFavorites={() => setFavoritesOpen(true)}
					onFeatureRequests={() => {
						setInitialFeatureRequest(null);
						setFeatureRequestsOpen(true);
					}}
					onHistory={() => {
						setHistoryOpen(true);
						void loadHistory(search);
					}}
					onSources={() => setProvidersOpen(true)}
					onPreferences={() => setPreferencesOpen(true)}
					onSaveAction={
						suggestedRunId ? () => setFavoritesOpen(true) : undefined
					}
					onArchive={conversationId ? () => void remove("archive") : undefined}
					onDelete={conversationId ? () => void remove("delete") : undefined}
				/>
				{actionError ? (
					<div className={styles.actionError} role="alert">
						{actionError}
					</div>
				) : null}
				{loading && !pendingPrompt && !creatingPrompt ? (
					<output className={styles.shellState}>
						<LoaderCircle className={styles.spin} size={20} /> Loading
						conversation…
					</output>
				) : conversation ? (
					<AssistantConversation
						key={`${conversation.id}:${conversationRenderRevision}`}
						conversation={conversation}
						pendingPrompt={
							pendingPrompt?.conversationId === conversation.id
								? pendingPrompt
								: null
						}
						onPendingSent={() =>
							setPendingPrompt((pending) =>
								pending?.conversationId === conversation.id ? null : pending,
							)
						}
						onChanged={() => {
							void loadConversation(conversation.id, {
								showLoading: false,
							});
							void loadHistory("");
							void assistantBootstrap.refetch();
						}}
						onOpenProviders={() => setProvidersOpen(true)}
						suggestions={suggestions}
						connectedApps={providers.connectedApps}
						mentionedIntegrationIds={mentionedIntegrationIds}
						onToggleIntegration={toggleIntegration}
						onIntegrationsSent={() => setMentionedIntegrationIds([])}
						onSuccessfulRun={setSuggestedRunId}
						onFeatureRequest={(request) => {
							setInitialFeatureRequest(request);
							setFeatureRequestsOpen(true);
						}}
						initialSalesRequestType={requestedSalesRequestType}
					/>
				) : (
					<>
						<div className={styles.body}>
							{creatingPrompt || pendingPrompt ? (
								<>
									<div
										className={styles.messages}
										role="log"
										aria-label="Assistant conversation"
									>
										<AssistantMessageRenderer
											message={{
												id: (creatingPrompt ?? pendingPrompt)?.id ?? "pending",
												role: "user",
												parts: [
													...((creatingPrompt ?? pendingPrompt)?.text
														? [
																{
																	type: "text" as const,
																	text:
																		(creatingPrompt ?? pendingPrompt)?.text ??
																		"",
																},
															]
														: []),
													...assistantAttachmentParts(
														(creatingPrompt ?? pendingPrompt)?.attachments ??
															[],
													),
												],
											}}
											isStreaming
											isLastMessage
										/>
									</div>
									<output className={styles.liveStatus}>
										<LoaderCircle className={styles.spin} size={14} />{" "}
										Connecting…
									</output>
								</>
							) : assistantBootstrap.data?.enabled ? (
								<Empty>
									<EmptyHeader>
										<EmptyMedia variant="icon">
											<MessageSquare />
										</EmptyMedia>
										<EmptyTitle>How can I help?</EmptyTitle>
										<EmptyDescription>
											Check an order, find a customer, or ask about your work.
										</EmptyDescription>
									</EmptyHeader>
									<EmptyContent>
										<div className="flex flex-wrap justify-center gap-2">
											{suggestions.slice(0, 3).map((suggestion) => (
												<Button
													key={suggestion.id}
													variant="outline"
													size="sm"
													onClick={() => setDraft(suggestion.prompt)}
												>
													{suggestion.title}
												</Button>
											))}
										</div>
									</EmptyContent>
								</Empty>
							) : null}
							{error ? (
								<div className={styles.liveWarning} role="alert">
									{error}
								</div>
							) : null}
						</div>
						<footer className={styles.composerArea}>{newChatInput}</footer>
					</>
				)}
			</>
			<AssistantSavedActionsDialog
				open={favoritesOpen}
				mode="favorites"
				conversationId={conversationId}
				suggestedRunId={suggestedRunId}
				onOpenChange={setFavoritesOpen}
				onUsePrompt={useSavedPrompt}
				onConversationChanged={() => {
					if (conversationId) {
						void loadConversation(conversationId).then((committed) => {
							if (committed)
								setConversationRenderRevision((value) => value + 1);
						});
					}
					void loadHistory("");
				}}
				onSuggestionSaved={() => setSuggestedRunId(null)}
			/>
			<AssistantSavedActionsDialog
				open={preferencesOpen}
				mode="preferences"
				conversationId={conversationId}
				suggestedRunId={null}
				onOpenChange={setPreferencesOpen}
				onUsePrompt={useSavedPrompt}
				onConversationChanged={() => undefined}
				onSuggestionSaved={() => undefined}
			/>
			<AssistantFeatureRequestsDialog
				open={featureRequestsOpen}
				onOpenChange={setFeatureRequestsOpen}
				conversationId={conversationId}
				initialRequest={initialFeatureRequest}
				initialMode={requestedFeatureMode}
			/>
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
