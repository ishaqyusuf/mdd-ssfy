import type { TRPCContext } from "@api/trpc/init";
import { JOBS_SHOW_OPTIONS } from "@community/constants";
import {
	type CreateJobSchema,
	createJobSchema,
} from "@community/create-job-schema";
import type { InstallCostMeta, JobMeta, JobStatus } from "@community/types";
import { generateControlId, generateJobId } from "@gnd/community/utils/job";
import type { Prisma } from "@gnd/db";
import { Notifications } from "@gnd/notifications";
import {
	consoleLog,
	generateRandomString,
	nextId,
	padStart,
	sum,
} from "@gnd/utils";
import { formatLargeNumber } from "@gnd/utils/format";
import { getInsuranceRequirement } from "@gnd/utils/insurance-documents";
import { saveNote } from "@gnd/utils/note";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import { NotificationService } from "@notifications/services/triggers";
import { tasks } from "@trigger.dev/sdk/v3";
import {
	eachDayOfInterval,
	endOfMonth,
	format,
	formatDate,
	startOfMonth,
	subMonths,
} from "date-fns";
import z from "zod";
import { getSetting } from "./settings";

function getJobType(meta?: JobMeta | null) {
	return meta?.costData ? "v1" : "v2";
}

export const getJobsSchema = z
	.object({
		userId: z.number().optional().nullable(),
		jobId: z.number().optional().nullable(),
		projectId: z.number().optional().nullable(),
		projectSlug: z.string().optional().nullable(),
		show: z.enum(JOBS_SHOW_OPTIONS).optional().nullable(),
		contractor: z.string().optional().nullable(),
		project: z.string().optional().nullable(),
		unitId: z.number().optional().nullable(),
	})
	.extend(paginationSchema.shape);
export type GetJobsSchema = z.infer<typeof getJobsSchema>;

export async function getJobs(ctx: TRPCContext, query: GetJobsSchema) {
	const { db } = ctx;
	const model = db.jobs;
	const { response, searchMeta, where } = await composeQueryData(
		query,
		whereJobs(query),
		model,
	);
	const data = await model.findMany({
		where,
		...searchMeta,
		select: {
			meta: true,
			id: true,
			status: true,
			note: true,
			statusDate: true,
			createdAt: true,
			title: true,
			subtitle: true,
			amount: true,
			controlId: true,
			isCustom: true,
			builderTaskId: true,
			builderTask: {
				select: {
					taskName: true,
				},
			},
			coWorker: {
				select: {
					name: true,
					id: true,
				},
			},
			user: {
				select: {
					name: true,
					id: true,
				},
			},
			adminNote: true,
			payment: {
				select: {
					amount: true,
					id: true,
				},
			},
			description: true,
			project: {
				select: {
					title: true,
					id: true,
					builder: {
						select: {
							name: true,
						},
					},
				},
			},
			home: {
				select: {
					lotBlock: true,
					id: true,
					modelName: true,
					communityTemplateId: true,
				},
			},
			jobInstallTasks: {
				select: {
					id: true,
					qty: true,
					maxQty: true,
					rate: true,
					total: true,
					communityModelInstallTask: {
						select: {
							builderTaskInstallCost: {
								select: {
									id: true,
									orderIndex: true,
									createdAt: true,
								},
							},
							installCostModel: {
								select: {
									id: true,
									title: true,
								},
							},
						},
					},
				},
			},
		},
	});
	return await response(
		data.map(
			({
				meta: _meta,
				adminNote,
				note,
				amount,
				createdAt,
				description,
				home,
				id,
				payment,
				project,
				status,
				statusDate,
				subtitle,
				title,
				user,
				coWorker,
				controlId,
				isCustom,
				...rest
			}) => {
				const meta = _meta as any as JobMeta;
				// const {
				//   additional_cost,
				//   additionalCostReason,
				//   addon,
				//   costData,
				//   taskCost,
				// } = meta2 || {};
				return {
					jobId: `#J-${padStart(id, 5, "0")}`,
					controlId,
					isCustom,
					jobType: getJobType(meta),
					adminNote,
					amount,
					builderTask: rest.builderTask,
					createdAt,
					description,
					home,
					note,
					id,
					payment,
					project,
					status: status as JobStatus,
					statusDate,
					subtitle,
					title,
					user,
					coWorker,
					meta,
					...rest,
				};
			},
		),
	);
}

function containsInsensitive(value: string) {
	return {
		contains: value,
		mode: "insensitive" as const,
	};
}

function whereJobs(query: GetJobsSchema) {
	const where: Prisma.JobsWhereInput[] = [];
	for (const [k, v] of Object.entries(query)) {
		if (!v) continue;
		const value = v as any;
		switch (k as keyof GetJobsSchema) {
			case "q": {
				const q = containsInsensitive(v as string);
				where.push({
					OR: [
						{ title: q },
						{ subtitle: q },
						{ description: q },
						{ note: q },
						{ adminNote: q },
						{ controlId: q },
						{
							user: {
								name: q,
							},
						},
						{
							project: {
								title: q,
							},
						},
						{
							project: {
								builder: {
									name: q,
								},
							},
						},
						{
							home: {
								lotBlock: q,
							},
						},
						{
							home: {
								modelName: q,
							},
						},
					],
				});
				break;
			}
			case "userId":
				where.push({
					userId: value,
				});
				break;
			case "jobId":
				where.push({
					id: value,
				});
				break;
			case "projectId":
				where.push({
					projectId: value,
				});
				break;
			case "projectSlug":
				where.push({
					project: {
						slug: value,
					},
				});
				break;
			case "contractor":
				where.push({
					user: {
						name: containsInsensitive(value),
					},
				});
				break;
			case "project":
				where.push({
					project: {
						title: containsInsensitive(value),
					},
				});
				break;
			case "unitId":
				where.push({
					homeId: value,
				});
				break;
			case "show":
				switch (query.show) {
					case "custom":
						where.push({
							isCustom: true,
						});
						break;
				}
				break;
		}
	}
	return composeQuery(where);
}

