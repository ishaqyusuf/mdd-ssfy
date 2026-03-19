import {
  findDuplicateDispatchGroups,
  getDispatchOverview,
  getDispatchOverviewV2,
  getDispatchSummary,
  getDispatches,
  getSalesDeliveryInfo,
  resolveDuplicateDispatchGroup,
  updateDispatchDriver,
  updateDispatchDueDate,
  updateDispatchStatus,
  updateSalesDeliveryOption,
  bulkAssignDispatchDriver,
  bulkCancelDispatches,
  exportDispatches,
  getDeletedDispatches,
  restoreDispatch,
} from "@api/db/queries/dispatch";
import {
  dispatchQueryParamsSchema,
  resolveDuplicateDispatchGroupSchema,
  salesDispatchOverviewSchema,
  updateDispatchDriverSchema,
  updateDispatchDueDateSchema,
  updateDispatchStatusSchema,
  updateSalesDeliveryOptionSchema,
  bulkAssignDriverSchema,
  bulkCancelDispatchSchema,
  exportDispatchesSchema,
} from "@api/schemas/sales";
import { createApiVercelBlobDocumentService } from "@api/utils/documents";
import type { DevLogEntry } from "@gnd/dev-logger";
import { appendDevLogEntryToFile } from "@gnd/dev-logger/file-sink";
import type { DeliveryOption } from "@gnd/utils/sales";
import { NotificationService } from "@notifications/services/triggers";
import {
  cancelDispatchTask,
  createDispatchSchema,
  deletePackingItem,
  deletePackingSchema,
  getSalesDispatchOverview,
  startDispatchTask,
  submitDispatchTask,
  submitNonProductionsTask,
  updateSalesControlSchema,
} from "@sales/exports";
import type { SalesDispatchStatus } from "@sales/types";
import { tasks } from "@trigger.dev/sdk/v3";
import { TRPCError } from "@trpc/server";
import { put } from "@vercel/blob";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import type { TRPCContext } from "../init";

function getDispatchNotificationService(ctx: TRPCContext) {
  return new NotificationService(tasks, {
    db: ctx.db,
    userId: ctx.userId,
  });
}

