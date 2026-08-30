import { describe, expect, test } from "bun:test";
import { transformNotifications } from "@notifications/notification-center";
import { explodeTagEntries, mergeTagRows } from "@notifications/tag-values";
import {
	SALES_HANDOFF_NOTIFICATION_ACTOR_USER_ID,
	runSalesHandoffEscalationScan,
} from "./sales-handoff-escalation-schedule";

function escalationDb(input: { quarantined?: boolean } = {}) {
	const epoch = {
		id: "epoch-1",
		salesOrderId: 91,
		orderId: "09388PC",
		actionType: "MATERIAL",
		responsibleRepId: 17,
		organizationId: 4,
		openedAt: new Date("2026-08-21T14:00:00.000Z"),
		targetControlUid: null,
		openKey: "MATERIAL:91",
		resolvedAt: null as Date | null,
		escalatedAt: null as Date | null,
		escalationDueAt: new Date("2026-08-24T14:00:00.000Z"),
	};
	const ledger: unknown[] = [];
	const candidateQueries: unknown[] = [];
	const model = {
		findMany: async (query: unknown) => {
			candidateQueries.push(query);
			return epoch.resolvedAt || epoch.escalatedAt
				? []
				: [{ id: epoch.id, salesOrderId: epoch.salesOrderId }];
		},
		findFirst: async () =>
			epoch.resolvedAt || epoch.escalatedAt ? null : { ...epoch },
		updateMany: async () => {
			if (epoch.resolvedAt || epoch.escalatedAt) return { count: 0 };
			epoch.escalatedAt = new Date("2026-08-24T14:01:00.000Z");
			return { count: 1 };
		},
	};
	const db = {
		resolutionCase: {
			findMany: async () =>
				input.quarantined ? [{ scopeId: String(epoch.salesOrderId) }] : [],
		},
		modelHasRoles: {
			findMany: async () => [{ organizationId: 4 }],
		},
		users: {
			findFirst: async (input: unknown) =>
				(input as { where?: { id?: number } }).where?.id === 99
					? { id: 99 }
					: { name: "Pablo" },
		},
		salesHandoffActionEpoch: model,
		salesHandoffActionEscalationRecipient: {
			findMany: async () => [],
			createMany: async (input: { data: unknown[] }) => {
				ledger.push(...input.data);
				return { count: input.data.length };
			},
		},
		$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
			callback(db),
	};
	return { db, epoch, ledger, candidateQueries };
}

describe("Sales Handoff escalation schedule", () => {
	test("uses the designated notification user without environment configuration", () => {
		expect(SALES_HANDOFF_NOTIFICATION_ACTOR_USER_ID).toBe(1);
	});

	test("does not escalate an epoch whose order is in lifecycle review", async () => {
		const { db, epoch, ledger } = escalationDb({ quarantined: true });
		const result = await runSalesHandoffEscalationScan(db as never, {
			now: new Date("2026-08-24T14:01:00.000Z"),
			actorUserId: 99,
		});

		expect(result).toMatchObject({
			scanned: 1,
			skippedLifecycleReview: 1,
			results: [],
		});
		expect(epoch.escalatedAt).toBeNull();
		expect(ledger).toHaveLength(0);
	});

	test("claims an overdue epoch once and writes one durable row per active admin", async () => {
		const { db, ledger, candidateQueries } = escalationDb();
		let activities = 0;
		const createdActivityInputs: Array<{
			type: string;
			source: string;
			tags: Record<string, unknown>;
		}> = [];
		const dependencies = {
			getAdmins: async () => [
				{ id: 7, name: "Ada", email: "ada@example.com" },
				{ id: 8, name: "Lin", email: "lin@example.com" },
			],
			getContact: async (_db: unknown, id: number) => ({
				id: id + 100,
				profileId: id,
				name: `User ${id}`,
			}),
			createActivity: async (_db: unknown, activity: unknown) => {
				activities += 1;
				createdActivityInputs.push(
					activity as (typeof createdActivityInputs)[number],
				);
				return { id: 501 };
			},
		};
		const input = {
			now: new Date("2026-08-24T14:01:00.000Z"),
			actorUserId: 99,
			dependencies: dependencies as never,
		};
		expect(
			await runSalesHandoffEscalationScan(db as never, input),
		).toMatchObject({
			results: [{ status: "NOTIFIED", recipients: 2 }],
		});
		expect(
			await runSalesHandoffEscalationScan(db as never, input),
		).toMatchObject({
			scanned: 0,
		});
		expect(activities).toBe(1);
		expect(ledger).toHaveLength(2);
		const createdActivityInput = createdActivityInputs[0];
		if (!createdActivityInput)
			throw new Error("Activity input was not captured");
		const storedTags = mergeTagRows(
			explodeTagEntries({
				...createdActivityInput.tags,
				channel: createdActivityInput.type,
				source: createdActivityInput.source,
			}),
		);
		const [notification] = transformNotifications([
			{ id: 501, tags: storedTags },
		]);
		expect(notification).toMatchObject({
			type: "sales_handoff_action_escalation",
			isClickable: true,
			action: {
				type: "sales_handoff_action_escalation",
				label: "Open Action",
				data: {
					orderId: "09388PC",
					actionType: "MATERIAL",
					targetControlUid: null,
				},
			},
		});
		expect(candidateQueries[0]).toMatchObject({
			where: { organizationId: { in: [4] } },
			take: 50,
		});
	});

	test("does not let epochs without an active recipient organization occupy the bounded scan", async () => {
		const { db, candidateQueries } = escalationDb();
		db.modelHasRoles.findMany = async () => [];

		expect(
			await runSalesHandoffEscalationScan(db as never, {
				now: new Date("2026-08-24T14:01:00.000Z"),
				actorUserId: 99,
			}),
		).toEqual({ scanned: 0, results: [] });
		expect(candidateQueries).toHaveLength(0);
	});

	test("a resolved epoch cancels unsent escalation", async () => {
		const { db, epoch } = escalationDb();
		epoch.resolvedAt = new Date("2026-08-24T13:59:00.000Z");
		const result = await runSalesHandoffEscalationScan(db as never, {
			now: new Date("2026-08-24T14:01:00.000Z"),
			actorUserId: 99,
			dependencies: {} as never,
		});
		expect(result).toEqual({ scanned: 0, results: [] });
	});
});
