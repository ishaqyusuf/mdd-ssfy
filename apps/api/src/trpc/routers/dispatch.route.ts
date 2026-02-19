import { createTRPCRouter, publicProcedure } from "../init";
import {
  dispatchQueryParamsSchema,
  salesDispatchOverviewSchema,
  updateSalesDeliveryOptionSchema,
} from "@api/schemas/sales";
import {
  getDispatches,
  getDispatchOverview,
  getSalesDeliveryInfo,
  updateSalesDeliveryOption,
} from "@api/db/queries/dispatch";
import { z } from "zod";
import {
  cancelDispatchTask,
  createDispatchSchema,
  deletePackingItem,
  deletePackingSchema,
  getSalesDispatchOverview,
  startDispatchTask,
  submitDispatchTask,
  updateSalesControlSchema,
} from "@sales/exports";
import type { SalesDispatchStatus } from "@sales/types";
import type { DeliveryOption } from "@gnd/utils/sales";
import { tasks } from "@trigger.dev/sdk/v3";
import type { NotificationJobInput } from "@notifications/schemas";

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
  createDispatch: publicProcedure
    .input(createDispatchSchema)
    .mutation(async (props) => {
      const { salesId, deliveryMode, dueDate, driverId, status } = props.input;
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
});
