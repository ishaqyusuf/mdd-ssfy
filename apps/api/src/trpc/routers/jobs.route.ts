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
import { saveNote } from "@gnd/utils/note";
import { generateJobId } from "@community/utils/job";
import { sum } from "@gnd/utils";
import { Notifications } from "@notifications/index";

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
  testActivity: publicProcedure.mutation(async (props) => {
    const notifications = new Notifications(props.ctx.db);
    await notifications.create(
      "job_assigned",
      {
        assignedToId: 1,
        // authorId: 2,
        jobId: 234,
      },
      // userIds
      // [1],
      {
        userIds: [1],
        userIdType: "user",
        authorId: 1,
        authorIdType: "user",

        // template: "job-assigned",
      },
    );
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
  overview: publicProcedure
    .input(
      z.object({
        jobId: z.number(),
      }),
    )
    .query(async (props) => {
      const { ctx, input } = props;
      const db = ctx.db;
      const [job] =
        (
          await getJobs(ctx, {
            jobId: input.jobId,
          })
        )?.data || [];
      if (!job) throw new Error("Job not found");
      const tasks: {
        title: string;
        qty: number;
        rate: number;
        total: number;
        maxQty: number | null;
      }[] = (
        await (async () => {
          if (job?.isCustom) return [];
          if (job.meta?.costData) {
            const i = await getInstallCosts(ctx);
            return i.data?.list?.map((l) => {
              const v = job.meta?.costData?.[l.uid];
              return {
                title: String(l.title),
                qty: v?.qty || 0,
                rate: v?.cost || 0,
                // maxQty: l?.
                maxQty: null,
                total: +((v?.cost || 0) * (v?.qty || 0))?.toFixed(2),
              };
            });
          }
          return job.jobInstallTasks.map((t) => {
            return {
              title: t.communityModelInstallTask?.installCostModel?.title!,
              qty: t.qty || 0,
              maxQty: t.maxQty,
              rate: t.rate || 0,
              total: +((t.rate || 0) * (t.qty || 0))?.toFixed(2),
            };
          });
        })()
      ).filter((t) => t.qty > 0);
      return {
        ...job,
        financials: {
          addonPercent: job?.meta?.addonPercent,
          addonValue: job?.meta?.addon,
          extraCharge: job?.meta?.additional_cost || 0,
          total: job?.amount,
          subtotal: sum([
            job?.amount,
            -1 * (job?.meta?.addon || 0),
            -1 * (job?.meta?.additional_cost || 0),
          ]),
        },
        tasks,
      };
    }),
});
