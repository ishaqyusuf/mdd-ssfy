import { expect, mock, test } from "bun:test";
import { deliverAssistantFeatureNotification } from "./feature-notifications";

test("uses a stable destination delivery key when a developer outbox item is recovered", async () => {
	const upsert = mock(async (input) => input.create);
	const updateMany = mock(async () => ({ count: 1 }));
	const db = {
		assistantFeatureNotificationOutbox: {
			findFirst: mock(async () => ({
				id: "outbox-1",
				status: "delivering",
				attempts: 1,
				availableAt: new Date("2026-09-13T11:00:00.000Z"),
				kind: "developer_intake",
				request: {
					id: "request-1",
					summary: "Generate installation images",
					ownerUserId: 42,
				},
				subscription: null,
				release: null,
			})),
			updateMany,
		},
		users: {
			findMany: mock(async () => [{ id: 9 }, { id: 10 }]),
		},
		notifications: { upsert },
	};
	const result = await deliverAssistantFeatureNotification(db as never);
	expect(result.status).toBe("delivered");
	expect(upsert).toHaveBeenCalledTimes(2);
	const keys = upsert.mock.calls.map(
		([input]) => input.create.assistantDeliveryKey,
	);
	expect(new Set(keys).size).toBe(2);
	expect(keys.every((key) => /^[a-f0-9]{64}$/.test(key))).toBe(true);
	expect(updateMany.mock.calls.at(-1)?.[0]).toMatchObject({
		where: { status: "delivering", attempts: 2 },
		data: { status: "delivered" },
	});
});
