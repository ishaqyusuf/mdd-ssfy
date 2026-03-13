import { createTRPCRouter, publicProcedure } from "../init";
import {
  dispatchQueryParamsSchema,
  resolveDuplicateDispatchGroupSchema,
  salesDispatchOverviewSchema,
  updateDispatchDriverSchema,
  updateDispatchDueDateSchema,
  updateDispatchStatusSchema,
  updateSalesDeliveryOptionSchema,
} from "@api/schemas/sales";
import {
  findDuplicateDispatchGroups,
  getDispatches,
  getDispatchOverview,
  getDispatchOverviewV2,
  getSalesDeliveryInfo,
  resolveDuplicateDispatchGroup,
  updateDispatchDriver,
  updateDispatchDueDate,
  updateDispatchStatus,
  updateSalesDeliveryOption,
} from "@api/db/queries/dispatch";
import { z } from "zod";
import {
  cancelDispatchTask,
  createDispatchSchema,
  deletePackingItem,
  deletePackingSchema,
  getSalesDispatchOverview,
  submitNonProductionsTask,
  startDispatchTask,
  submitDispatchTask,
  updateSalesControlSchema,
} from "@sales/exports";
import type { SalesDispatchStatus } from "@sales/types";
import type { DeliveryOption } from "@gnd/utils/sales";
import { tasks } from "@trigger.dev/sdk/v3";
import type { NotificationJobInput } from "@notifications/schemas";
import { TRPCError } from "@trpc/server";
import { appendDevLogEntryToFile } from "@gnd/dev-logger/file-sink";
import type { DevLogEntry } from "@gnd/dev-logger";

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
      return cancelDispatchTask(props.ctx.db, props.input);
    }),
  startDispatch: publicProcedure
    .input(updateSalesControlSchema)
    .mutation(async (props) => {
      return startDispatchTask(props.ctx.db, props.input);
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
      await submitNonProductionsTask(props.ctx.db as any, {
        meta: {
          salesId: props.input.salesId,
          authorId: Number.isFinite(authorId) && authorId > 0 ? authorId : 1,
          authorName: "System",
        },
      } as any);
      return { ok: true };
    }),
  createDispatch: publicProcedure
    .input(createDispatchSchema)
    .mutation(async (props) => {
      let { salesId, deliveryMode, dueDate, driverId, status } = props.input;
      if (driverId) driverId = Number(driverId);
      const dispatch = await props.ctx.db.orderDelivery.create({
        data: {
          deliveryMode: deliveryMode || ("delivery" as DeliveryOption),
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
      try {
        const authorId = Number(props.ctx.userId || 0);
        await submitNonProductionsTask(props.ctx.db as any, {
          meta: {
            salesId,
            authorId: Number.isFinite(authorId) && authorId > 0 ? authorId : 1,
            authorName: "System",
          },
        } as any);
      } catch {
        // Do not block dispatch creation if pre-pack preparation fails.
      }
      await tasks.trigger("notification", {
        channel: "sales_dispatch_created",
        author: {
          id: props.ctx.userId!,
          role: "employee",
        },
        payload: {
          orderNo: dispatch.order?.orderId,
          dispatchId: dispatch.id,
          deliveryMode: dispatch.deliveryMode,
          dueDate: dispatch.dueDate,
          driverId: dispatch.driverId || undefined,
        },
      } as NotificationJobInput);
      if (dispatch.driverId)
        await tasks.trigger("notification", {
          channel: "sales_dispatch_assigned",
          author: {
            id: props.ctx.userId!,
            role: "employee",
          },
          recipients: [
            {
              ids: [dispatch.driverId],
              role: "employee",
            },
          ],
          payload: {
            orderNo: dispatch.order?.orderId,
            dispatchId: dispatch.id,
            deliveryMode: dispatch.deliveryMode,
            dueDate: dispatch.dueDate,
            driverId: dispatch.driverId,
          },
        } as NotificationJobInput);
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
});