export const getInstallCostsSchema = z.object({});
export type GetInstallCostsSchema = z.infer<typeof getInstallCostsSchema>;

const PAYMENT_PORTAL_FILTERS = [
	"all",
	"pending-review",
	"ready-to-pay",
	"approved",
	"completed",
	"payment-cancelled",
] as const;

const READY_TO_PAY_JOB_STATUSES = ["Approved", "Completed"] as const;

function roundPaymentAmount(value: number) {
	return Math.round(Number(value || 0));
}

function buildPaymentPortalStatusWhere(
	status: (typeof PAYMENT_PORTAL_FILTERS)[number] | null | undefined,
): Prisma.JobsWhereInput | undefined {
	switch (status) {
		case "pending-review":
			return { status: "Submitted" };
		case "ready-to-pay":
			return {
				status: {
					in: [...READY_TO_PAY_JOB_STATUSES],
				},
			};
		case "approved":
			return { status: "Approved" };
		case "completed":
			return { status: "Completed" };
		case "payment-cancelled":
			return { status: "Payment Cancelled" };
		default:
			return {
				NOT: [{ status: "Paid" }],
			};
	}
}

function buildPayableJobsWhere(userId?: number) {
	return {
		...(userId ? { userId } : {}),
		deletedAt: null,
		paymentId: null,
		NOT: [{ status: "Paid" }],
	} satisfies Prisma.JobsWhereInput;
}

const contractorPaymentSelect = {
	id: true,
	name: true,
	email: true,
	employeeProfile: {
		select: {
			discount: true,
		},
	},
	documents: {
		where: { deletedAt: null },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			title: true,
			meta: true,
			createdAt: true,
			url: true,
		},
	},
	jobs: {
		where: {
			deletedAt: null,
			paymentId: null,
			NOT: [{ status: "Paid" }],
		},
		select: {
			id: true,
			amount: true,
			status: true,
			createdAt: true,
			project: {
				select: {
					title: true,
				},
			},
		},
	},
} satisfies Prisma.UsersSelect;

function mapContractorPaymentSummary(
	user: Prisma.UsersGetPayload<{
		select: typeof contractorPaymentSelect;
	}>,
) {
	const pendingReviewCount = user.jobs.filter(
		(job) => String(job.status || "") === "Submitted",
	).length;
	const readyToPayJobs = user.jobs.filter((job) => {
		const status = String(job.status || "");
		return READY_TO_PAY_JOB_STATUSES.includes(
			status as (typeof READY_TO_PAY_JOB_STATUSES)[number],
		);
	});
	const subTotal = Number(
		sum(readyToPayJobs.map((job) => Number(job.amount || 0))) || 0,
	);
	const chargePercentage = Number(user.employeeProfile?.discount || 0);
	const charge = Number(
		(subTotal * ((chargePercentage || 0) / 100)).toFixed(2),
	);
	const totalPay = Number((subTotal - charge).toFixed(2));
	const pendingBill = Number(
		sum(user.jobs.map((job) => Number(job.amount || 0))) || 0,
	);
	const insurance = getInsuranceRequirement(user.documents);
	const lastProjectTitle =
		user.jobs.find((job) => job.project?.title)?.project?.title || null;

	return {
		id: user.id,
		name: user.name || "Unknown contractor",
		email: user.email,
		pendingBill,
		pendingReviewCount,
		readyToPayCount: readyToPayJobs.length,
		subTotal,
		charge,
		chargePercentage,
		totalPay,
		pendingJobs: user.jobs.length,
		insurance,
		lastProjectTitle,
	};
}

export const getPaymentDashboardSchema = z.object({
	q: z.string().optional().nullable(),
});
export type GetPaymentDashboardSchema = z.infer<
	typeof getPaymentDashboardSchema
>;

export async function getPaymentDashboard(
	ctx: TRPCContext,
	query: GetPaymentDashboardSchema,
) {
	const contractorQuery = query.q?.trim();
	const contractors = await ctx.db.users.findMany({
		where: {
			jobs: {
				some: buildPayableJobsWhere(),
			},
			...(contractorQuery
				? {
						OR: [
							{
								name: {
									contains: contractorQuery,
								},
							},
							{
								email: {
									contains: contractorQuery,
								},
							},
						],
					}
				: {}),
		},
		select: contractorPaymentSelect,
		orderBy: {
			name: "asc",
		},
	});

	const contractorItems = contractors
		.map(mapContractorPaymentSummary)
		.sort((left, right) => right.pendingBill - left.pendingBill);

	const [currentMonthPayments, currentMonthAmount, recentPayments] =
		await Promise.all([
			ctx.db.jobPayments.count({
				where: {
					deletedAt: null,
					createdAt: {
						gte: startOfMonth(new Date()),
						lte: endOfMonth(new Date()),
					},
				},
			}),
			ctx.db.jobPayments.aggregate({
				_sum: {
					amount: true,
				},
				where: {
					deletedAt: null,
					createdAt: {
						gte: startOfMonth(new Date()),
						lte: endOfMonth(new Date()),
					},
				},
			}),
			ctx.db.jobPayments.findMany({
				where: {
					deletedAt: null,
				},
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				take: 6,
				select: {
					id: true,
					amount: true,
					paymentMethod: true,
					checkNo: true,
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
					_count: {
						select: {
							jobs: true,
						},
					},
				},
			}),
		]);

	return {
		summary: {
			pendingBill: Number(
				sum(contractorItems.map((item) => Number(item.pendingBill || 0))) || 0,
			),
			totalPay: Number(
				sum(contractorItems.map((item) => Number(item.totalPay || 0))) || 0,
			),
			totalCharge: Number(
				sum(contractorItems.map((item) => Number(item.charge || 0))) || 0,
			),
			pendingJobs: Number(
				sum(contractorItems.map((item) => Number(item.pendingJobs || 0))) || 0,
			),
			pendingReviewCount: Number(
				sum(
					contractorItems.map((item) => Number(item.pendingReviewCount || 0)),
				) || 0,
			),
			readyToPayCount: Number(
				sum(contractorItems.map((item) => Number(item.readyToPayCount || 0))) ||
					0,
			),
			contractors: contractorItems.length,
			currentMonthPayments,
			currentMonthAmount: Number(currentMonthAmount._sum.amount || 0),
		},
		contractors: contractorItems,
		recentPayments: recentPayments.map((item) => ({
			id: item.id,
			amount: Number(item.amount || 0),
			paymentMethod: item.paymentMethod || "Unknown",
			checkNo: item.checkNo || null,
			createdAt: item.createdAt,
			jobCount: item._count.jobs,
			contractor: item.user?.name || "Unknown contractor",
			paidBy: item.payer?.name || "Unknown payer",
		})),
	};
}

