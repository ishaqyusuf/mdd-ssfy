import {
	acceptQuote,
	acceptQuoteSchema,
	createSalesCheckoutLink,
	createSalesCheckoutLinkSchema,
	generateDeviceCode,
	generateDeviceCodeSchema,
	initializeCheckout,
	initializeCheckoutSchema,
	initializeQuoteAcceptance,
	initializeQuoteAcceptanceSchema,
	verifyPayment,
	verifyPaymentSchema,
} from "@api/db/queries/checkout";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

export const checkoutRouter = createTRPCRouter({
	initializeCheckout: publicProcedure
		.input(initializeCheckoutSchema)
		.query(async (props) => {
			return initializeCheckout(props.ctx, props.input);
		}),
	initializeQuoteAcceptance: publicProcedure
		.input(initializeQuoteAcceptanceSchema)
		.query(async (props) => {
			return initializeQuoteAcceptance(props.ctx, props.input);
		}),
	acceptQuote: publicProcedure
		.input(acceptQuoteSchema)
		.mutation(async (props) => {
			return acceptQuote(props.ctx, props.input);
		}),
	createSalesCheckoutLink: publicProcedure
		.input(createSalesCheckoutLinkSchema)
		.mutation(async (props) => {
			return createSalesCheckoutLink(props.ctx, props.input);
		}),
	verifyPayment: publicProcedure
		.input(verifyPaymentSchema)
		.mutation(async (props) => {
			return verifyPayment(props.ctx, props.input);
		}),
	generateDeviceCode: publicProcedure
		.input(generateDeviceCodeSchema)
		.mutation(async (props) => {
			return generateDeviceCode(props.ctx, props.input);
		}),
});
