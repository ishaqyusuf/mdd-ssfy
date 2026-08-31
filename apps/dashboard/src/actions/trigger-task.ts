"use server";

import { prisma } from "@/db";
import { AppError } from "@gnd/errors";
import { normalizeSalesInventoryLegacyStatus } from "@gnd/sales/sales-inventory-legacy-compatibility";
import { getSalesInventoryLegacyMigrationIdempotencyKey } from "@gnd/sales/sales-inventory-legacy-task";
import { writeSalesInventoryProjectionFailureIfCurrent } from "@gnd/sales/sales-inventory-projection-state";
import {
	bulkMarkSalesFulfilledRequestSchema,
	bulkMarkSalesProductionCompletedRequestSchema,
	queueSalesInventoryLegacyStatusMigrationSchema,
	taskNames,
} from "@jobs/schema";
import { idempotencyKeys, tasks } from "@trigger.dev/sdk/v3";
import { getLoggedInProfile } from "./cache/get-loggedin-profile";
import { actionClient } from "./safe-action";

import {
	logTaskRunStartFailure,
	logTriggeredTaskRun,
} from "@/lib/task-run-diagnostics.server";
import { getTaskStartErrorMessage } from "@/lib/task-start-error";
import { z } from "zod";

export const triggerTask = actionClient
	.schema(
		z.object({
			taskName: z.enum(taskNames),
			payload: z.any().nullable().optional(),
		}),
	)
	.metadata({
		name: "trigger-task",
	})
	.action(async ({ parsedInput: params }) => {
		let legacyFailureContext:
			| {
					salesOrderId: number;
					legacyStatus: string;
					expectedSalesUpdatedAt: Date;
			  }
			| undefined;
		try {
			let payload = params?.payload || {};
			let triggerOptions: Parameters<typeof tasks.trigger>[2] | undefined;
			if (params.taskName === "bulk-mark-sales-production-completed") {
				const request =
					bulkMarkSalesProductionCompletedRequestSchema.parse(payload);
				const actor = await getLoggedInProfile();
				if (!actor.userId) {
					throw new AppError({ code: "AUTHENTICATION_REQUIRED" });
				}
				if (!(actor.can?.viewProduction || actor.can?.editProduction)) {
					throw new AppError({
						code: "PERMISSION_DENIED",
						publicMessage:
							"You do not have permission to complete production work.",
					});
				}
				payload = {
					...request,
					actor: {
						id: actor.userId,
						name: actor.name || "Employee",
					},
				};
				triggerOptions = {
					idempotencyKey: await idempotencyKeys.create(
						`bulk-mark-sales-production-completed:${request.requestId}`,
						{ scope: "global" },
					),
					idempotencyKeyTTL: "7d",
				};
			}
			if (params.taskName === "bulk-mark-sales-fulfilled") {
				const request = bulkMarkSalesFulfilledRequestSchema.parse(payload);
				const actor = await getLoggedInProfile();
				if (!actor.userId) {
					throw new AppError({ code: "AUTHENTICATION_REQUIRED" });
				}
				if (!actor.can?.viewMarkSalesOrderFulfilled) {
					throw new AppError({
						code: "PERMISSION_DENIED",
						publicMessage:
							"You do not have permission to mark sales orders fulfilled.",
					});
				}
				payload = {
					...request,
					actor: {
						id: actor.userId,
						name: actor.name || "Employee",
					},
				};
				triggerOptions = {
					idempotencyKey: await idempotencyKeys.create(
						`bulk-mark-sales-fulfilled:${request.requestId}`,
						{ scope: "global" },
					),
					idempotencyKeyTTL: "7d",
				};
			}
			if (params.taskName === "update-sales-control") {
				const actor = await getLoggedInProfile();
				if (!actor.userId) {
					throw new AppError({ code: "AUTHENTICATION_REQUIRED" });
				}
				const input =
					payload && typeof payload === "object"
						? (payload as Record<string, unknown>)
						: {};
				const inputMeta =
					input.meta && typeof input.meta === "object"
						? (input.meta as Record<string, unknown>)
						: {};
				if (input.markAsCompleted && !actor.can?.viewMarkSalesOrderFulfilled) {
					throw new AppError({
						code: "PERMISSION_DENIED",
						publicMessage:
							"You do not have permission to mark sales orders fulfilled.",
					});
				}
				payload = {
					...input,
					meta: {
						...inputMeta,
						authorId: actor.userId,
						authorName: actor.name || "Employee",
						allowProductionSubmissionForOthers: Boolean(
							actor.can?.editProduction,
						),
					},
				};
			}
			if (params.taskName === "migrate-sales-inventory-legacy-status") {
				const request =
					queueSalesInventoryLegacyStatusMigrationSchema.parse(payload);
				const actor = await getLoggedInProfile();
				if (!actor.userId) {
					throw new AppError({ code: "AUTHENTICATION_REQUIRED" });
				}
				if (!actor.can?.editOrders) {
					throw new AppError({
						code: "PERMISSION_DENIED",
						publicMessage:
							"You do not have permission to adapt inventory for sales orders.",
					});
				}
				const expectedSalesUpdatedAt = new Date(request.savedOrderUpdatedAt);
				const currentOrder = await prisma.salesOrders.findFirst({
					where: {
						id: request.salesOrderId,
						deletedAt: null,
						type: "order",
						updatedAt: expectedSalesUpdatedAt,
					},
					select: { id: true, inventoryStatus: true },
				});
				if (
					!currentOrder ||
					normalizeSalesInventoryLegacyStatus(currentOrder.inventoryStatus) !==
						request.legacyStatus
				) {
					throw new AppError({
						code: "CONFLICT",
						publicMessage:
							"The saved order changed before legacy inventory adaptation could be queued. Refresh and try again.",
					});
				}
				legacyFailureContext = {
					salesOrderId: request.salesOrderId,
					legacyStatus: request.legacyStatus,
					expectedSalesUpdatedAt,
				};
				payload = {
					salesOrderId: request.salesOrderId,
					legacyStatus: request.legacyStatus,
					savedOrderUpdatedAt: request.savedOrderUpdatedAt,
					actor: {
						id: actor.userId,
						name: actor.name || "Employee",
					},
				};
				triggerOptions = {
					idempotencyKey: await idempotencyKeys.create(
						getSalesInventoryLegacyMigrationIdempotencyKey(request),
						{ scope: "global" },
					),
					idempotencyKeyTTL: "7d",
				};
			}
			const event = await tasks.trigger(
				params.taskName,
				payload,
				triggerOptions,
			);
			await logTriggeredTaskRun({
				taskName: params.taskName,
				payload,
				event,
			});

			return event;
		} catch (error) {
			if (legacyFailureContext) {
				try {
					await writeSalesInventoryProjectionFailureIfCurrent(prisma, {
						...legacyFailureContext,
						source: "legacy-status",
						error,
					});
				} catch (projectionError) {
					console.error(
						"Unable to persist legacy inventory task start failure",
						projectionError,
					);
				}
			}
			await logTaskRunStartFailure({
				taskName: params.taskName,
				payload: params.payload,
				error,
			});

			return {
				errorMessage: getTaskStartErrorMessage(error),
				id: null,
				publicAccessToken: null,
			};
		}
	});