export const getContractorPayoutsSchema = z
	.object({
		q: z.string().optional().nullable(),
		dateRange: z.array(z.string().optional().nullable()).optional().nullable(),
		contractor: z.array(z.string()).optional().nullable(),
		authorizedBy: z.array(z.string()).optional().nullable(),
	})
	.extend(paginationSchema.shape);
export type GetContractorPayoutsSchema = z.infer<
	typeof getContractorPayoutsSchema
>;

function whereContractorPayouts(query: GetContractorPayoutsSchema) {
	const where: Prisma.JobPaymentsWhereInput[] = [
		{
			deletedAt: null,
		},
	];

	if (query.q?.trim()) {
		const q = query.q.trim();
		where.push({
			OR: [
				{
					user: {
						name: {
							contains: q,
						},
					},
				},
				{
					payer: {
						name: {
							contains: q,
						},
					},
				},
				{
					paymentMethod: {
						contains: q,
					},
				},
				{
					checkNo: {
						contains: q,
					},
				},
			],
		});
	}

	if (query.dateRange?.length) {
		where.push({
			createdAt: transformFilterDateToQuery(query.dateRange),
		});
	}

	if (query.contractor?.length) {
		where.push({
			user: {
				name: {
					in: query.contractor,
				},
			},
		});
	}

	if (query.authorizedBy?.length) {
		where.push({
			payer: {
				name: {
					in: query.authorizedBy,
				},
			},
		});
	}

	return composeQuery(where);
}

function sortPayouts(
	sort,
	sortOrder,
): Prisma.JobPaymentsOrderByWithRelationInput | undefined {
	switch (sort) {
		case "amount":
			return {
				amount: sortOrder || "desc",
			};
		case "paidTo":
			return {
				user: {
					name: sortOrder || "asc",
				},
			};
		case "authorizedBy":
			return {
				payer: {
					name: sortOrder || "asc",
				},
			};
		case "date":
		default:
			return {
				createdAt: sortOrder || "desc",
			};
	}
}

export async function getContractorPayouts(
	ctx: TRPCContext,
	query: GetContractorPayoutsSchema,
) {
	const model = ctx.db.jobPayments;
	const { response, searchMeta, where } = await composeQueryData(
		query,
		whereContractorPayouts(query),
		model,
		{
			sortFn: sortPayouts,
		},
	);

	const payouts = await model.findMany({
		where,
		...searchMeta,
		select: {
			id: true,
			amount: true,
			subTotal: true,
			charges: true,
			paymentMethod: true,
			checkNo: true,
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
			_count: {
				select: {
					jobs: true,
				},
			},
		},
	});

	return response(
		payouts.map((item) => ({
			id: item.id,
			amount: Number(item.amount || 0),
			subTotal: Number(item.subTotal || 0),
			charges: Number(item.charges || 0),
			paymentMethod: item.paymentMethod || "Unknown",
			checkNo: item.checkNo || null,
			createdAt: item.createdAt,
			paidTo: item.user?.name || "Unknown contractor",
			authorizedBy: item.payer?.name || "Unknown payer",
			jobCount: item._count.jobs,
		})),
	);
}

export const getContractorPayoutOverviewSchema = z.object({
	paymentId: z.number(),
});
export type GetContractorPayoutOverviewSchema = z.infer<
	typeof getContractorPayoutOverviewSchema
>;

