// @ts-expect-error package typecheck does not include Bun test types.
import { describe, expect, test } from "bun:test";
import {
	getUserNotificationChannelPreferences,
	updateUserNotificationChannelPreference,
} from "./channel-preferences";

function createDb({
	roleName,
	channels = [],
}: {
	roleName: string;
	channels?: unknown[];
}) {
	const calls: Array<{ method: string; input: unknown }> = [];
	const db = {
		users: {
			findFirst: (input: unknown) => {
				calls.push({ method: "users.findFirst", input });
				return Promise.resolve({
					email: "admin@example.com",
					name: "Admin User",
					phoneNo: null,
				});
			},
		},
		notePadContacts: {
			findFirst: (input: unknown) => {
				calls.push({ method: "notePadContacts.findFirst", input });
				return Promise.resolve({ id: 77 });
			},
			create: (input: unknown) => {
				calls.push({ method: "notePadContacts.create", input });
				return Promise.resolve({ id: 77 });
			},
		},
		modelHasRoles: {
			findMany: (input: unknown) => {
				calls.push({ method: "modelHasRoles.findMany", input });
				return Promise.resolve([
					{
						roleId: 18,
						role: {
							name: roleName,
						},
					},
				]);
			},
		},
		noteChannels: {
			findMany: (input: unknown) => {
				calls.push({ method: "noteChannels.findMany", input });
				return Promise.resolve(channels);
			},
			findFirst: (input: unknown) => {
				calls.push({ method: "noteChannels.findFirst", input });
				return Promise.resolve({
					id: 42,
					emailSupport: true,
					inAppSupport: true,
					whatsappSupport: false,
					assignedUsers: [],
				});
			},
		},
		assignedUserNoteChannel: {
			create: (input: unknown) => {
				calls.push({ method: "assignedUserNoteChannel.create", input });
				return Promise.resolve(input);
			},
			update: (input: unknown) => {
				calls.push({ method: "assignedUserNoteChannel.update", input });
				return Promise.resolve(input);
			},
		},
	};

	return { db, calls };
}

describe("notification channel preferences access", () => {
	test("returns all active channels for super admins", async () => {
		const { db, calls } = createDb({
			roleName: "Super Admin",
			channels: [
				{
					id: 1,
					channelName: "sales_checkout_success",
					priority: 3,
					emailSupport: true,
					inAppSupport: true,
					whatsappSupport: false,
					assignedUsers: [],
				},
			],
		});

		const channels = await getUserNotificationChannelPreferences(db as never, 1);

		expect(channels.map((channel) => channel.name)).toEqual([
			"sales_checkout_success",
		]);
		expect(
			calls.find((call) => call.method === "noteChannels.findMany")?.input,
		).toMatchObject({
			where: {
				deletedAt: null,
			},
		});
		expect(
			calls.find((call) => call.method === "noteChannels.findMany")?.input,
		).not.toMatchObject({
			where: {
				OR: expect.any(Array),
			},
		});
	});

	test("limits non-super-admins to direct or role-attached channels", async () => {
		const { db, calls } = createDb({
			roleName: "Sales Team",
		});

		await getUserNotificationChannelPreferences(db as never, 10);

		expect(
			calls.find((call) => call.method === "noteChannels.findMany")?.input,
		).toMatchObject({
			where: {
				deletedAt: null,
				OR: [
					{
						assignedUsers: {
							some: {
								notePadContactId: 77,
							},
						},
					},
					{
						noteChannelRoles: {
							some: {
								deletedAt: null,
								roleId: {
									in: [18],
								},
							},
						},
					},
				],
			},
		});
	});

	test("hides channels without any supported visible delivery method", async () => {
		const { db } = createDb({
			roleName: "Super Admin",
			channels: [
				{
					id: 1,
					channelName: "unsupported_channel",
					priority: 1,
					emailSupport: false,
					inAppSupport: false,
					whatsappSupport: false,
					assignedUsers: [],
				},
				{
					id: 2,
					channelName: "sales_checkout_success",
					priority: 3,
					emailSupport: false,
					inAppSupport: true,
					whatsappSupport: false,
					assignedUsers: [],
				},
			],
		});

		const channels = await getUserNotificationChannelPreferences(db as never, 1);

		expect(channels.map((channel) => channel.name)).toEqual([
			"sales_checkout_success",
		]);
	});

	test("allows super admins to update any active notification channel", async () => {
		const { db, calls } = createDb({
			roleName: "Super Admin",
		});

		await updateUserNotificationChannelPreference(db as never, 1, 42, {
			inAppEnabled: false,
		});

		expect(
			calls.find((call) => call.method === "noteChannels.findFirst")?.input,
		).toMatchObject({
			where: {
				deletedAt: null,
				id: 42,
			},
		});
		expect(
			calls.find((call) => call.method === "noteChannels.findFirst")?.input,
		).not.toMatchObject({
			where: {
				OR: expect.any(Array),
			},
		});
	});
});
