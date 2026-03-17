import type {
	SalesPaymentTokenSchema,
	SalesPdfToken,
} from "@gnd/utils/tokenizer";
import { addDays } from "date-fns";
import type { SalesPrintModes } from "src/constants";
import type { SalesType } from "../types";
import {
	type ReminderPayPlan,
	resolveReminderAmount,
} from "./reminder-pay-plan";

export const SALES_REMINDER_EXPIRY_DAYS = 7;

export type SalesReminderDraft = {
	type: SalesType;
	amount?: number;
	dueAmount?: number;
	payPlan?: ReminderPayPlan | null;
	preferredAmount?: number | null;
	percentage?: number | null;
	ids: number[];
	walletId: number | null | undefined;
	mode?: SalesPrintModes;
	customer: {
		name: string;
		email: string;
	};
};

export type BuildSalesReminderTaskPayloadInput = {
	auth: {
		id?: number | string | null;
		name: string;
		email: string;
	};
	tokenGeneratorFn: (
		payload: SalesPdfToken | SalesPaymentTokenSchema,
	) => Promise<string>;
	data: SalesReminderDraft[];
};

export async function buildSalesReminderTaskPayload(
	input: BuildSalesReminderTaskPayloadInput,
) {
	const { auth, data, tokenGeneratorFn: generateToken } = input;
	const parsedSalesRepId = auth.id == null ? undefined : Number(auth.id);
	const salesRepId = Number.isFinite(parsedSalesRepId)
		? parsedSalesRepId
		: undefined;

	const payload = {
		salesRepId,
		salesRepEmail: auth.email,
		salesRep: auth.name,
		sales: [] as Array<{
			type: SalesType;
			salesIds: number[];
			customerEmail: string;
			customerName: string;
			downloadToken: string | null;
			paymentToken: string | null;
		}>,
	};

	const expiry = addDays(new Date(), SALES_REMINDER_EXPIRY_DAYS).toISOString();

	for (const sale of data) {
		const mode = sale.mode || "order";
		const amount =
			sale.payPlan != null ||
			sale.percentage != null ||
			sale.preferredAmount != null
				? resolveReminderAmount({
						due: sale.dueAmount || sale.amount || 0,
						payPlan: sale.payPlan,
						preferredAmount: sale.preferredAmount,
						percentage: sale.percentage,
					})
				: Number(sale.amount || 0);

		const downloadToken = await generateToken({
			salesIds: sale.ids,
			expiry,
			mode,
		} satisfies SalesPdfToken);

		const paymentToken =
			((!amount && sale.payPlan !== "flexible") || sale.walletId == null)
				? null
				: await generateToken({
						salesIds: sale.ids,
						expiry,
						percentage: sale.percentage,
						payPlan: sale.payPlan,
						preferredAmount: sale.preferredAmount,
						amount: amount > 0 ? amount : null,
						walletId: sale.walletId,
					} satisfies SalesPaymentTokenSchema);

		payload.sales.push({
			type: sale.type,
			salesIds: sale.ids,
			customerEmail: sale.customer.email,
			customerName: sale.customer.name,
			downloadToken,
			paymentToken,
		});
	}

	return payload;
}
