import { describe, expect, it, mock } from "bun:test";

const submittedJobIds: number[] = [];

mock.module("@notifications/services/triggers", () => ({
	NotificationService: class {
		channel = {
			jobSubmitted: async ({ jobId }: { jobId: number }) => {
				submittedJobIds.push(jobId);
			},
		};

		setEmployeeRecipients() {}
	},
}));

const { communityRouters } = await import("./community.route");

function createContractorContext({
	permissions = [],
	settingsMeta = {},
}: {
	permissions?: string[];
	settingsMeta?: Record<string, unknown>;
} = {}) {
	const createdJobs: unknown[] = [];
	const db = {
		users: {
			findFirstOrThrow: async () => ({
				id: 25,
				email: "contractor@example.com",
				name: "Contractor",
				phoneNo: null,
				roles: [
					{
						role: {
							id: 1,
							name: "1099 Contractor",
						},
					},
				],
			}),
		},
		roles: {
			findFirstOrThrow: async () => ({
				name: "1099 Contractor",
				RoleHasPermissions: [],
			}),
		},
		modelHasPermissions: {
			findMany: async () =>
				permissions.map((name, index) => ({
					permissions: {
						id: index + 1,
						name,
					},
				})),
		},
		settings: {
			findFirst: async () => ({
				id: 1,
				type: "jobs-settings",
				meta: settingsMeta,
			}),
		},
		jobs: {
			create: async (args: unknown) => {
				createdJobs.push(args);
				return {
					id: 501,
					project: {
						title: "Project Alpha",
						builder: { name: "Builder One" },
					},
					home: {
						modelName: "Model A",
						lot: "10",
						block: "B",
					},
					user: {
						id: 25,
						name: "Contractor",
					},
					builderTask: {
						taskName: "Installation",
					},
				};
			},
		},
		jobInstallTasks: {
			createMany: async () => ({ count: 0 }),
		},
		$transaction: async (callback: (transaction: unknown) => unknown) =>
			callback(db),
	};

	return {
		caller: communityRouters.createCaller({
			db,
			userId: 25,
		} as never),
		createdJobs,
	};
}

function createSubmission({
	isCustom = false,
	userId = 25,
}: {
	isCustom?: boolean;
	userId?: number;
} = {}) {
	return {
		unit: {
			id: 11,
			projectId: 22,
		},
		user: {
			id: userId,
		},
		builderTaskId: 33,
		modelId: 44,
		job: {
			amount: 0,
			description: "Completed installation",
			isCustom,
			title: "Project Alpha - 10/B",
			subtitle: "Model A - Installation",
			status: "Submitted" as const,
			tasks: [],
			meta: {
				addon: 0,
				addonPercent: 0,
				additional_cost: null,
				submittedFrom: "mobile" as const,
			},
		},
		adminMode: false,
		action: "submit" as const,
	};
}

describe("community.saveJobForm contractor submission", () => {
	it("allows an authenticated contractor to submit a job for themselves", async () => {
		submittedJobIds.length = 0;
		const { caller, createdJobs } = createContractorContext();

		const result = await caller.saveJobForm(createSubmission());

		expect(result.id).toBe(501);
		expect(createdJobs).toHaveLength(1);
		expect(createdJobs[0]).toMatchObject({
			data: {
				user: {
					connect: {
						id: 25,
					},
				},
			},
		});
		expect(submittedJobIds).toEqual([501]);
	});

	it("rejects a contractor submitting work for another account", async () => {
		const { caller, createdJobs } = createContractorContext();

		await expect(
			caller.saveJobForm(createSubmission({ userId: 99 })),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: "You can only submit work for your own account.",
		});
		expect(createdJobs).toHaveLength(0);
	});

	it("rejects non-manager actions and update-without-owner bypasses", async () => {
		for (const action of ["re-assign", "approve", "reject", "update"] as const) {
			const { caller, createdJobs } = createContractorContext();
			const input = createSubmission();

			await expect(
				caller.saveJobForm({
					...input,
					action,
				}),
			).rejects.toMatchObject({
				code: "FORBIDDEN",
				message: "You do not have permission to perform this job action.",
			});
			expect(createdJobs).toHaveLength(0);
		}
	});

	it("rejects custom jobs without the account or global entitlement", async () => {
		const { caller, createdJobs } = createContractorContext();

		await expect(
			caller.saveJobForm(createSubmission({ isCustom: true })),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: "Custom job submission is not enabled for this account.",
		});
		expect(createdJobs).toHaveLength(0);
	});

	it("allows custom jobs through either account or global entitlement", async () => {
		for (const context of [
			createContractorContext({
				permissions: ["submit custom job"],
			}),
			createContractorContext({
				settingsMeta: { allowCustomJobs: true },
			}),
		]) {
			const result = await context.caller.saveJobForm(
				createSubmission({ isCustom: true }),
			);

			expect(result.id).toBe(501);
			expect(context.createdJobs).toHaveLength(1);
		}
	});
});
