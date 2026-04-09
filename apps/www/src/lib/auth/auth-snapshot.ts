import type { Roles, Users } from "@/db";
import type { ICan } from "@/types/auth";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

export type AuthSnapshot = {
	userId: Users["id"] | null;
	role: Roles | null;
	roleId: Roles["id"] | null;
	can: ICan;
	name: Users["name"] | null;
	email: Users["email"] | null;
};

type SessionLike = Pick<Session, "user" | "role" | "can">;
type TokenLike = Partial<Pick<JWT, "user" | "role" | "can">>;

function emptyAuthSnapshot(): AuthSnapshot {
	return {
		userId: null,
		role: null,
		roleId: null,
		can: {} as ICan,
		name: null,
		email: null,
	};
}

export function toAuthSnapshot(source?: SessionLike | TokenLike | null) {
	if (!source?.user?.id) {
		return null;
	}

	return {
		userId: source.user.id,
		role: source.role ?? null,
		roleId: source.role?.id ?? null,
		can: (source.can ?? {}) as ICan,
		name: source.user.name ?? null,
		email: source.user.email ?? null,
	} satisfies AuthSnapshot;
}
