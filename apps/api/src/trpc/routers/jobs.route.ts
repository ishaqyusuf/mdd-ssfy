import {
	adminAnalytics,
	adminAnalyticsSchema,
	cancelContractorPayment,
	cancelContractorPaymentSchema,
	createJob,
	createPaymentPortal,
	createPaymentPortalSchema,
	getContractorPayoutOverview,
	getContractorPayoutPrintData,
	getContractorPayoutPrintSchema,
	getContractorPayoutOverviewSchema,
	getContractorPayouts,
	getContractorPayoutsSchema,
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
	getPaymentDashboard,
	getPaymentDashboardSchema,
	getPaymentPortal,
	getPaymentPortalSchema,
	reverseCancelledContractorPayment,
	reverseCancelledContractorPaymentSchema,
} from "@api/db/queries/jobs";
import { sortInstallCosts } from "@api/utils/install-cost-sort";
import { createJobSchema } from "@community/create-job-schema";
import type { JobStatus } from "@community/types";
import { generateJobId } from "@community/utils/job";
import { sum } from "@gnd/utils";
import { saveNote } from "@gnd/utils/note";
import { NotificationService } from "@notifications/services/triggers";
import { tasks } from "@trigger.dev/sdk/v3";
import z from "zod";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
	type TRPCContext,
} from "../init";
// import { Notifications } from "@notifications/index";

