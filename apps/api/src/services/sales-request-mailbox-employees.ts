import type { Database } from "@gnd/db";
import { TRPCError } from "@trpc/server";

export async function requireActiveSalesRequestMailboxEmployees(input: {
	db: Pick<Database, "users">;
	userIds: readonly number[];
}) {
	const requestedIds = [...new Set(input.userIds)].sort(
		(left, right) => left - right,
	);
	if (requestedIds.length === 0) return;

	const rows = await input.db.users.findMany({
		where: {
			id: { in: requestedIds },
			type: "EMPLOYEE",
			employeeProfileId: { not: null },
			deletedAt: null,
			accessRevokedAt: null,
		},
		select: { id: true, type: true, employeeProfileId: true },
	});
	const eligible = new Set(
		rows
			.filter(
				(row) =>
					row.type === "EMPLOYEE" &&
					Number.isSafeInteger(row.employeeProfileId) &&
					Number(row.employeeProfileId) > 0,
			)
			.map((row) => row.id),
	);
	const rejected = requestedIds.filter((id) => !eligible.has(id));
	if (rejected.length > 0) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Mailbox users must be active employees: ${rejected.join(", ")}`,
		});
	}
}
