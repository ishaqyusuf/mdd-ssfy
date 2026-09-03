import { refreshSpecialOrderSalesDocuments } from "@api/db/queries/special-order-documents";
import type { TRPCContext } from "@api/trpc/init";
import {
	buildSpecialOrderCustomerVisibleRevision,
	hasSpecialOrderCustomerEmail,
	toSpecialOrderJson,
} from "@gnd/sales/special-order";
import { TRPCError } from "@trpc/server";
import { getNewSalesForm } from "./new-sales-form";
import {
	buildSpecialOrderEnrollmentActivity,
	createSalesFormTimelineActivity,
	getSalesActivitySenderContactId,
} from "./sales-form-activity";
import { getSpecialOrderEnrollmentAccess } from "./special-order-settings";

type EnrollmentDependencies = {
	loadSalesForm: typeof getNewSalesForm;
	getEnrollmentAccess: typeof getSpecialOrderEnrollmentAccess;
	getActivitySenderContactId: typeof getSalesActivitySenderContactId;
	createTimelineActivity: typeof createSalesFormTimelineActivity;
	refreshDocuments: typeof refreshSpecialOrderSalesDocuments;
};

const defaultDependencies: EnrollmentDependencies = {
	loadSalesForm: getNewSalesForm,
	getEnrollmentAccess: getSpecialOrderEnrollmentAccess,
	getActivitySenderContactId: getSalesActivitySenderContactId,
	createTimelineActivity: createSalesFormTimelineActivity,
	refreshDocuments: refreshSpecialOrderSalesDocuments,
};