export async function getContractorPayoutOverview(
	ctx: TRPCContext,
	input: GetContractorPayoutOverviewSchema,
) {
	const payout = await ctx.db.jobPayments.findFirstOrThrow({
		where: {
			id: input.paymentId,
			deletedAt: null,
		},
		select: {
			id: true,
			amount: true,
			subTotal: true,
			charges: true,
			paymentMethod: true,
			checkNo: true,
			meta: true,
			createdAt: true,
			user: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
			payer: {
				select: {
					id: true,
					name: true,
				},
			},
			adjustments: {
				where: {
					deletedAt: null,
				},
				orderBy: {
					createdAt: "asc",
				},
				select: {
					id: true,
					amount: true,
					type: true,
					description: true,
					createdAt: true,
				},
			},
			jobs: {
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				select: {
					id: true,
					title: true,
					subtitle: true,
					amount: true,
					status: true,
					createdAt: true,
					project: {
						select: {
							title: true,
						},
					},
					home: {
						select: {
							lotBlock: true,
							modelName: true,
						},
					},
				},
			},
		},
	});

	return {
		id: payout.id,
		amount: Number(payout.amount || 0),
		subTotal: Number(payout.subTotal || 0),
		charges: Number(payout.charges || 0),
		paymentMethod: payout.paymentMethod || "Unknown",
		checkNo: payout.checkNo || null,
		createdAt: payout.createdAt,
		paidTo: payout.user
			? {
					id: payout.user.id,
					name: payout.user.name || "Unknown contractor",
					email: payout.user.email || null,
				}
			: null,
		authorizedBy: payout.payer
			? {
					id: payout.payer.id,
					name: payout.payer.name || "Unknown payer",
				}
			: null,
		meta: (payout.meta as Record<string, unknown> | null) || null,
		jobCount: payout.jobs.length,
		adjustments: payout.adjustments.map((item) => ({
			id: item.id,
			type: item.type,
			description: item.description || null,
			amount: Number(item.amount || 0),
			createdAt: item.createdAt,
		})),
		jobs: payout.jobs.map((job) => ({
			id: job.id,
			title: job.title,
			subtitle: job.subtitle,
			amount: Number(job.amount || 0),
			status: job.status,
			createdAt: job.createdAt,
			projectTitle: job.project?.title || null,
			lotBlock: job.home?.lotBlock || null,
			modelName: job.home?.modelName || null,
		})),
	};
}

export const getContractorPayoutPrintSchema = z.object({
	paymentIds: z.array(z.number()).min(1),
});

