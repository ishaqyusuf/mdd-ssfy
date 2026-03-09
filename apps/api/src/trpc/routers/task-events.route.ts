import {
  getTaskEvent,
  getTaskEventHistory,
  getTaskEventRunStatus,
  getTaskEvents,
  runTaskEventNow,
  runTaskEventTest,
  updateTaskEvent,
} from "@api/db/queries/task-events";
import { createTRPCRouter, publicProcedure } from "../init";
import z from "zod";

export const taskEventsRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return getTaskEvents(ctx);
  }),
  get: publicProcedure
    .input(
      z.object({
        eventName: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return getTaskEvent(ctx, input.eventName);
    }),
  update: publicProcedure
    .input(
      z.object({
        eventName: z.string().min(1),
        status: z.enum(["active", "inactive"]).optional(),
        filter: z.record(z.string(), z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return updateTaskEvent(ctx, input);
    }),
  history: publicProcedure
    .input(
      z.object({
        eventName: z.string().min(1),
        page: z.number().int().min(1).optional(),
        size: z.number().int().min(1).max(100).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return getTaskEventHistory(ctx, input);
    }),
  runNow: publicProcedure
    .input(
      z.object({
        eventName: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return runTaskEventNow(ctx, input);
    }),
  runTest: publicProcedure
    .input(
      z.object({
        eventName: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return runTaskEventTest(ctx, input);
    }),
  runStatus: publicProcedure
    .input(
      z.object({
        runId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return getTaskEventRunStatus(ctx, input);
    }),
});
