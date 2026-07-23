import { auth } from "@api/db/queries/user";
import type { TRPCContext } from "@api/trpc/init";
import type { PermissionScope } from "@gnd/utils/constants";
import { TRPCError } from "@trpc/server";

export async function requireAnyOperationalPermission(
	ctx: TRPCContext,
	permissions: readonly PermissionScope[],
	message: string,
) {
	const session = await auth(ctx);
	if (permissions.some((permission) => session.can[permission])) {
		return session;
	}
	throw new TRPCError({
		code: "FORBIDDEN",
		message,
	});
}
