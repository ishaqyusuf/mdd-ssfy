// @ts-expect-error packages/db typecheck does not include Bun test types.
import { afterAll, describe, expect, it } from "bun:test";
import { db } from "..";
import {
	AssistantConversationAccessError,
	AssistantIdempotencyConflictError,
	AssistantMessageValidationError,
	AssistantRunTerminalError,
	appendAssistantGeneratedMessage,
	appendAssistantUserMessage,
	archiveAssistantConversation,
	claimAssistantRunForExecution,
	completeAssistantRun,
	createAssistantConversation,
	createOrReuseAssistantRequestRun,
	createOrReuseAssistantRun,
	getAssistantConversation,
	getAssistantRunForReconnect,
	listAssistantConversations,
	recordAssistantToolExecution,
	softDeleteAssistantConversation,
	updateAssistantRunCheckpoint,
} from "./assistant";

const ownerUserId = 1_800_000_000 + Math.floor(Math.random() * 10_000);
const otherUserId = ownerUserId + 1;
const conversationIds: string[] = [];

afterAll(async () => {
	if (conversationIds.length === 0) return;
	const runs = await db.assistantRun.findMany({
		where: { conversationId: { in: conversationIds } },
		select: { id: true },
	});
	const runIds = runs.map(({ id }) => id);
	await db.assistantActionProposal.deleteMany({
		where: { runId: { in: runIds } },
	});
	await db.assistantToolExecution.deleteMany({
		where: { runId: { in: runIds } },
	});
	await db.assistantRun.deleteMany({ where: { id: { in: runIds } } });
	await db.assistantMessage.deleteMany({
		where: { conversationId: { in: conversationIds } },
	});
	await db.storedDocument.deleteMany({
		where: {
			ownerType: "assistant_conversation",
			ownerId: { in: conversationIds },
		},
	});
	await db.assistantConversation.deleteMany({
		where: { id: { in: conversationIds } },
	});
	await db.$disconnect();
});

