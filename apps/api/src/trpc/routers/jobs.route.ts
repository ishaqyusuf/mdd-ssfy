import {
  adminAnalytics,
  adminAnalyticsSchema,
  createJob,
  createJobSchema,
  earningAnalytics,
  earningAnalyticsSchema,
  getInstallCosts,
  getInstallCostsSchema,
  getJobAnalytics,
  getJobAnalyticsSchema,
  getJobForm,
  getJobFormSchema,
  getJobs,
  getJobsSchema,
} from "@api/db/queries/jobs";
import { createTRPCRouter, publicProcedure } from "../init";
import z from "zod";
import { dataAsType } from "@gnd/utils";
import { saveNote } from "@gnd/utils/note";
import { generateJobId } from "@community/utils/job";

export const jobRoutes = createTRPCRouter({
  deleteJob: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async (props) => {
      // return deleteJob(props.ctx, props.input);
      await props.ctx.db.jobs.update({
        where: { id: props.input.id },
        data: {
          deletedAt: new Date(),
        },
      });
      // update job activity deleted.
      // notify assigned worker of deletion
    }),
  getJobActivityHistory: publicProcedure
    .input(
      z.object({
        jobId: z.number(),
      }),
    )
    .query(async (props) => {
      const { ctx, input } = props;
      const db = ctx.db;
      // const activities = await db.notifications.findMany({
      //   where: {
      //     jobId: input.jobId,
      //   },
      //   orderBy: {
      //     createdAt: "desc",
      //   },
      // });
      // return dataAsType(activities);
      return [];
    }),
  restoreJob: publicProcedure
    .input(
      z.object({
        jobId: z.number(),
      }),
    )
    .mutation(async (props) => {
      const { ctx, input } = props;
      const db = ctx.db;
      await props.ctx.db.jobs.update({
        where: { id: props.input.jobId, deletedAt: {} },
        data: {
          deletedAt: null,
        },
      });
      // return restoreJob(props.ctx, props.input);
    }),
  reAssignJob: publicProcedure
    .input(
      z.object({
        jobId: z.number(),
        oldUserId: z.number(),
        newUserId: z.number(),
      }),
    )
    .mutation(async (props) => {
      const { ctx, input } = props;
      const db = ctx.db;
      // return reAssignJob(props.ctx, props.input);
      const job = await db.jobs.update({
        where: {
          id: input.jobId,
        },
        data: {
          user: {
            connect: {
              id: input.newUserId,
            },
          },
        },
      });
      await saveNote(
        ctx.db,
        {
          headline: `Job Reassigned`,
          note: generateJobId(input.jobId),
          subject: `Re-assignment`,
          tags: [
            {
              tagName: "jobControlId",
              tagValue: job?.controlId!,
            },
            {
              tagName: "jobId",
              tagValue: String(input.jobId),
            },
          ],
        },
        ctx.userId!,
      );
    }),
  jobReview: publicProcedure
    .input(
      z.object({
        action: z.enum(["approve", "reject"]),
        note: z.string().optional(),
        jobId: z.number(),
      }),
    )
    .mutation(async (props) => {
      const { ctx, input } = props;

      const db = ctx.db;
      const job = await db.jobs.update({
        where: {
          id: input.jobId,
        },
        data: {
          status: input.action == "approve" ? "Approved" : "Rejected",
          statusDate: new Date(),
        },
      });
      await saveNote(
        ctx.db,
        {
          headline: input.action == "approve" ? "Job Approved" : "Job Rejected",
          note: generateJobId(input.jobId),
          subject: input?.action == "approve" ? `` : ``,
          tags: [
            {
              tagName: "jobControlId",
              tagValue: job?.controlId!,
            },
            {
              tagName: "jobId",
              tagValue: String(input.jobId),
            },
          ],
        },
        ctx.userId!,
      );
      // return jobReview(props.ctx, props.input);
    }),
  getJobForm: publicProcedure.input(getJobFormSchema).query(async (props) => {
    return getJobForm(props.ctx, props.input);
  }),
  getJobs: publicProcedure.input(getJobsSchema).query(async (props) => {
    return getJobs(props.ctx, props.input);
  }),
  getInstallCosts: publicProcedure
    .input(getInstallCostsSchema)
    .query(async (props) => {
      return getInstallCosts(props.ctx, props.input);
    }),
  getJobAnalytics: publicProcedure
    .input(getJobAnalyticsSchema)
    .query(async (props) => {
      return getJobAnalytics(props.ctx, props.input);
    }),
  earningAnalytics: publicProcedure
    .input(earningAnalyticsSchema)
    .query(async (props) => {
      return earningAnalytics(props.ctx, props.input);
    }),
  createJob: publicProcedure.input(createJobSchema).mutation(async (props) => {
    return createJob(props.ctx, props.input);
  }),
  adminAnalytics: publicProcedure
    .input(adminAnalyticsSchema)
    .query(async (props) => {
      return adminAnalytics(props.ctx, props.input);
    }),
});
