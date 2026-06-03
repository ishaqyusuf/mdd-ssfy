import type { NotificationHandler } from "../base";
import {
  type CustomerStatementInput,
  type CustomerStatementTags,
  customerStatementSchema,
} from "../schemas";

export const customerStatement: NotificationHandler = {
  schema: customerStatementSchema,
  createActivityWithoutContact: true,
  createActivity(data: CustomerStatementInput, author) {
    const payload: CustomerStatementTags = {
      type: "customer_statement",
      source: "system",
      priority: 5,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
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
