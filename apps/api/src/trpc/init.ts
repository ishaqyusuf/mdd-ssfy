import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getLegacyWebAuthUserId } from "@gnd/auth";
import { getWebAuthSession } from "@gnd/auth/better-auth/www";
import { buildWebAppSessionByToken } from "@gnd/auth/better-auth/www-session";
import { getRequestCountryCode } from "@gnd/auth/request-country";
import { type Database, db } from "@gnd/db";
import type { getActiveDealerByAuthUserId } from "@gnd/db/queries";
import { TRPCError, initTRPC } from "@trpc/server";
import type { Context } from "hono";
import { getSignedCookie, setSignedCookie } from "hono/cookie";
import { type JwtPayload, verify } from "jsonwebtoken";
import superjson from "superjson";
import { withAuthPermission } from "./middleware/auth-permission";
export type TRPCContext = {
	//   session: Session | null;
	//   supabase: SupabaseClient;
	db: Database;
	userId?: number;
	dealerAuthUserId?: string;
	dealer?: Awaited<ReturnType<typeof getActiveDealerByAuthUserId>>;
	guestTokenHash?: string;
	requestId?: string;
	userAgent?: string;
	ipAddress?: string;
	countryCode?: string;
	//   geo: ReturnType<typeof getGeoContext>;
	//   teamId?: string;
};
export const createTRPCContext = async (
	_: unknown,
	c: Context,
): Promise<TRPCContext> => {
	const header = c.req.header();
	const isApp = header["x-trpc-source"] === "app";
	const isStorefront = c.req.path.startsWith("/api/storefront/trpc");
	const auth = isApp
		? (header["x-app-authorization"] ?? header.authorization ?? "")
		: (header.authorization ?? "");

	const token = auth?.split(" ")?.[1]?.split("|")?.[0] || "";
	let userId: string | number | undefined;
	if (token) {
		const webSession = await buildWebAppSessionByToken(token);
		if (webSession?.user?.id) {
			userId = webSession.user.id;
		} else {
			try {
				const secret = process.env.JWT_SECRET;
				if (!secret) throw new Error("JWT secret is not configured.");
				const payload = verify(token, secret);
				userId =
					typeof payload === "string"
						? undefined
						: (payload as JwtPayload & { userId?: string | number }).userId;
			} catch {
				userId = undefined;
			}
		}
	}
	if (!userId && !isApp) {
		const webSession = await getWebAuthSession(c.req.raw.headers);
		userId = webSession?.user?.id;
	}
	if (!userId && isStorefront) {
		userId = await getLegacyWebAuthUserId(c.req.header("cookie"));
	}

	const parsedUserId =
		typeof userId === "string" || typeof userId === "number"
			? Number(userId)
			: undefined;
	let guestTokenHash: string | undefined;
	if (isStorefront) {
		const secret =
			process.env.STOREFRONT_GUEST_SECRET ||
			process.env.JWT_SECRET ||
			process.env.AUTH_SECRET ||
			process.env.NEXTAUTH_SECRET ||
			process.env.BETTER_AUTH_SECRET ||
			(process.env.NODE_ENV !== "production"
				? "gnd-local-storefront-guest"
				: "");
		if (secret) {
			const cookieName = "gnd_storefront_guest";
			let guestToken = await getSignedCookie(c, secret, cookieName);
			if (!guestToken) {
				guestToken = randomBytes(32).toString("base64url");
				await setSignedCookie(c, cookieName, guestToken, secret, {
					httpOnly: true,
					sameSite: "Lax",
					secure: process.env.NODE_ENV === "production",
					maxAge: 60 * 60 * 24 * 30,
					path: "/",
				});
			}
			guestTokenHash = createHash("sha256")
				.update(guestToken)
				.digest("hex");
		}
	}

	return {
		db,
		userId: Number.isFinite(parsedUserId) ? parsedUserId : undefined,
		guestTokenHash,
		requestId: c.req.header("x-request-id") || randomUUID(),
		userAgent: c.req.header("user-agent"),
		ipAddress:
			c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
			c.req.header("x-real-ip"),
		countryCode: getRequestCountryCode(c.req.raw.headers) ?? undefined,
	};
};

const t = initTRPC.context<TRPCContext>().create({
	transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
const withPrimaryDbMiddleware = t.middleware(async (opts) => {
	return withAuthPermission({
		ctx: opts.ctx,
		// type: opts.type,
		next: opts.next,
	});
});
// const withTeamPermissionMiddleware = t.middleware(async (opts) => {
//   return withTeamPermission({
//     ctx: opts.ctx,
//     next: opts.next,
//   });
// });

export const publicProcedure = t.procedure.use(withPrimaryDbMiddleware);

export const protectedProcedure = t.procedure
	.use(withPrimaryDbMiddleware)
	.use(async (opts) => {
		if (!opts?.ctx?.userId)
			throw new TRPCError({
				code: "UNAUTHORIZED",
			});
		return opts.next({
			ctx: {
				...opts.ctx,
				userId: opts.ctx.userId,
			},
		});
	});

export const customerProcedure = protectedProcedure.use(async (opts) => {
	const customer = await opts.ctx.db.customers.findFirst({
		where: {
			userId: opts.ctx.userId,
			deletedAt: null,
			user: {
				type: "CUSTOMER",
				deletedAt: null,
				accessRevokedAt: null,
			},
		},
		select: {
			id: true,
			userId: true,
		},
	});
	if (!customer) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "A customer account is required.",
		});
	}
	return opts.next({
		ctx: {
			...opts.ctx,
			customerId: customer.id,
		},
	});
});
// export const protectedProcedure = t.procedure.use();

export const dealerProtectedProcedure = t.procedure
	.use(withPrimaryDbMiddleware)
	.use(async (opts) => {
		if (!opts.ctx.dealerAuthUserId || !opts.ctx.dealer) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
			});
		}

		return opts.next({
			ctx: {
				...opts.ctx,
				db: opts.ctx.db,
				dealerAuthUserId: opts.ctx.dealerAuthUserId,
				dealer: opts.ctx.dealer,
			},
		});
	});
