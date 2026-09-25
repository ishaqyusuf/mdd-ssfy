import { getActiveCompanyMemberWhere } from "@gnd/auth/company-member";
import type { Database } from "@gnd/db";
import { type JwtPayload, verify } from "jsonwebtoken";

/** Accept legacy bearer JWTs only while their backing session and user are live. */
export async function resolveLegacyTrpcJwtUserId(input: {
	token: string;
	secret: string | undefined;
	db: Pick<Database, "session">;
	allowCustomer: boolean;
}) {
	if (!input.token || !input.secret) return undefined;
	let payload: JwtPayload;
	try {
		const verified = verify(input.token, input.secret);
		if (typeof verified === "string") return undefined;
		payload = verified;
	} catch {
		return undefined;
	}
	const userId = Number(payload.userId);
	const sessionId = payload.sessionId;
	if (
		!Number.isSafeInteger(userId) ||
		userId <= 0 ||
		typeof sessionId !== "string" ||
		!sessionId.trim()
	) {
		return undefined;
	}
	const memberWhere = getActiveCompanyMemberWhere();
	const session = await input.db.session.findFirst({
		where: {
			id: sessionId,
			userId,
			deletedAt: null,
			OR: [{ expires: null }, { expires: { gt: new Date() } }],
			user: {
				is: input.allowCustomer
					? {
							OR: [
								memberWhere,
								{
									type: "CUSTOMER",
									deletedAt: null,
									accessRevokedAt: null,
								},
							],
						}
					: memberWhere,
			},
		},
		select: { userId: true },
	});
	return session ? userId : undefined;
}