function serializeTagValue(value: unknown): string {
	if (value === undefined) return "null";
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

const jobReviewInputSchema = z.object({
	action: z.enum(["submit", "approve", "reject"]),
	note: z.string().optional(),
	jobId: z.number(),
});

type JobReviewInput = z.infer<typeof jobReviewInputSchema>;
type NotificationTasks = ConstructorParameters<typeof NotificationService>[0];

function logJobReviewSideEffectError(
	stage: "activity" | "notification",
	input: JobReviewInput,
	error: unknown,
) {
	console.error(
		`[jobs.jobReview] Failed to run ${stage} side effect for ${input.action} on job ${input.jobId}`,
		error,
	);
}

function getJobReviewStatus(action: JobReviewInput["action"]): JobStatus {
	if (action === "submit") return "Submitted";
	if (action === "approve") return "Approved";
	return "Rejected";
}

function getJobReviewHeadline(action: JobReviewInput["action"]) {
	if (action === "submit") return "Job Submitted";
	if (action === "approve") return "Job Approved";
	return "Job Rejected";
}

export async function reviewJobStatus(
	ctx: {
		db: TRPCContext["db"];
		userId: number;
	},
	input: JobReviewInput,
	options: {
		notificationTasks?: NotificationTasks;
	} = {},
) {
	const db = ctx.db;
	const job = await db.jobs.update({
		where: {
			id: input.jobId,
		},
		data: {
			status: getJobReviewStatus(input.action),
			statusDate: new Date(),
		},
	});

	try {
		await saveNote(
			ctx.db,
			{
				headline: getJobReviewHeadline(input.action),
				note: generateJobId(input.jobId),
				subject: "",
				tags: [
					{
						tagName: "jobControlId",
						tagValue: job?.controlId || generateJobId(input.jobId),
					},
					{
						tagName: "jobId",
						tagValue: String(input.jobId),
					},
				],
			},
			ctx.userId,
		);
	} catch (error) {
		logJobReviewSideEffectError("activity", input, error);
	}

	if (job.userId) {
		try {
			const notification = new NotificationService(
				options.notificationTasks ?? tasks,
				ctx,
			).setEmployeeRecipients(job.userId);

			if (input.action === "submit") {
				await notification.channel.jobSubmitted({
					jobId: input.jobId,
				});
			} else if (input.action === "approve") {
				await notification.channel.jobApproved({
					jobId: input.jobId,
					contractorId: job.userId,
					note: input.note,
				});
			} else {
				await notification.channel.jobRejected({
					jobId: input.jobId,
					contractorId: job.userId,
					note: input.note,
				});
			}
		} catch (error) {
			logJobReviewSideEffectError("notification", input, error);
		}
	}

	return job;
}

export const jobRoutes = createTRPCRouter({
	deleteJob: publicProcedure
		.input(
			z.object({
				id: z.number(),
			}),
		)
		.mutation(async (props) => {
			const job = await props.ctx.db.jobs.findFirst({
				where: {
					id: props.input.id,
					deletedAt: null,
				},
				select: {
					id: true,
					userId: true,
				},
			});
			if (!job) throw new Error("Job not found");
			await props.ctx.db.jobs.update({
				where: { id: props.input.id },
				data: {
					deletedAt: new Date(),
				},
			});
			const notification = new NotificationService(tasks, props.ctx);
			if (job.userId) {
				notification.setEmployeeRecipients(job.userId);
			}
			await notification.channel.jobDeleted({
				jobId: job.id,
			});
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
			const { ctx } = props;
			const restored = await props.ctx.db.jobs.update({
				where: { id: props.input.jobId, deletedAt: {} },
				data: {
					deletedAt: null,
				},
				select: {
					id: true,
					userId: true,
					user: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			});
			if (restored.userId) {
				const notification = new NotificationService(
					tasks,
					ctx,
				).setEmployeeRecipients(restored.userId);
				await notification.channel.jobAssigned({
					jobId: restored.id,
					assignedToId: restored.userId,
					assignedToName: restored.user?.name || "",
				});
			}
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
			const notification = new NotificationService(
				tasks,
				ctx,
			).setEmployeeRecipients(input.newUserId);
			await notification.channel.jobAssigned({
				jobId: input.jobId,
				assignedToId: input.newUserId,
				assignedToName: "",
			});
		}),
	jobReview: protectedProcedure
		.input(jobReviewInputSchema)
		.mutation(async (props) => {
			return reviewJobStatus(props.ctx, props.input);
		}),
	cancelPayment: publicProcedure
		.input(
			z.object({
				jobId: z.number(),
				note: z.string().optional(),
			}),
		)
		.mutation(async (props) => {
			const job = await props.ctx.db.jobs.findFirst({
				where: {
					id: props.input.jobId,
					deletedAt: null,
				},
				select: {
					paymentId: true,
				},
			});
			if (!job) throw new Error("Job not found");
			if (!job.paymentId) throw new Error("Job has no payment to cancel");

			return cancelContractorPayment(props.ctx, {
				paymentId: job.paymentId,
				note: props.input.note,
			});
		}),
	cancelContractorPayment: publicProcedure
		.input(cancelContractorPaymentSchema)
		.mutation(async (props) => {
			return cancelContractorPayment(props.ctx, props.input);
		}),
	reverseCancelledContractorPayment: publicProcedure
		.input(reverseCancelledContractorPaymentSchema)
		.mutation(async (props) => {
			return reverseCancelledContractorPayment(props.ctx, props.input);
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
	paymentDashboard: publicProcedure
		.input(getPaymentDashboardSchema)
		.query(async (props) => {
			return getPaymentDashboard(props.ctx, props.input);
		}),
	paymentPortal: publicProcedure
		.input(getPaymentPortalSchema)
		.query(async (props) => {
			return getPaymentPortal(props.ctx, props.input);
		}),
	contractorPayouts: publicProcedure
		.input(getContractorPayoutsSchema)
		.query(async (props) => {
			return getContractorPayouts(props.ctx, props.input);
		}),
	contractorPayoutOverview: publicProcedure
		.input(getContractorPayoutOverviewSchema)
		.query(async (props) => {
			return getContractorPayoutOverview(props.ctx, props.input);
		}),
	getContractorPayoutPrintData: publicProcedure
		.input(getContractorPayoutPrintSchema)
		.query(async (props) => {
			return getContractorPayoutPrintData(props.ctx, props.input);
		}),
	createPaymentPortal: publicProcedure
		.input(createPaymentPortalSchema)
		.mutation(async (props) => {
			return createPaymentPortal(props.ctx, props.input);
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
			const [requestCount, configuredCount] = await Promise.all([
				db.notePad.count({
					where: {
						AND: [
							{
								tags: {
									some: {
										tagName: "jobId",
										tagValue: serializeTagValue(input.jobId),
									},
								},
							},
							{
								tags: {
									some: {
										tagName: "channel",
										tagValue: serializeTagValue("job_task_configure_request"),
									},
								},
							},
						],
					},
				}),
				db.notePad.count({
					where: {
						AND: [
							{
								tags: {
									some: {
										tagName: "jobId",
										tagValue: serializeTagValue(input.jobId),
									},
								},
							},
							{
								tags: {
									some: {
										tagName: "channel",
										tagValue: serializeTagValue("job_task_configured"),
									},
								},
							},
						],
					},
				}),
			]);
			const hasConfigRequested = requestCount > 0 && configuredCount === 0;
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
					return sortInstallCosts(
						job.jobInstallTasks.map((taskInstall) => ({
							...taskInstall,
							builderTaskInstallCost: {
								id:
									taskInstall.communityModelInstallTask?.builderTaskInstallCost
										?.id ?? taskInstall.id,
								orderIndex:
									taskInstall.communityModelInstallTask?.builderTaskInstallCost
										?.orderIndex ?? null,
								createdAt:
									taskInstall.communityModelInstallTask?.builderTaskInstallCost
										?.createdAt ?? null,
							},
							installCostModel: {
								id:
									taskInstall.communityModelInstallTask?.installCostModel?.id ??
									taskInstall.id,
								title:
									taskInstall.communityModelInstallTask?.installCostModel
										?.title || "",
							},
						})),
					).map((t) => {
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
				hasConfigRequested,
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