export async function enrollSpecialOrderFromOverview(
	ctx: TRPCContext,
	input: { salesId: number; reason?: string | null },
	dependencies: Partial<EnrollmentDependencies> = {},
) {
	if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
	const userId = ctx.userId;
	const reason = input.reason?.trim() || null;
	if (reason && (reason.length < 3 || reason.length > 500)) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Enter a reason between 3 and 500 characters.",
		});
	}
	const deps = { ...defaultDependencies, ...dependencies };
	const result = await ctx.db.$transaction(
		async (tx) => {
			const order = await tx.salesOrders.findFirst({
				where: { id: input.salesId, type: "order", deletedAt: null },
				select: {
					id: true,
					slug: true,
					orderId: true,
					dealerAuthId: true,
					customerId: true,
					customer: {
						select: {
							id: true,
							name: true,
							businessName: true,
							email: true,
							phoneNo: true,
							phoneNo2: true,
							address: true,
							deletedAt: true,
						},
					},
					customerProfileId: true,
					billingAddressId: true,
					shippingAddressId: true,
					specialOrderDeclaration: true,
					specialOrderStatus: true,
					specialOrderRevision: true,
					currentSpecialOrderApprovalId: true,
					currentSpecialOrderRequestId: true,
				},
			});
			if (!order) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Sale not found." });
			}
			if (order.dealerAuthId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"SPECIAL_ORDER_ENROLLMENT_RESTRICTED: Dealer-origin orders cannot be enrolled from Sales Overview.",
				});
			}
			const enrollmentAccess = await deps.getEnrollmentAccess(
				tx as unknown as TRPCContext["db"],
				userId,
			);
			if (!enrollmentAccess.canEnroll) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"SPECIAL_ORDER_ENROLLMENT_RESTRICTED: You are not included in the current Special Order enrollment audience.",
				});
			}
			if (order.specialOrderDeclaration === "YES") {
				return {
					enrolled: false as const,
					salesId: order.id,
					orderId: order.orderId,
					status: order.specialOrderStatus,
					revision: order.specialOrderRevision,
				};
			}
			if (
				!order.customer ||
				order.customer.deletedAt ||
				!hasSpecialOrderCustomerEmail(order.customer.email)
			) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message:
						"SPECIAL_ORDER_CUSTOMER_EMAIL_REQUIRED: Add a valid customer email before marking this as a Special Order.",
				});
			}

			const [projection, customerProfile, billingAddress, shippingAddress, actor] =
				await Promise.all([
					deps.loadSalesForm(
						{ ...ctx, db: tx as unknown as TRPCContext["db"] },
						{ type: "order", slug: order.slug },
					),
					order.customerProfileId
						? tx.customerTypes.findFirst({
								where: { id: order.customerProfileId, deletedAt: null },
								select: {
									id: true,
									title: true,
									coefficient: true,
									salesPercentage: true,
								},
							})
						: null,
					order.billingAddressId
						? tx.addressBooks.findFirst({
								where: { id: order.billingAddressId, deletedAt: null },
								select: {
									id: true,
									name: true,
									address1: true,
									address2: true,
									city: true,
									state: true,
									country: true,
									email: true,
									phoneNo: true,
								},
							})
						: null,
					order.shippingAddressId
						? tx.addressBooks.findFirst({
								where: { id: order.shippingAddressId, deletedAt: null },
								select: {
									id: true,
									name: true,
									address1: true,
									address2: true,
									city: true,
									state: true,
									country: true,
									email: true,
									phoneNo: true,
								},
							})
						: null,
					tx.users.findFirst({
						where: { id: userId, deletedAt: null },
						select: { name: true },
					}),
				]);
			if (projection.salesId !== order.id || projection.type !== "order") {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message:
						"SPECIAL_ORDER_PROJECTION_UNAVAILABLE: The current order could not be prepared for Special Order enrollment.",
				});
			}

			const revision = buildSpecialOrderCustomerVisibleRevision({
				customer: order.customer,
				customerProfile,
				billingAddress,
				shippingAddress,
				orderDate: projection.form.createdAt,
				lineItems: projection.lineItems,
				extraCosts: projection.extraCosts,
				summary: projection.summary,
			});
			const now = new Date();
			await tx.specialOrderApprovalRequest.updateMany({
				where: { salesOrderId: order.id, status: "ACTIVE" },
				data: {
					status: "REVOKED",
					revokedAt: now,
					revokedReason: "SPECIAL_ORDER_REENROLLED",
				},
			});
			await tx.specialOrderApprovalEvidence.updateMany({
				where: { salesOrderId: order.id, supersededAt: null },
				data: {
					supersededAt: now,
					supersededReason: "Special Order re-enrolled",
					supersededByUserId: userId,
				},
			});
			await tx.salesOrders.update({
				where: { id: order.id },
				data: {
					specialOrderDeclaration: "YES",
					specialOrderStatus: "SIGNATURE_PENDING",
					specialOrderRevision: revision,
					currentSpecialOrderApprovalId: null,
					currentSpecialOrderRequestId: null,
				},
			});
			const senderContactId = await deps.getActivitySenderContactId(
				tx as unknown as TRPCContext["db"],
				userId,
			);
			await deps.createTimelineActivity(
				tx as unknown as TRPCContext["db"],
				{
					salesId: order.id,
					orderId: order.orderId,
					senderContactId,
					copy: buildSpecialOrderEnrollmentActivity({
						orderId: order.orderId,
						reason,
					}),
				},
			);
			await tx.salesHistory.create({
				data: {
					salesId: order.id,
					name: "Special Order classification enabled",
					authorName: actor?.name || "System",
					data: toSpecialOrderJson({
						reason,
						priorDeclaration: order.specialOrderDeclaration,
						priorState: order.specialOrderStatus,
						priorRevision: order.specialOrderRevision,
						revision,
						outcome: "SIGNATURE_PENDING",
						source: "sales_overview",
					}),
				},
			});
			return {
				enrolled: true as const,
				salesId: order.id,
				orderId: order.orderId,
				status: "SIGNATURE_PENDING" as const,
				revision,
			};
		},
		{ isolationLevel: "Serializable" },
	);

	if (result.enrolled) {
		await deps
			.refreshDocuments({
				db: ctx.db,
				salesOrderId: result.salesId,
				reason: "special_order_enrolled_from_overview",
			})
			.catch(() => undefined);
	}
	return result;
}
