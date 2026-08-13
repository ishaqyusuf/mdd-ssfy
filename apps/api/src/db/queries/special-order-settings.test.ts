import { describe, expect, test } from "bun:test";

import {
	publishSpecialOrderPolicy,
	updateSpecialOrderOperationalSettings,
} from "./special-order-settings";

function createSettingsDb() {
	const calls = {
		createdPolicy: null as null | Record<string, any>,
		retiredPolicies: null as null | Record<string, any>,
		settingsUpdate: null as null | Record<string, any>,
	};
	const currentPolicy = {
		id: "policy-current",
		version: 3,
		status: "PUBLISHED",
		title: "Current title",
		acknowledgmentText: "Current acknowledgment",
		policyText: "Current policy text",
	};
	const settings = {
		id: 1,
		type: "sales-settings",
		meta: {
			print: { templateId: "template-2" },
			paymentReview: { enabled: true },
			specialOrder: {
				enforcementMode: "WARNING_ONLY",
				approvalLinkLifetimeDays: 7,
				activePolicyVersionId: currentPolicy.id,
			},
		},
	};
	const db: Record<string, any> = {
		settings: {
			findFirst: async () => settings,
			create: async () => settings,
			update: async (args: Record<string, any>) => {
				calls.settingsUpdate = args;
				return args.data;
			},
		},
		specialOrderPolicyVersion: {
			findFirst: async (args: Record<string, any>) => {
				if (args.select?.version) return { version: 3 };
				return currentPolicy;
			},
			create: async (args: Record<string, any>) => {
				calls.createdPolicy = args;
				return { id: "policy-new", ...args.data };
			},
			updateMany: async (args: Record<string, any>) => {
				calls.retiredPolicies = args;
			},
		},
	};
	db.$transaction = async (run: (client: typeof db) => Promise<unknown>) =>
		run(db);
	return { calls, db };
}

describe("Special Order settings and immutable policy versions", () => {
	test("updates enforcement immediately without discarding unrelated Sales settings", async () => {
		const { calls, db } = createSettingsDb();
		const result = await updateSpecialOrderOperationalSettings(db as never, 9, {
			enforcementMode: "BLOCK_ALL_OPERATIONS",
			approvalLinkLifetimeDays: 30,
		});

		expect(result).toMatchObject({
			enforcementMode: "BLOCK_ALL_OPERATIONS",
			approvalLinkLifetimeDays: 30,
			activePolicyVersionId: "policy-current",
		});
		expect(calls.settingsUpdate).toMatchObject({
			data: {
				meta: {
					print: { templateId: "template-2" },
					paymentReview: { enabled: true },
				},
			},
		});
	});

	test("publishes the next immutable version and retires drafts only", async () => {
		const { calls, db } = createSettingsDb();
		const input = {
			title: "Published Special Order policy",
			acknowledgmentText:
				"I reviewed the complete order and confirm every specification.",
			policyText:
				"Special and custom items are non-returnable and non-refundable after the complete order has been reviewed.",
		};
		const result = await publishSpecialOrderPolicy(db as never, 9, input);

		expect(result.published).toMatchObject({
			id: "policy-new",
			version: 4,
			status: "PUBLISHED",
			...input,
		});
		expect(calls.retiredPolicies).toMatchObject({
			where: { status: "DRAFT" },
			data: { status: "RETIRED" },
		});
		expect(calls.settingsUpdate).toMatchObject({
			data: {
				meta: {
					print: { templateId: "template-2" },
					paymentReview: { enabled: true },
					specialOrder: { activePolicyVersionId: "policy-new" },
				},
			},
		});
	});
});
