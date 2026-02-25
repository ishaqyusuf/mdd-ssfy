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
import type { JobStatus } from "@community/types";
import { tasks } from "@trigger.dev/sdk/v3";
import { NotificationService } from "@notifications/services/triggers";
// import { Notifications } from "@notifications/index";

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
      const {} = ctx;
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
      if (job.userId) {
        const s = new NotificationService(tasks, ctx).setEmployeeRecipients(
          job.userId,
        );

        if (input.action === "approve") {
          await s.jobApproved({
            jobId: input.jobId,
            assignedToId: job.userId,
            note: input.note,
          });
        } else {
          await s.jobRejected({
            jobId: input.jobId,
            assignedToId: job.userId,
            note: input.note,
          });
        }
      }
    }),
  cancelPayment: publicProcedure
    .input(
      z.object({
        jobId: z.number(),
        note: z.string().optional(),
      }),
    )
    .mutation(async (props) => {
      const { ctx, input } = props;
      const db = ctx.db;
      const job = await db.jobs.findFirst({
        where: {
          id: input.jobId,
          deletedAt: null,
        },
        select: {
          id: true,
          paymentId: true,
          controlId: true,
        },
      });
      if (!job) throw new Error("Job not found");
      if (!job.paymentId) throw new Error("Job has no payment to cancel");

      const paymentId = job.paymentId;
      await db.jobs.update({
        where: {
          id: input.jobId,
        },
        data: {
          status: "Payment Cancelled",
          statusDate: new Date(),
          paymentId: null,
        },
      });
      await db.jobPayments.delete({
        where: {
          id: paymentId,
        },
      });
      await saveNote(
        ctx.db,
        {
          headline: "Job Payment Cancelled",
          note: input.note || generateJobId(input.jobId),
          subject: "",
          tags: [
            {
              tagName: "jobControlId",
              tagValue: job.controlId!,
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
  testActivity: publicProcedure.mutation(async (props) => {
    // const notifications = new Notifications(props.ctx.db);
    // await notifications.create(
    //   "job_assigned",
    //   {
    //     assignedToId: 1,
    //     // authorId: 2,
    //     jobId: 234,
    //   },
    //   // userIds
    //   // [1],
    //   {
    //     userIds: [1],
    //     userIdType: "employee",
    //     authorId: 1,
    //     authorIdType: "employee",
    //     // template: "job-assigned",
    //   },
    // );
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
  getKpis: publicProcedure.input(getJobsSchema).query(async (props) => {
    // const jobs = await getJobs(props.ctx, props.input);
    const db = props.ctx.db;
    const [
      totalCustomJobs,
      totalCustomJobsAmount,
      totalJobs,
      totalJobsAmount,
      totalPendingReviews,
    ] = await Promise.all([
      db.jobs.count({
        where: {
          isCustom: true,
          deletedAt: null,
        },
      }),
      db.jobs.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          isCustom: true,
          deletedAt: null,
        },
      }),
      db.jobs.count({
        where: {
          deletedAt: null,
        },
      }),
      db.jobs.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          deletedAt: null,
        },
      }),
      db.jobs.count({
        where: {
          status: "Submitted" as JobStatus,
          deletedAt: null,
          paymentId: null,
        },
      }),
    ]);
    return {
      totalCustomJobs,
      totalCustomJobsAmount: totalCustomJobsAmount._sum.amount || 0,
      totalJobs,
      totalJobsAmount: totalJobsAmount._sum.amount || 0,
      totalPendingReviews,
    };
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
  paymentOverview: publicProcedure
    .input(
      z.object({
        paymentId: z.number(),
      }),
    )
    .query(async (props) => {
      const { ctx, input } = props;
      const payment = await ctx.db.jobPayments.findFirst({
        where: {
          id: input.paymentId,
          deletedAt: null,
        },
        select: {
          id: true,
          amount: true,
          charges: true,
          subTotal: true,
          checkNo: true,
          paymentMethod: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          payer: {
            select: {
              id: true,
              name: true,
            },
          },
          jobs: {
            where: {
              deletedAt: null,
            },
            orderBy: {
              id: "asc",
            },
            select: {
              id: true,
              title: true,
              subtitle: true,
              amount: true,
              status: true,
              statusDate: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
      if (!payment) {
        throw new Error("Payment not found");
      }
      return payment;
    }),
});