describe("assistant persistence integration", () => {
	it("keeps history, retries, and reconnect state scoped to the actor", async () => {
		const conversation = await createAssistantConversation(db, {
			ownerUserId,
			title: "Quarterly sales review",
		});
		conversationIds.push(conversation.id);
		const scopedConversation = await createAssistantConversation(db, {
			ownerUserId,
			scopeType: "organization",
			scopeId: "organization-a",
			title: "Scoped assistant",
		});
		conversationIds.push(scopedConversation.id);
		expect(
			await getAssistantConversation(db, {
				conversationId: scopedConversation.id,
				ownerUserId,
				scopeType: "organization",
				scopeId: "organization-b",
			}),
		).toBeNull();

		const message = await appendAssistantUserMessage(db, {
			conversationId: conversation.id,
			ownerUserId,
			clientRequestId: "client-message-1",
			parts: [{ type: "text", text: "Find order 1001" }],
		});
		const retry = await appendAssistantUserMessage(db, {
			conversationId: conversation.id,
			ownerUserId,
			clientRequestId: "client-message-1",
			parts: [{ type: "text", text: "Find order 1001" }],
		});

		expect(retry.id).toBe(message.id);
		expect(message.sequence).toBe(1);
		await expect(
			appendAssistantUserMessage(db, {
				conversationId: conversation.id,
				ownerUserId,
				clientRequestId: "client-message-1",
				parts: [{ type: "text", text: "different payload" }],
			}),
		).rejects.toBeInstanceOf(AssistantIdempotencyConflictError);
		await expect(
			appendAssistantUserMessage(db, {
				conversationId: conversation.id,
				ownerUserId: otherUserId,
				clientRequestId: "client-message-1",
				parts: [{ type: "text", text: "forged retry" }],
			}),
		).rejects.toBeInstanceOf(AssistantConversationAccessError);
		expect(
			await getAssistantConversation(db, {
				conversationId: conversation.id,
				ownerUserId: otherUserId,
			}),
		).toBeNull();
		expect(
			await listAssistantConversations(db, {
				ownerUserId,
				search: "order 1001",
			}),
		).toHaveLength(1);
		expect(
			await listAssistantConversations(db, {
				ownerUserId: otherUserId,
				search: "order 1001",
			}),
		).toHaveLength(0);

		const concurrentMessages = await Promise.all(
			Array.from({ length: 6 }, (_, index) =>
				appendAssistantUserMessage(db, {
					conversationId: conversation.id,
					ownerUserId,
					clientRequestId: `concurrent-${index}`,
					parts: [{ type: "text", text: `Concurrent message ${index}` }],
				}),
			),
		);
		expect(
			concurrentMessages.map(({ sequence }) => sequence).sort((a, b) => a - b),
		).toEqual([2, 3, 4, 5, 6, 7]);

		const run = await createOrReuseAssistantRun(db, {
			conversationId: conversation.id,
			ownerUserId,
			requestId: "run-request-1",
			triggerMessageId: message.id,
			catalogVersion: "catalog-v1",
			model: "test-model",
			promptVersion: "prompt-v1",
		});
		const retriedRun = await createOrReuseAssistantRun(db, {
			conversationId: conversation.id,
			ownerUserId,
			requestId: "run-request-1",
			triggerMessageId: message.id,
			catalogVersion: "catalog-v1",
			model: "test-model",
			promptVersion: "prompt-v1",
		});
		expect(retriedRun.id).toBe(run.id);
		await expect(
			createOrReuseAssistantRun(db, {
				conversationId: conversation.id,
				ownerUserId,
				requestId: "run-request-1",
				triggerMessageId: message.id,
				catalogVersion: "catalog-v1",
				model: "different-model",
				promptVersion: "prompt-v1",
			}),
		).rejects.toBeInstanceOf(AssistantIdempotencyConflictError);
		await updateAssistantRunCheckpoint(db, {
			runId: run.id,
			ownerUserId,
			status: "running",
			checkpoint: { phase: "tool_execution" },
		});
		const runningToolExecution = await recordAssistantToolExecution(db, {
			runId: run.id,
			ownerUserId,
			toolCallId: "tool-call-1",
			step: 1,
			toolId: "sales_find_orders",
			toolVersion: 1,
			effect: "read",
			status: "running",
			toolInput: { orderNo: "1001" },
			idempotencyKey: "effect-key-1",
		});
		const toolExecution = await recordAssistantToolExecution(db, {
			runId: run.id,
			ownerUserId,
			toolCallId: "tool-call-1",
			step: 1,
			toolId: "sales_find_orders",
			toolVersion: 1,
			effect: "read",
			status: "succeeded",
			toolInput: { orderNo: "1001" },
			idempotencyKey: "effect-key-1",
			result: { status: "success", recordRefs: ["sales-order:1001"] },
			completedAt: new Date(),
		});
		expect(runningToolExecution.status).toBe("running");
		expect(toolExecution.eventSequence).toBe(1);
		expect(toolExecution).toMatchObject({
			status: "succeeded",
			input: { redacted: true },
			result: { status: "success", recordRefs: ["sales-order:1001"] },
		});
		const generatedInput = {
			runId: run.id,
			conversationId: conversation.id,
			ownerUserId,
			parts: [{ type: "text", text: "Order 1001 is ready." }],
			searchText: "Order 1001 is ready.",
		};
		const generatedMessage = await appendAssistantGeneratedMessage(
			db,
			generatedInput,
		);
		expect((await appendAssistantGeneratedMessage(db, generatedInput)).id).toBe(
			generatedMessage.id,
		);
		expect(
			(
				await recordAssistantToolExecution(db, {
					runId: run.id,
					ownerUserId,
					toolCallId: "tool-call-1",
					step: 1,
					toolId: "sales_find_orders",
					toolVersion: 1,
					effect: "read",
					status: "succeeded",
					toolInput: { orderNo: "1001" },
					idempotencyKey: "effect-key-1",
					result: {
						status: "success",
						recordRefs: ["sales-order:1001"],
					},
				})
			).id,
		).toBe(toolExecution.id);
		await expect(
			appendAssistantGeneratedMessage(db, {
				...generatedInput,
				parts: [{ type: "text", text: "Different answer" }],
			}),
		).rejects.toBeInstanceOf(AssistantIdempotencyConflictError);
		const terminalInput = {
			runId: run.id,
			ownerUserId,
			status: "succeeded" as const,
			terminalResult: { status: "success" },
			usage: { totalTokens: 12 },
		};
		const completedRuns = await Promise.all([
			completeAssistantRun(db, terminalInput),
			completeAssistantRun(db, terminalInput),
		]);
		expect(completedRuns.map((completed) => completed?.status)).toEqual([
			"succeeded",
			"succeeded",
		]);
		expect((await appendAssistantGeneratedMessage(db, generatedInput)).id).toBe(
			generatedMessage.id,
		);
		await expect(
			updateAssistantRunCheckpoint(db, {
				runId: run.id,
				ownerUserId,
				status: "running",
				checkpoint: { phase: "late" },
			}),
		).rejects.toBeInstanceOf(AssistantRunTerminalError);
		await expect(
			recordAssistantToolExecution(db, {
				runId: run.id,
				ownerUserId,
				toolCallId: "late-tool-call",
				step: 2,
				toolId: "sales_find_orders",
				toolVersion: 1,
				effect: "read",
				status: "running",
				toolInput: { orderNo: "2002" },
			}),
		).rejects.toBeInstanceOf(AssistantRunTerminalError);
		expect(
			await getAssistantRunForReconnect(db, {
				runId: run.id,
				ownerUserId: otherUserId,
			}),
		).toBeNull();
		const reconnect = await getAssistantRunForReconnect(db, {
			runId: run.id,
			ownerUserId,
			afterSequence: 0,
		});
		expect(reconnect?.status).toBe("succeeded");
		expect(
			reconnect?.toolExecutions.map(({ eventSequence }) => eventSequence),
		).toEqual([1]);
		expect(
			reconnect?.conversation.messages.map(({ sequence }) => sequence),
		).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
		expect(
			(
				await getAssistantRunForReconnect(db, {
					runId: run.id,
					ownerUserId,
					afterRunSequence: 1,
				})
			)?.toolExecutions,
		).toHaveLength(0);

		const requestRunInput = {
			conversationId: conversation.id,
			ownerUserId,
			requestId: "atomic-request-2",
			clientMessageId: "atomic-message-2",
			parts: [{ type: "text", text: "Atomic request" }],
			catalogVersion: "catalog-v1",
			model: "test-model",
			promptVersion: "prompt-v1",
		};
		const atomicRequest = await createOrReuseAssistantRequestRun(
			db,
			requestRunInput,
		);
		const atomicRetry = await createOrReuseAssistantRequestRun(
			db,
			requestRunInput,
		);
		expect(atomicRetry).toMatchObject({
			reused: true,
			message: { id: atomicRequest.message.id },
			run: { id: atomicRequest.run.id },
		});
		const firstClaim = await claimAssistantRunForExecution(db, {
			runId: atomicRequest.run.id,
			ownerUserId,
		});
		const secondClaim = await claimAssistantRunForExecution(db, {
			runId: atomicRequest.run.id,
			ownerUserId,
		});
		expect(firstClaim.claimed).toBe(true);
		expect(secondClaim.claimed).toBe(false);
		await expect(
			createOrReuseAssistantRequestRun(db, {
				...requestRunInput,
				clientMessageId: "different-message-id",
			}),
		).rejects.toBeInstanceOf(AssistantIdempotencyConflictError);
		expect(
			await db.assistantMessage.count({
				where: {
					conversationId: conversation.id,
					clientRequestId: { in: ["atomic-message-2", "different-message-id"] },
				},
			}),
		).toBe(1);

		await archiveAssistantConversation(db, {
			conversationId: conversation.id,
			ownerUserId,
			archived: true,
		});
		await expect(
			appendAssistantUserMessage(db, {
				conversationId: conversation.id,
				ownerUserId,
				clientRequestId: "client-message-2",
				parts: [{ type: "text", text: "should fail" }],
			}),
		).rejects.toBeInstanceOf(AssistantConversationAccessError);
		await archiveAssistantConversation(db, {
			conversationId: conversation.id,
			ownerUserId,
			archived: false,
		});

		const attachment = await db.storedDocument.create({
			data: {
				kind: "attachment",
				ownerType: "assistant_conversation",
				ownerId: scopedConversation.id,
				provider: "test",
				pathname: `assistant-test/${scopedConversation.id}/file.txt`,
				filename: "file.txt",
				mimeType: "text/plain",
				size: 4,
			},
		});
		await expect(
			appendAssistantUserMessage(db, {
				conversationId: conversation.id,
				ownerUserId,
				clientRequestId: "unowned-attachment",
				parts: [{ type: "file", documentId: attachment.id }],
			}),
		).rejects.toBeInstanceOf(AssistantMessageValidationError);
		const attachmentMessage = await appendAssistantUserMessage(db, {
			conversationId: scopedConversation.id,
			ownerUserId,
			scopeType: "organization",
			scopeId: "organization-a",
			clientRequestId: "owned-attachment",
			parts: [{ type: "file", documentId: attachment.id }],
		});
		expect(attachmentMessage.parts).toEqual([
			{
				type: "file",
				documentId: attachment.id,
				mediaType: "text/plain",
				filename: "file.txt",
			},
		]);
		await softDeleteAssistantConversation(db, {
			conversationId: scopedConversation.id,
			ownerUserId,
			scopeType: "organization",
			scopeId: "organization-a",
		});
		expect(
			await db.storedDocument.findUnique({ where: { id: attachment.id } }),
		).toMatchObject({ isCurrent: false });

		await softDeleteAssistantConversation(db, {
			conversationId: conversation.id,
			ownerUserId,
		});
		await expect(
			createOrReuseAssistantRun(db, {
				conversationId: conversation.id,
				ownerUserId,
				requestId: "run-request-1",
				triggerMessageId: message.id,
				catalogVersion: "catalog-v1",
				model: "test-model",
				promptVersion: "prompt-v1",
			}),
		).rejects.toBeInstanceOf(AssistantConversationAccessError);
	});
});
