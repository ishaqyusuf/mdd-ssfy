import { getAppUrl } from "@gnd/utils/envs";
import {
	type SalesPaymentTokenSchema,
	tryTokenize,
} from "@gnd/utils/tokenizer";
import { getCustomerWallet } from "@sales/wallet";
import { addDays } from "date-fns";
import type { NotificationHandler } from "../base";
import {
	type CustomerStatementInput,
	type CustomerStatementTags,
	customerStatementSchema,
} from "../schemas";

export const customerStatement: NotificationHandler = {
	schema: customerStatementSchema,
	async extendData(db, data: CustomerStatementInput) {
		if (data.paymentLink || !data.lines.length) return data;

		const accountNo =
			data.accountNo || (data.customerId ? `cust-${data.customerId}` : null);
		if (!accountNo) return data;

		const wallet = await getCustomerWallet(db, accountNo);
		if (!wallet?.id) return data;

		const paymentToken = tryTokenize({
			salesIds: data.lines.map((line) => line.salesId),
			expiry: addDays(new Date(), 7).toISOString(),
			payPlan: "full",
			walletId: wallet.id,
			amount: null,
		} satisfies SalesPaymentTokenSchema);

		return {
			...data,
			paymentLink:
				paymentToken && getAppUrl()
					? `${getAppUrl()}/checkout/${paymentToken}/v2`
					: null,
		};
	},
	createActivityWithoutContact: true,
	createActivity(data: CustomerStatementInput, author) {
		const payload: CustomerStatementTags = {
			type: "customer_statement",
			source: "system",
			priority: 5,
			customerEmail: data.customerEmail,
			customerName: data.customerName,
			customerId: data.customerId,
			accountNo: data.accountNo,
			orderNos: data.lines.map((line) => line.orderNo),
			statementTotal: data.statementTotal,
		};

		return {
			type: "customer_statement",
			source: "system",
			subject: "Customer statement sent",
			headline: `Statement sent to ${data.customerName} for ${data.lines.length} open order${data.lines.length > 1 ? "s" : ""}.`,
			note: `$${data.statementTotal.toFixed(2)} due`,
			authorId: author.id,
			tags: payload,
		};
	},
	createDirectEmailContact(data: CustomerStatementInput): import("../base").UserData {
		return {
			id: data.customerId || 0,
			profileId: 0,
			name: data.customerName,
			email: data.customerEmail,
			role: "customer",
			emailNotification: true,
			inAppNotification: false,
			whatsAppNotification: false,
		};
	},
	createEmail(data, _author, _user, args) {
		return {
			...args,
			template: "customer-statement",
			to: [data.customerEmail],
			subject: `Statement for ${data.customerName} - $${data.statementTotal.toFixed(2)} due`,
			data,
		};
	},
};
