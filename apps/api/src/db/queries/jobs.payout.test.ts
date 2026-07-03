import { describe, expect, it, mock } from "bun:test";

const notificationCalls: unknown[] = [];

mock.module("@gnd/utils/note", () => ({
	composeNote: () => ({
		data: {},
		set() {
			return this;
		},
		color() {
			return this;
		},
	}),
	getSenderId: async () => 1,
	getSubscribersAccount: async () => [],
	noteTag: (tagName: string, tagValue: unknown) => ({
		tagName,
		tagValue: String(tagValue),
	}),
	saveNote: async () => null,
	saveNoteSchema: {
		parse: (value: unknown) => value,
		safeParse: (value: unknown) => ({ success: true, data: value }),
	},
	transformNote: (note: unknown) => note,
}));

mock.module("@notifications/services/triggers", () => ({
	NotificationService: class {
		channel = {
			jobPaymentSent: async (input: unknown) => {
				notificationCalls.push(input);
			},
			payoutCancelled: async (input: unknown) => {
				notificationCalls.push(input);
			},
			payoutIssues: async (input: unknown) => {
				notificationCalls.push(input);
			},
			payoutReversed: async (input: unknown) => {
				notificationCalls.push(input);
			},
		};

		setEmployeeRecipients() {
			return this;
		}
	},
}));

mock.module("@trigger.dev/sdk/v3", () => ({
	tasks: {},
}));

const {
	createPaymentPortal,
	getContractorPayoutOverview,
	getContractorPayoutPrintData,
} = await import("./jobs");

const createdAt = new Date("2026-07-03T16:52:58.000Z");

function createPayoutJob(overrides: Record<string, unknown> = {}) {
	return {
		id: 20811,
		title: "Custom Job",
		subtitle: "CUSTOM",
		description: "Install 8 closet doors and doorstops.",
		isCustom: true,
		amount: 2074,
		status: "Paid",
		createdAt,
		project: null,
		home: null,
		...overrides,
	};
}

function createPayout(overrides: Record<string, unknown> = {}) {
	return {
		id: 2653,
		amount: 2074,
		subTotal: 2074,
		charges: 0,
		paymentMethod: "Check",
		checkNo: "1759",
		meta: null,
		createdAt,
		user: {
			id: 77,
			name: "G&C Interior & Exterior INC",
			email: "installer@example.com",
		},
		payer: {
			id: 12,
			name: "Arlen Delgado",
		},
		adjustments: [],
		jobs: [createPayoutJob()],
		...overrides,
	};
}

describe("contractor payout job descriptions", () => {
	it("returns live paid job descriptions in payout overview data", async () => {
		const ctx = {
			db: {
				jobPayments: {
					findFirstOrThrow: async () => createPayout(),
				},
			},
		} as any;

		const data = await getContractorPayoutOverview(ctx, { paymentId: 2653 });

		expect(data.jobs[0]?.description).toBe(
			"Install 8 closet doors and doorstops.",
		);
		expect(data.jobs[0]?.isCustom).toBe(true);
	});

	it("returns live paid job descriptions in payout print data", async () => {
		const ctx = {
			db: {
				jobPayments: {
					findMany: async () => [createPayout()],
				},
			},
		} as any;

		const data = await getContractorPayoutPrintData(ctx, {
			paymentIds: [2653],
		});

		expect(data.payouts[0]?.jobs[0]?.description).toBe(
			"Install 8 closet doors and doorstops.",
		);
		expect(data.payouts[0]?.jobs[0]?.isCustom).toBe(true);
		expect(data.companyAddress).toMatchObject({
			address1: "13285 SW 131 ST",
			phone: "305-278-6555",
		});
	});

	it("uses snapshot descriptions for cancelled payouts and tolerates old snapshots", async () => {
		const ctx = {
			db: {
				jobPayments: {
					findFirstOrThrow: async () =>
						createPayout({
							meta: {
								cancelledAt: "2026-07-03T17:00:00.000Z",
								jobSnapshots: [
									{
										id: 20811,
										title: "Custom Job",
										subtitle: "CUSTOM",
										description: "Install 8 closet doors and doorstops.",
										isCustom: true,
										amount: 2074,
										previousStatus: "Approved",
										createdAt,
										projectTitle: null,
										lotBlock: null,
										modelName: null,
									},
									{
										id: 20810,
										title: "Custom Job",
										subtitle: "CUSTOM",
										amount: 120,
										previousStatus: "Approved",
										createdAt,
										projectTitle: null,
										lotBlock: null,
										modelName: null,
									},
								],
							},
							jobs: [],
						}),
				},
			},
		} as any;

		const data = await getContractorPayoutOverview(ctx, { paymentId: 2653 });

		expect(data.jobs[0]?.description).toBe(
			"Install 8 closet doors and doorstops.",
		);
		expect(data.jobs[0]?.isCustom).toBe(true);
		expect(data.jobs[1]?.description).toBeNull();
		expect(data.jobs[1]?.isCustom).toBeNull();
	});

	it("stores job descriptions in new payout snapshots", async () => {
		const createdPayments: any[] = [];
		const updatedJobs: any[] = [];
		const db = {
			jobs: {
				findMany: async () => [
					{
						...createPayoutJob({
							status: "Approved",
							controlId: "J-20811",
							project: {
								title: "Keys Gate North",
							},
							home: {
								lotBlock: "B1 11 Lot 16",
								modelName: "18 yards",
							},
						}),
					},
				],
				updateMany: async (args: any) => {
					updatedJobs.push(args);
					return { count: 1 };
				},
			},
			users: {
				findFirst: async () => ({
					id: 77,
					employeeProfile: {
						discount: 0,
					},
				}),
			},
			jobPayments: {
				create: async (args: any) => {
					createdPayments.push(args);
					return { id: 2653 };
				},
			},
			$transaction: async (callback: (tx: unknown) => unknown) => callback(db),
		};

		const result = await createPaymentPortal(
			{ db, userId: 12 } as any,
			{
				userId: 77,
				jobIds: [20811],
				paymentMethod: "Check",
				checkNo: "1759",
				adjustment: 0,
				discount: 0,
			},
		);

		expect(result.id).toBe(2653);
		expect(updatedJobs).toHaveLength(1);
		expect(createdPayments[0]?.data.meta.jobSnapshots[0]).toMatchObject({
			id: 20811,
			description: "Install 8 closet doors and doorstops.",
			isCustom: true,
		});
		expect(notificationCalls.at(-1)).toMatchObject({
			paymentId: 2653,
			contractorId: 77,
		});
	});
});
