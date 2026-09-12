export const QUICK_LOGIN_NO_ROLE = "No role";

type UserWithRole = {
	role?: string | null;
};

export type QuickLoginRoleGroup<T> = {
	role: string;
	count: number;
	users: T[];
};

export function groupQuickLoginUsersByRole<T extends UserWithRole>(
	users: readonly T[],
): QuickLoginRoleGroup<T>[] {
	const groups = new Map<string, T[]>();

	for (const user of users) {
		const role = user.role?.trim() || QUICK_LOGIN_NO_ROLE;
		const roleUsers = groups.get(role);

		if (roleUsers) {
			roleUsers.push(user);
		} else {
			groups.set(role, [user]);
		}
	}

	return Array.from(groups, ([role, roleUsers]) => ({
		role,
		count: roleUsers.length,
		users: roleUsers,
	})).sort((left, right) => {
		if (left.role === QUICK_LOGIN_NO_ROLE) return 1;
		if (right.role === QUICK_LOGIN_NO_ROLE) return -1;

		return left.role.localeCompare(right.role);
	});
}
