import { describe, expect, mock, test } from "bun:test";
import {
	getAssistantAccessState,
	setAssistantDirectPermission,
} from "./access-governance";

function database(
	roleName: string | null,
	roleGranted = false,
	directlyGranted = false,
	revoked = false,
) {
	const permission = { id: 5 };
	let directGrant = directlyGranted;
	const db = {
		users: {
			findFirst: mock(async () =>
				revoked
					? null
					: {
							id: 42,
							roles: roleName
								? [
										{
											role: {
												name: roleName,
												RoleHasPermissions: roleGranted
													? [{ permissionId: 5 }]
													: [],
											},
										},
									]
								: [],
						},
			),
		},
		modelHasPermissions: {
			findFirst: mock(async () => (directGrant ? { permissionId: 5 } : null)),
			upsert: mock(async () => {
				directGrant = true;
				return {};
			}),
			deleteMany: mock(async () => {
				directGrant = false;
				return { count: 1 };
			}),
		},
		permissions: { findFirst: mock(async () => permission) },
	};
	return db;
}

describe("Assistant effective permission", () => {
	test("Super Admin opens without a separate entitlement", async () => {
		expect(
			(await getAssistantAccessState(database("Super Admin") as never, 42))
				.enabled,
		).toBe(true);
	});
	test("role and direct employee grants independently admit access", async () => {
		expect(
			(await getAssistantAccessState(database("Sales", true) as never, 42))
				.enabled,
		).toBe(true);
		expect(
			(
				await getAssistantAccessState(
					database("Sales", false, true) as never,
					42,
				)
			).enabled,
		).toBe(true);
	});
	test("ungranted or revoked employees cannot open direct URL/API", async () => {
		expect(
			(await getAssistantAccessState(database("Sales") as never, 42)).enabled,
		).toBe(false);
		expect(
			(
				await getAssistantAccessState(
					database("Super Admin", false, false, true) as never,
					42,
				)
			).enabled,
		).toBe(false);
	});
	test("removing a direct grant leaves role-inherited access intact", async () => {
		const db = database("Sales", true, true);
		const source = await setAssistantDirectPermission(db as never, {
			userId: 42,
			enabled: false,
		});
		expect(db.modelHasPermissions.deleteMany).toHaveBeenCalledTimes(1);
		expect(source.direct).toBe(false);
		expect(source.inherited).toBe(true);
		expect(source.enabled).toBe(true);
	});
	test("removing the only direct grant denies access", async () => {
		const db = database("Sales", false, true);
		const source = await setAssistantDirectPermission(db as never, {
			userId: 42,
			enabled: false,
		});
		expect(source.enabled).toBe(false);
	});
});
