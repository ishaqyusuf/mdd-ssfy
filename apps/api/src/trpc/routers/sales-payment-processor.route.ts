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
import { createTRPCRouter, protectedProcedure } from "../init";

export const salesPaymentProcessorRouter = createTRPCRouter({
	applyPayment: protectedProcedure
		.input(salesPaymentProcessorApplyPaymentSchema)
		.mutation(async (props) => {
			return applySalesPaymentProcessorPayment(props.ctx, props.input);
		}),
	cancelTerminalPayment: protectedProcedure
		.input(salesPaymentProcessorCancelTerminalPaymentSchema)
		.mutation(async (props) => {
			return cancelSalesPaymentProcessorTerminalPayment(props.ctx, props.input);
		}),
	getTerminalPaymentStatus: protectedProcedure
		.input(salesPaymentProcessorTerminalStatusSchema)
		.query(async (props) => {
			return getSalesPaymentProcessorTerminalStatus(props.input);
		}),
	sendPaymentLink: protectedProcedure
		.input(salesPaymentProcessorSendPaymentLinkSchema)
		.mutation(async (props) => {
			return sendSalesPaymentProcessorPaymentLink(props.ctx, props.input);
		}),
});