export const dispatchRouters = createTRPCRouter({
  index: publicProcedure
    .input(dispatchQueryParamsSchema)
    .query(async (props) => {
      return getDispatches(props.ctx, props.input);
    }),
  assignedDispatch: publicProcedure
    .input(dispatchQueryParamsSchema)
    .query(async (props) => {
      props.input.driversId = [props.ctx?.userId!];
      return getDispatches(props.ctx, props.input);
    }),
  deletePackingItem: publicProcedure
    .input(deletePackingSchema)
    .mutation(async (props) => {
      return deletePackingItem(props.ctx.db, props.input);
    }),
  cancelDispatch: publicProcedure
    .input(updateSalesControlSchema)
    .mutation(async (props) => {
      const response = await cancelDispatchTask(props.ctx.db, props.input);
      const dispatchId = props.input.cancelDispatch?.dispatchId;
      if (dispatchId) {
        const dispatch = await props.ctx.db.orderDelivery.findFirst({
          where: {
            id: dispatchId,
            deletedAt: null,
          },
          select: {
            id: true,
            status: true,
            dueDate: true,
            deliveryMode: true,
            driverId: true,
            order: {
              select: {
                orderId: true,
              },
            },
          },
        });
        if (dispatch?.status === "cancelled") {
          await getDispatchNotificationService(props.ctx).send(
            "sales_dispatch_trip_canceled",
            {
              payload: {
                orderNo: dispatch.order?.orderId || undefined,
                dispatchId: dispatch.id,
                deliveryMode: dispatch.deliveryMode || undefined,
                dueDate: dispatch.dueDate || undefined,
                driverId: dispatch.driverId || undefined,
              },
            },
          );
        }
      }
      return response;
    }),
  startDispatch: publicProcedure
    .input(updateSalesControlSchema)
    .mutation(async (props) => {
      const response = await startDispatchTask(props.ctx.db, props.input);
      const dispatchId = props.input.startDispatch?.dispatchId;
      if (dispatchId) {
        const dispatch = await props.ctx.db.orderDelivery.findFirst({
          where: {
            id: dispatchId,
            deletedAt: null,
          },
          select: {
            id: true,
            status: true,
            dueDate: true,
            deliveryMode: true,
            driverId: true,
            order: {
              select: {
                orderId: true,
              },
            },
          },
        });
        if (dispatch?.status === "in progress") {
          await getDispatchNotificationService(props.ctx).send(
            "sales_dispatch_in_progress",
            {
              payload: {
                orderNo: dispatch.order?.orderId || undefined,
                dispatchId: dispatch.id,
                deliveryMode: dispatch.deliveryMode || undefined,
                dueDate: dispatch.dueDate || undefined,
                driverId: dispatch.driverId || undefined,
              },
            },
          );
        }
      }
      return response;
    }),
  submitDispatch: publicProcedure
    .input(updateSalesControlSchema)
    .mutation(async (props) => {
      return submitDispatchTask(props.ctx.db, props.input);
    }),
  updateSalesDeliveryOption: publicProcedure
    .input(updateSalesDeliveryOptionSchema)
    .mutation(async (props) => {
      return updateSalesDeliveryOption(props.ctx, props.input);
    }),
  updateDispatchDriver: publicProcedure
    .input(updateDispatchDriverSchema)
    .mutation(async (props) => {
      return updateDispatchDriver(props.ctx, props.input);
    }),
  updateDispatchDueDate: publicProcedure
    .input(updateDispatchDueDateSchema)
    .mutation(async (props) => {
      return updateDispatchDueDate(props.ctx, props.input);
    }),
  updateDispatchStatus: publicProcedure
    .input(updateDispatchStatusSchema)
    .mutation(async (props) => {
      return updateDispatchStatus(props.ctx, props.input);
    }),
  salesDeliveryInfo: publicProcedure
    .input(
      z.object({
        salesId: z.number().nullable().optional(),
      }),
    )
    .query(async (props) => {
      return getSalesDeliveryInfo(props.ctx, props.input.salesId);
    }),
  orderDispatchOverview: publicProcedure
    .input(salesDispatchOverviewSchema)
    .query(async (props) => {
      return getSalesDispatchOverview(props.ctx.db, {
        salesId: props.input.salesId,
        salesNo: props.input.salesNo,
      });
    }),
  dispatchOverview: publicProcedure
    .input(salesDispatchOverviewSchema)
    .query(async (props) => {
      return getDispatchOverview(props.ctx, props.input);
    }),
  dispatchOverviewV2: publicProcedure
    .input(salesDispatchOverviewSchema)
    .query(async (props) => {
      return getDispatchOverviewV2(props.ctx, props.input);
    }),
  findDuplicateGroups: publicProcedure.query(async (props) => {
    return findDuplicateDispatchGroups(props.ctx);
  }),
  resolveDuplicateGroup: publicProcedure
    .input(resolveDuplicateDispatchGroupSchema)
    .mutation(async (props) => {
      return resolveDuplicateDispatchGroup(props.ctx, props.input);
    }),
  prepareNonProduceablePacking: publicProcedure
    .input(
      z.object({
        salesId: z.number(),
      }),
    )
    .mutation(async (props) => {
      const authorId = Number(props.ctx.userId || 0);
      await submitNonProductionsTask(
        props.ctx.db as any,
        {
          meta: {
            salesId: props.input.salesId,
            authorId: Number.isFinite(authorId) && authorId > 0 ? authorId : 1,
            authorName: "System",
          },
        } as any,
      );
      return { ok: true };
    }),
  createDispatch: publicProcedure
    .input(createDispatchSchema)
    .mutation(async (props) => {
      let {
        salesId,
        deliveryMode: _deliverMode,
        dueDate,
        driverId,
        status,
      } = props.input;
      const deliveryMode = (_deliverMode || "delivery") as DeliveryOption;
      if (driverId) driverId = Number(driverId);
      const dispatch = await props.ctx.db.orderDelivery.create({
        data: {
          deliveryMode,
          createdBy: {
            connect: {
              id: props.ctx.userId!,
            },
          },
          driver: driverId
            ? {
                connect: {
                  id: driverId,
                },
              }
            : undefined,
          status: status || ("queue" as SalesDispatchStatus),
          dueDate,
          meta: {},
          order: {
            connect: { id: salesId },
          },
        },
        include: {
          order: {
            select: {
              orderId: true,
            },
          },
        },
      });
      // try {
      //   const authorId = Number(props.ctx.userId || 0);
      //   await submitNonProductionsTask(
      //     props.ctx.db as any,
      //     {
      //       meta: {
      //         salesId,
      //         authorId:
      //           Number.isFinite(authorId) && authorId > 0 ? authorId : 1,
      //         authorName: "System",
      //       },
      //     } as any,
      //   );
      // } catch {
      //   // Do not block dispatch creation if pre-pack preparation fails.
      // }
      await getDispatchNotificationService(props.ctx).send(
        "sales_dispatch_created",
        {
          payload: {
            orderNo: dispatch.order?.orderId,
            dispatchId: dispatch.id,
            deliveryMode,
            dueDate: dispatch.dueDate!,
            driverId: dispatch.driverId || undefined,
          },
        },
      );
      if (dispatch.driverId) {
        await getDispatchNotificationService(props.ctx)
          .setEmployeeRecipients(dispatch.driverId)
          .send("sales_dispatch_assigned", {
            payload: {
              orderNo: dispatch.order?.orderId,
              dispatchId: dispatch.id,
              deliveryMode,
              dueDate: dispatch.dueDate!,
              driverId: dispatch.driverId,
            },
          });
      }
      // await tasks.
      return dispatch;
    }),
  deleteDispatch: publicProcedure
    .input(
      z.object({
        dispatchId: z.number(),
      }),
    )
    .mutation(async (props) => {
      const dispatch = await props.ctx.db.orderDelivery.findFirst({
        where: {
          id: props.input.dispatchId,
          deletedAt: null,
        },
        select: {
          status: true,
        },
      });
      if (!dispatch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "DISPATCH_NOT_FOUND",
        });
      }
      if (dispatch.status === "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Completed dispatch cannot be deleted.",
        });
      }
      await props.ctx.db.orderDelivery.update({
        where: {
          id: props.input.dispatchId,
        },
        data: {
          deletedAt: new Date(),
        },
      });
      // return deletePackingItem(props.ctx.db, props.input);
    }),
  debugLog: publicProcedure
    .input(
      z.object({
        entry: z.any(),
      }),
    )
    .mutation(async (props) => {
      const isDev = process.env.NODE_ENV === "development";
      const enabled =
        String(process.env.EXPO_PUBLIC_DEBUG_LOGGER ?? "1").toLowerCase() !==
        "false";
      if (!isDev || !enabled) {
        return { ok: true, skipped: true };
      }
      await appendDevLogEntryToFile(props.input.entry as DevLogEntry);
      return { ok: true, skipped: false };
    }),
  uploadDispatchDocument: publicProcedure
    .input(
      z.object({
        filename: z.string().min(1),
        folder: z.string().optional(),
        contentType: z.string().optional(),
        kind: z.enum(["base64", "text"]).default("base64"),
        content: z.string().min(1),
      }),
    )
    .mutation(async (props) => {
      const documents = createApiVercelBlobDocumentService({
        put,
      });
      const body =
        props.input.kind === "text"
          ? props.input.content
          : Buffer.from(props.input.content, "base64");
      const uploaded = await documents.upload({
        filename: props.input.filename,
        folder: props.input.folder || "dispatch",
        contentType: props.input.contentType,
        body,
      });
      return {
        provider: uploaded.provider,
        pathname: uploaded.pathname,
        url: uploaded.url || uploaded.pathname,
      };
    }),
  dispatchSummary: publicProcedure.query(async (props) => {
    return getDispatchSummary(props.ctx);
  }),
  bulkAssignDriver: publicProcedure
    .input(bulkAssignDriverSchema)
    .mutation(async (props) => {
      return bulkAssignDispatchDriver(props.ctx, props.input);
    }),
  bulkCancel: publicProcedure
    .input(bulkCancelDispatchSchema)
    .mutation(async (props) => {
      return bulkCancelDispatches(props.ctx, props.input);
    }),
  exportDispatches: publicProcedure
    .input(exportDispatchesSchema)
    .query(async (props) => {
      return exportDispatches(props.ctx, props.input);
    }),
  getDeleted: publicProcedure.query(async (props) => {
    return getDeletedDispatches(props.ctx);
  }),
  restore: publicProcedure
    .input(z.object({ dispatchId: z.number() }))
    .mutation(async (props) => {
      return restoreDispatch(props.ctx, props.input.dispatchId);
    }),
});
