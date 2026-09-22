import {
	applySalesPaymentProcessorPayment,
	cancelSalesPaymentProcessorTerminalPayment,
	getSalesPaymentProcessorTerminalStatus,
	salesPaymentProcessorApplyPaymentSchema,
	salesPaymentProcessorCancelTerminalPaymentSchema,
	salesPaymentProcessorSendPaymentLinkSchema,
	salesPaymentProcessorTerminalStatusSchema,
	sendSalesPaymentProcessorPaymentLink,
} from "@api/db/queries/sales-payment-processor";
import { requireAnyOperationalPermission } from "@api/utils/operational-route-access";
import { createTRPCRouter, protectedProcedure } from "../init";

export const salesPaymentProcessorRouter = createTRPCRouter({
	applyPayment: protectedProcedure
		.input(salesPaymentProcessorApplyPaymentSchema)
		.mutation(async (props) => {
			await requireAnyOperationalPermission(
				props.ctx,
				["editOrderPayment"],
				"You do not have permission to record Sales payments.",
			);
			return applySalesPaymentProcessorPayment(props.ctx, props.input);
		}),
	cancelTerminalPayment: protectedProcedure
		.input(salesPaymentProcessorCancelTerminalPaymentSchema)
		.mutation(async (props) => {
			await requireAnyOperationalPermission(
				props.ctx,
				["editOrderPayment"],
				"You do not have permission to cancel Sales payments.",
			);
			return cancelSalesPaymentProcessorTerminalPayment(props.ctx, props.input);
		}),
	getTerminalPaymentStatus: protectedProcedure
		.input(salesPaymentProcessorTerminalStatusSchema)
		.query(async (props) => {
			await requireAnyOperationalPermission(
				props.ctx,
				["viewOrderPayment", "editOrderPayment"],
				"You do not have permission to view Sales payments.",
			);
			return getSalesPaymentProcessorTerminalStatus(props.ctx, props.input);
		}),
	sendPaymentLink: protectedProcedure
		.input(salesPaymentProcessorSendPaymentLinkSchema)
		.mutation(async (props) => {
			await requireAnyOperationalPermission(
				props.ctx,
				["editOrderPayment"],
				"You do not have permission to send Sales payment links.",
			);
			return sendSalesPaymentProcessorPaymentLink(props.ctx, props.input);
		}),
});