export async function getContractorPayoutPrintData(
	ctx: TRPCContext,
	input: z.infer<typeof getContractorPayoutPrintSchema>,
) {
	const payouts = await ctx.db.jobPayments.findMany({
		where: {
			id: {
				in: input.paymentIds,
			},
			deletedAt: null,
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: {
			id: true,
			amount: true,
			subTotal: true,
			charges: true,
			paymentMethod: true,
			checkNo: true,
			createdAt: true,
			user: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
			payer: {
				select: {
					id: true,
					name: true,
				},
			},
			adjustments: {
				where: {
					deletedAt: null,
				},
				orderBy: {
					createdAt: "asc",
				},
				select: {
					id: true,
					type: true,
					description: true,
					amount: true,
					createdAt: true,
				},
			},
			jobs: {
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				select: {
					id: true,
					title: true,
					subtitle: true,
					amount: true,
					status: true,
					createdAt: true,
					project: {
						select: {
							title: true,
						},
					},
					home: {
						select: {
							lotBlock: true,
							modelName: true,
						},
					},
				},
			},
		},
	});

	const totalAmount = payouts.reduce(
		(sum, item) => sum + Number(item.amount || 0),
		0,
	);
	const totalJobs = payouts.reduce((sum, item) => sum + item.jobs.length, 0);

	return {
		title:
			payouts.length === 1
				? `Payout_${payouts[0]?.id}`
				: `Payouts_${payouts.map((item) => item.id).join("_")}`,
		printedAt: new Date(),
		summary: {
			payoutCount: payouts.length,
			totalAmount,
			totalJobs,
		},
		payouts: payouts.map((payout) => ({
			id: payout.id,
			amount: Number(payout.amount || 0),
			subTotal: Number(payout.subTotal || 0),
			charges: Number(payout.charges || 0),
			paymentMethod: payout.paymentMethod || "Unknown",
			checkNo: payout.checkNo || null,
			createdAt: payout.createdAt,
			paidTo: payout.user
				? {
						id: payout.user.id,
						name: payout.user.name || "Unknown contractor",
						email: payout.user.email || null,
					}
				: null,
			authorizedBy: payout.payer
				? {
						id: payout.payer.id,
						name: payout.payer.name || "Unknown payer",
					}
				: null,
			jobCount: payout.jobs.length,
			adjustments: payout.adjustments.map((item) => ({
				id: item.id,
				type: item.type,
				description: item.description || null,
				amount: Number(item.amount || 0),
				createdAt: item.createdAt,
			})),
			jobs: payout.jobs.map((job) => ({
				id: job.id,
				title: job.title,
				subtitle: job.subtitle,
				amount: Number(job.amount || 0),
				status: job.status,
				createdAt: job.createdAt,
				projectTitle: job.project?.title || null,
				lotBlock: job.home?.lotBlock || null,
				modelName: job.home?.modelName || null,
			})),
		})),
	};
}

export const getPaymentPortalSchema = z.object({
	userId: z.number(),
	q: z.string().optional().nullable(),
	status: z.enum(PAYMENT_PORTAL_FILTERS).optional().nullable(),
});
export type GetPaymentPortalSchema = z.infer<typeof getPaymentPortalSchema>;

export async function getPaymentPortal(
	ctx: TRPCContext,
	query: GetPaymentPortalSchema,
) {
	const contractor = await ctx.db.users.findFirst({
		where: {
			id: query.userId,
		},
		select: contractorPaymentSelect,
	});

	if (!contractor) {
		throw new Error("Contractor not found");
	}

	const statusWhere = buildPaymentPortalStatusWhere(query.status);
	const search = query.q?.trim();

	const jobs = await ctx.db.jobs.findMany({
		where: {
			userId: contractor.id,
			deletedAt: null,
			paymentId: null,
			...(statusWhere || {}),
			...(search
				? {
						OR: [
							{
								title: {
									contains: search,
								},
							},
							{
								subtitle: {
									contains: search,
								},
							},
							{
								description: {
									contains: search,
								},
							},
							{
								project: {
									title: {
										contains: search,
									},
								},
							},
							{
								home: {
									lotBlock: {
										contains: search,
									},
								},
							},
							{
								home: {
									modelName: {
										contains: search,
									},
								},
							},
						],
					}
				: {}),
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: {
			id: true,
			title: true,
			subtitle: true,
			description: true,
			amount: true,
			status: true,
			createdAt: true,
			project: {
				select: {
					title: true,
					builder: {
						select: {
							name: true,
						},
					},
				},
			},
			home: {
				select: {
					id: true,
					lotBlock: true,
					modelName: true,
				},
			},
		},
	});

	return {
		contractor: mapContractorPaymentSummary(contractor),
		jobs: jobs.map((job) => ({
			...job,
			amount: Number(job.amount || 0),
			paymentStage:
				String(job.status || "") === "Submitted"
					? "pending-review"
					: READY_TO_PAY_JOB_STATUSES.includes(
								String(
									job.status || "",
								) as (typeof READY_TO_PAY_JOB_STATUSES)[number],
							)
						? "ready-to-pay"
						: "not-payable",
		})),
	};
}

export const createPaymentPortalSchema = z.object({
	userId: z.number(),
	jobIds: z.array(z.number()).min(1, "Select at least one job"),
	adjustment: z.number().optional().default(0),
	discount: z.number().optional().default(0),
	paymentMethod: z.string().min(1, "Select a payment method"),
	checkNo: z.string().optional().nullable(),
});
export type CreatePaymentPortalSchema = z.infer<
	typeof createPaymentPortalSchema
>;

export const getJobsPrintDataSchema = z.object({
	jobIds: z.array(z.number()).min(1).optional().nullable(),
	context: z
		.enum(["jobs-page", "payment-portal", "payroll-report"])
		.optional()
		.nullable(),
	scope: z.enum(["selection", "all-unpaid"]).optional().nullable(),
});
export type GetJobsPrintDataSchema = z.infer<typeof getJobsPrintDataSchema>;

export async function getJobsPrintData(
	ctx: TRPCContext,
	input: GetJobsPrintDataSchema,
) {
	if (input.context === "payroll-report" && input.scope === "all-unpaid") {
		const jobs = await ctx.db.jobs.findMany({
			where: buildPayableJobsWhere(),
			orderBy: [
				{ user: { name: "asc" } },
				{ createdAt: "desc" },
				{ id: "desc" },
			],
			select: {
				id: true,
				title: true,
				subtitle: true,
				description: true,
				amount: true,
				status: true,
				createdAt: true,
				meta: true,
				isCustom: true,
				builderTask: {
					select: {
						taskName: true,
					},
				},
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						employeeProfile: {
							select: {
								discount: true,
							},
						},
					},
				},
				project: {
					select: {
						title: true,
					},
				},
				home: {
					select: {
						lotBlock: true,
						modelName: true,
					},
				},
			},
		});

		const normalizedJobs = jobs.map((job) => ({
			id: job.id,
			title: job.title,
			subtitle: job.subtitle,
			description: job.description,
			amount: Number(job.amount || 0),
			status: job.status,
			createdAt: job.createdAt,
			jobType: getJobType(job.meta as JobMeta | null),
			isCustom: job.isCustom,
			builderTaskName: job.builderTask?.taskName || null,
			contractorId: Number(job.user?.id || 0) || null,
			contractorName: job.user?.name || "Unknown contractor",
			contractorEmail: job.user?.email || null,
			chargePercentage: Number(job.user?.employeeProfile?.discount || 0),
			projectTitle: job.project?.title || "Unknown project",
			lotBlock: job.home?.lotBlock || null,
			modelName: job.home?.modelName || null,
		}));

		const statusSummaryMap = new Map<
			string,
			{ status: string; jobCount: number; totalAmount: number }
		>();
		for (const job of normalizedJobs) {
			const key = String(job.status || "Unknown");
			const current = statusSummaryMap.get(key) || {
				status: key,
				jobCount: 0,
				totalAmount: 0,
			};
			current.jobCount += 1;
			current.totalAmount = Number(
				(current.totalAmount + Number(job.amount || 0)).toFixed(2),
			);
			statusSummaryMap.set(key, current);
		}

		const contractorMap = new Map<
			string,
			{
				contractorId: number | null;
				contractorName: string;
				contractorEmail: string | null;
				chargePercentage: number;
				jobs: typeof normalizedJobs;
			}
		>();

		for (const job of normalizedJobs) {
			const key = String(job.contractorId || job.contractorName);
			const current = contractorMap.get(key) || {
				contractorId: job.contractorId,
				contractorName: job.contractorName,
				contractorEmail: job.contractorEmail,
				chargePercentage: job.chargePercentage,
				jobs: [],
			};
			current.jobs.push(job);
			contractorMap.set(key, current);
		}

		const contractors = Array.from(contractorMap.values())
			.map((contractor) => {
				const contractorStatusMap = new Map<
					string,
					{ status: string; jobCount: number; totalAmount: number }
				>();

				for (const job of contractor.jobs) {
					const key = String(job.status || "Unknown");
					const current = contractorStatusMap.get(key) || {
						status: key,
						jobCount: 0,
						totalAmount: 0,
					};
					current.jobCount += 1;
					current.totalAmount = Number(
						(current.totalAmount + Number(job.amount || 0)).toFixed(2),
					);
					contractorStatusMap.set(key, current);
				}

				const readyToPayAmount = Number(
					contractor.jobs
						.filter((job) =>
							READY_TO_PAY_JOB_STATUSES.includes(
								String(
									job.status || "",
								) as (typeof READY_TO_PAY_JOB_STATUSES)[number],
							),
						)
						.reduce((sum, job) => sum + Number(job.amount || 0), 0)
						.toFixed(2),
				);
				const charge = Number(
					(
						readyToPayAmount *
						((Number(contractor.chargePercentage || 0) || 0) / 100)
					).toFixed(2),
				);
				const totalPayable = Number((readyToPayAmount - charge).toFixed(2));
				const pendingBill = Number(
					contractor.jobs
						.reduce((sum, job) => sum + Number(job.amount || 0), 0)
						.toFixed(2),
				);

				return {
					contractorId: contractor.contractorId,
					contractorName: contractor.contractorName,
					contractorEmail: contractor.contractorEmail,
					jobCount: contractor.jobs.length,
					pendingBill,
					readyToPayAmount,
					charge,
					chargePercentage: Number(contractor.chargePercentage || 0),
					totalPayable,
					statusSummary: Array.from(contractorStatusMap.values()).sort((a, b) =>
						a.status.localeCompare(b.status),
					),
					jobs: contractor.jobs,
				};
			})
			.sort((left, right) => right.pendingBill - left.pendingBill);

		const totalAmount = Number(
			normalizedJobs
				.reduce((total, job) => total + Number(job.amount || 0), 0)
				.toFixed(2),
		);
		const totalPayable = Number(
			contractors
				.reduce(
					(total, contractor) => total + Number(contractor.totalPayable || 0),
					0,
				)
				.toFixed(2),
		);

		return {
			title: "Contractor Payroll Report",
			context: "payroll-report" as const,
			printedAt: new Date(),
			summary: {
				jobCount: normalizedJobs.length,
				totalAmount,
				totalPayable,
				contractorCount: contractors.length,
				contractorName: "All contractors",
				statusSummary: Array.from(statusSummaryMap.values()).sort((a, b) =>
					a.status.localeCompare(b.status),
				),
			},
			payroll: {
				contractors,
			},
			jobs: [],
		};
	}

	if (!input.jobIds?.length) {
		throw new Error("Select at least one job to print");
	}

	const jobs = await ctx.db.jobs.findMany({
		where: {
			id: {
				in: input.jobIds,
			},
			deletedAt: null,
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: {
			id: true,
			title: true,
			subtitle: true,
			description: true,
			amount: true,
			status: true,
			createdAt: true,
			meta: true,
			isCustom: true,
			builderTask: {
				select: {
					taskName: true,
				},
			},
			user: {
				select: {
					id: true,
					name: true,
				},
			},
			project: {
				select: {
					title: true,
				},
			},
			home: {
				select: {
					lotBlock: true,
					modelName: true,
				},
			},
		},
	});

	if (jobs.length !== input.jobIds.length) {
		throw new Error("Some selected jobs are no longer available to print");
	}

	const orderedJobs = input.jobIds
		.map((jobId) => jobs.find((job) => job.id === jobId))
		.filter((job): job is NonNullable<typeof job> => !!job);

	const contractors = Array.from(
		new Set(orderedJobs.map((job) => job.user?.name).filter(Boolean)),
	);
	const totalAmount = Number(
		orderedJobs
			.reduce((total, job) => total + Number(job.amount || 0), 0)
			.toFixed(2),
	);

	return {
		title:
			input.context === "payment-portal"
				? "Contractor Payment Selection"
				: input.context === "payroll-report"
					? "Contractor Payroll Report"
					: "Selected Jobs List",
		context: input.context || "jobs-page",
		printedAt: new Date(),
		summary: {
			jobCount: orderedJobs.length,
			totalAmount,
			totalPayable: totalAmount,
			contractorCount: contractors.length,
			contractorName:
				contractors.length === 1 ? contractors[0] : "Multiple contractors",
			statusSummary: [],
		},
		payroll: null,
		jobs: orderedJobs.map((job) => ({
			id: job.id,
			title: job.title,
			subtitle: job.subtitle,
			description: job.description,
			amount: Number(job.amount || 0),
			status: job.status,
			createdAt: job.createdAt,
			jobType: getJobType(job.meta as JobMeta | null),
			isCustom: job.isCustom,
			builderTaskName: job.builderTask?.taskName || null,
			contractorName: job.user?.name || "Unknown contractor",
			projectTitle: job.project?.title || "Unknown project",
			lotBlock: job.home?.lotBlock || null,
			modelName: job.home?.modelName || null,
		})),
	};
}

export async function createPaymentPortal(
	ctx: TRPCContext,
	input: CreatePaymentPortalSchema,
) {
	const payerId = ctx.userId;
	if (!payerId) {
		throw new Error("Unauthorized");
	}

	const jobs = await ctx.db.jobs.findMany({
		where: {
			id: {
				in: input.jobIds,
			},
			userId: input.userId,
			deletedAt: null,
			paymentId: null,
			NOT: [{ status: "Paid" }],
		},
		select: {
			id: true,
			amount: true,
			controlId: true,
			status: true,
		},
	});

	if (jobs.length !== input.jobIds.length) {
		throw new Error("Some selected jobs are no longer available for payment");
	}

	const contractor = await ctx.db.users.findFirst({
		where: {
			id: input.userId,
		},
		select: {
			id: true,
			employeeProfile: {
				select: {
					discount: true,
				},
			},
		},
	});

	if (!contractor) {
		throw new Error("Contractor not found");
	}

	const subTotal = Number(sum(jobs.map((job) => Number(job.amount || 0))) || 0);
	const adjustment = 0;
	const chargePercentage = Number(contractor.employeeProfile?.discount || 0);
	const autoApprovedJobs = jobs
		.filter(
			(job) =>
				!READY_TO_PAY_JOB_STATUSES.includes(
					String(
						job.status || "",
					) as (typeof READY_TO_PAY_JOB_STATUSES)[number],
				),
		)
		.map((job) => ({
			id: job.id,
			fromStatus: String(job.status || "Unknown"),
		}));
	const discount = Number(
		(subTotal * ((chargePercentage || 0) / 100)).toFixed(2),
	);
	const totalPayout = Number((subTotal + adjustment - discount).toFixed(2));

	if (totalPayout < 0) {
		throw new Error("Total payout cannot be negative");
	}

	const payment = await ctx.db.$transaction(async (db) => {
		const createdPayment = await db.jobPayments.create({
			data: {
				amount: roundPaymentAmount(totalPayout),
				subTotal: roundPaymentAmount(subTotal),
				charges: roundPaymentAmount(discount),
				userId: input.userId,
				paidBy: payerId,
				checkNo: input.checkNo || null,
				paymentMethod: input.paymentMethod,
				meta: {
					discount,
					chargePercentage,
					jobIds: input.jobIds,
					subTotal,
					totalPayout,
					autoApprovedJobs,
				},
				adjustments: {
					create: [
						...(adjustment
							? [
									{
										type: "BONUS" as const,
										amount: roundPaymentAmount(adjustment),
										description: "Manual payout adjustment",
									},
								]
							: []),
						...(discount
							? [
									{
										type: "DEDUCTION" as const,
										amount: roundPaymentAmount(discount),
										description: `Contractor discount (${chargePercentage}%)`,
									},
								]
							: []),
					],
				},
			},
			select: {
				id: true,
			},
		});

		await db.jobs.updateMany({
			where: {
				id: {
					in: input.jobIds,
				},
			},
			data: {
				paymentId: createdPayment.id,
				status: "Paid",
				statusDate: new Date(),
			},
		});

		return createdPayment;
	});

	await saveNote(
		ctx.db,
		{
			headline: "Job Payment Created",
			note: `Payment batch #${payment.id}`,
			subject: "Contractor payout",
			tags: [
				{
					tagName: "channel",
					tagValue: "contractor_payment_portal",
				},
				{
					tagName: "userId",
					tagValue: String(input.userId),
				},
			],
		},
		payerId,
	);

	await new NotificationService(tasks, ctx)
		.setEmployeeRecipients(input.userId)
		.channel.jobPaymentSent({
			paymentId: payment.id,
			contractorId: input.userId,
			jobCount: input.jobIds.length,
			amount: totalPayout,
			paymentMethod: input.paymentMethod,
		});

	return {
		id: payment.id,
		totalPayout,
	};
}

export async function getInstallCosts(
	ctx: TRPCContext,
	query?: GetInstallCostsSchema,
) {
	const { db } = ctx;
	const res = await getSetting<InstallCostMeta>(ctx, "install-price-chart");
	// res.data.list[0].
	return res;
}

export const getJobAnalyticsSchema = z.object({});
export type GetJobAnalyticsSchema = z.infer<typeof getJobAnalyticsSchema>;

export async function getJobAnalytics(
	ctx: TRPCContext,
	query: GetJobAnalyticsSchema,
) {
	const { db } = ctx;

	// return {
	//   completed: 0,
	//   inProgress: 0,
	//   paid: 0,
	//   pendingPayments: 0, // formatLargeNumber(pendingPayments),
	// };
	const completedPromise = db.jobs.count({
		where: {
			OR: [
				{ status: "Completed" },
				{
					payment: {},
				},
			],
			userId: ctx.userId,
		},
	});

	const inProgressPromise = db.jobs.count({
		where: { status: "Submitted", userId: ctx.userId },
	});

	const pendingPaymentsPromise = db.jobs.count({
		// _sum: {
		//   amount: true,
		// },
		where: {
			payment: null,
			userId: ctx.userId,
		},
	});

	const paidPromise = db.jobs.count({
		// _sum: {
		//   amount: true,
		// },
		where: { userId: ctx.userId, payment: {} },
	});

	const [completed, inProgress, paidAggregation, pendingPaymentsAggregation] =
		await Promise.all([
			completedPromise,
			inProgressPromise,
			paidPromise,
			pendingPaymentsPromise,
		]);

	const paid =
		paidAggregation ||
		// _sum.amount
		0;
	const pendingPayments = pendingPaymentsAggregation || 0;

	return {
		completed,
		inProgress,
		paid,
		pendingPayments: formatLargeNumber(pendingPayments),
	};
}

export async function createJob(ctx: TRPCContext, query: CreateJobSchema) {
	// return {};
	const { db } = ctx;
	if (query.isCustom) {
		query.tasks = {};
		// query.addon = 0;
		// query.status = '';
	}

	const taskCost = sum(
		Object.entries(query.tasks).map(([k, v]) => sum([+v.qty! * +v.cost])),
	);
	const meta: JobMeta = {
		taskCost,
		additional_cost: query.additionalCost!,
		additionalCostReason: query.additionalReason!,
		addon: query.addon! || 0, // !query.homeId ? 0 : query.addon!,
		costData: query.tasks as any,
	};
	const amount = sum([
		sum([
			query.isCustom || !query.homeId ? 0 : meta.addon,
			meta.taskCost,
			meta.additional_cost,
		]) / (query.coWorker?.id ? 2 : 1),
	]);
	const controlId = query.id ? query.controlId : generateControlId();
	if (!controlId) throw new Error("Unable to proceed");
	const data = {
		// id: jobId,
		// status: query?.status || "Submitted",
		status: query.status!,
		statusDate: new Date(),
		amount,
		description: query.description,
		note: query.note,
		meta: meta as any,
		title: query.title,
		subtitle: query.subtitle,
	} as Prisma.JobsCreateManyInput;
	const createData = {
		userId: query?.worker?.id || ctx.userId!,
		type: query.type as any,
		coWorkerId: query.coWorker?.id,
		homeId: query.homeId!,
		projectId: query.projectId!,
		controlId,
		isCustom: query.isCustom,
	} as Prisma.JobsCreateManyInput;
	if (!query.id) {
		const _data = {
			...data,
			...createData,
		};
		const jobId = (query.id = await nextId(db.jobs));
		_data.id = jobId;
		const result = await db.jobs.createMany({
			data: !query.coWorker?.id
				? [_data]
				: [
						_data,
						{
							..._data,
							id: undefined,
							userId: query.coWorker?.id!,
							coWorkerId: ctx.userId!,
							// note: query.note,
						},
					],
		});
		const notifications = new Notifications(db);
		if (query.mode == "assign") {
			await notifications.create("job_assigned", {
				jobId,
				assignedToId: query?.worker?.id!,
			});
		}
		// await saveNote(
		//   ctx.db,
		//   {
		//     headline: query?.mode == "assign" ? "Job Assigned" : "Job Submitted",
		//     note: generateJobId(jobId),
		//     subject:
		//       query?.mode == "assign" ? `New job assignment` : `New job submission`,
		//     tags: [
		//       {
		//         tagName: "jobControlId",
		//         tagValue: controlId,
		//       },
		//       {
		//         tagName: "jobId",
		//         tagValue: String(jobId),
		//       },
		//     ],
		//   },
		//   ctx.userId!,
		// );
	} else {
		const result = await db.jobs.updateMany({
			where: {
				id: {
					in: [query.id!, query.coWorkerJobId!]?.filter(Boolean),
				},
			},
			data: {
				...data,
			},
		});
	}
	return await getJobForm(ctx, {
		controlId,
	});
}
export const getJobFormSchema = z.object({
	controlId: z.string(),
});
export type GetJobFormSchema = z.infer<typeof getJobFormSchema>;

export async function getJobForm(ctx: TRPCContext, query: GetJobFormSchema) {
	const { db } = ctx;
	const [main, co] = await db.jobs.findMany({
		where: {
			controlId: query.controlId,
		},
		include: {
			user: true,
		},
	});
	if (!main) throw new Error("Job not found");
	const mainMeta: JobMeta = main.meta as any;
	return {
		id: main.id,
		description: main.description!,
		title: main.title!,
		subtitle: main.subtitle,
		status: main.status,
		controlId: main.controlId,
		worker: {
			id: main.userId,
			name: main.user?.name,
		},
		coWorkerJobId: co?.id,
		type: main.type as any,
		homeId: main.homeId,
		additionalCost: mainMeta?.additional_cost,
		note: main?.note,
		additionalReason: mainMeta?.additionalCostReason,
		addon: mainMeta?.addon,
		date: main?.createdAt,
		coWorker: co
			? {
					id: co?.user?.id,
					name: co?.user?.name,
				}
			: null,
		projectId: main.projectId,
		tasks: mainMeta?.costData,
	} satisfies CreateJobSchema;
}
export const earningAnalyticsSchema = z.object({
	// : z.string(),
});
export type EarningAnalyticsSchema = z.infer<typeof earningAnalyticsSchema>;

export async function earningAnalytics(
	ctx: TRPCContext,
	query: EarningAnalyticsSchema,
) {
	const { db } = ctx;
	const now = new Date();

	const thisMonthStart = startOfMonth(now);
	const thisMonthEnd = endOfMonth(now);

	const lastMonthStart = startOfMonth(subMonths(now, 1));
	const lastMonthEnd = endOfMonth(subMonths(now, 1));
	const [thisMonthJobs, lastMonthJobs] = await Promise.all([
		db.jobs.findMany({
			where: {
				userId: ctx.userId,
				status: {
					in: ["PAID", "SUBMITTED"],
				},
				createdAt: { gte: thisMonthStart, lte: thisMonthEnd },
			},
			select: { amount: true, createdAt: true },
		}),

		db.jobs.findMany({
			where: {
				userId: ctx.userId,
				status: {
					in: ["PAID", "SUBMITTED"],
				},
				createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
			},
			select: { amount: true },
		}),
	]);
	const earning = thisMonthJobs.reduce((s, j) => s + j.amount, 0);
	const lastMonthEarning = lastMonthJobs.reduce((s, j) => s + j.amount, 0);
	const percentageVsLastMonth =
		lastMonthEarning === 0
			? 100
			: Math.round(((earning - lastMonthEarning) / lastMonthEarning) * 100);
	const days = eachDayOfInterval({
		start: thisMonthStart,
		end: thisMonthEnd,
	});

	const data = days.map((day) => {
		return thisMonthJobs
			.filter(
				(j) => format(j.createdAt!, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"),
			)
			.reduce((s, j) => s + j.amount, 0);
	});
	return {
		earning,
		percentageVsLastMonth,
		data,
	};
}

/*
adminAnalytics: publicProcedure
      .input(adminAnalyticsSchema)
      .query(async (props) => {
        return adminAnalytics(props.ctx, props.input);
      }),
*/
export const adminAnalyticsSchema = z.object({
	// : z.string(),
});
export type AdminAnalyticsSchema = z.infer<typeof adminAnalyticsSchema>;

export async function adminAnalytics(
	ctx: TRPCContext,
	query: AdminAnalyticsSchema,
) {
	const { db } = ctx;

	return {
		jobsInProgress: 0,
		jobsPendingApproval: 0,
		approvedThisMonth: 0,
	};
}
