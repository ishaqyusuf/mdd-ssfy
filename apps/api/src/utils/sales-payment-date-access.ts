import type { TRPCContext } from "@api/trpc/init";
import { canSetSalesPaymentDate } from "@gnd/sales/payment-system/payment-date";
import { TRPCError } from "@trpc/server";

export async function assertCanSetSalesPaymentDate(
	ctx: TRPCContext,
	paymentDate?: string | null,
) {
	if (!paymentDate) return;

	const actor = ctx.userId
		? await ctx.db.users.findFirst({
				where: {
					id: ctx.userId,
					deletedAt: null,
					accessRevokedAt: null,
				},
				select: {
					roles: {
						where: {
							deletedAt: null,
							role: { deletedAt: null },
						},
						select: { role: { select: { name: true } } },
					},
				},
			})
		: null;
	const roleNames = actor?.roles.map((entry) => entry.role.name) ?? [];

	if (!canSetSalesPaymentDate(roleNames)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only Super Admin can select a payment date.",
		});
	}
}
