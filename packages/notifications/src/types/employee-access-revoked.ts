import type { NotificationHandler } from "../base";
import {
	type EmployeeAccessRevokedTags,
	employeeAccessRevokedSchema,
} from "../schemas";

export const employeeAccessRevoked: NotificationHandler = {
	schema: employeeAccessRevokedSchema,
	createActivity(data, author) {
		const payload: EmployeeAccessRevokedTags = {
			type: "employee_access_revoked",
			source: "user",
			priority: 8,
			userId: data.userId,
			userName: data.userName,
			userEmail: data.userEmail ?? null,
			revokedById: data.revokedById,
			revokedByName: data.revokedByName,
			revokedAt: data.revokedAt,
		};

		return {
			type: "employee_access_revoked",
			source: "user",
			subject: "Employee access revoked",
			headline: `${data.revokedByName} revoked access for ${data.userName}.`,
			authorId: author.id,
			tags: payload,
		};
	},
};
