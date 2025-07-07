"use server";

import { AsyncFnType } from "@/app/(clean-code)/type";
import {
    cancelSalesPaymentCheckoutDta,
    checkTerminalPaymentStatusDta,
    createSalesPaymentDta,
    CreateSalesPaymentProps,
    getPaymentTerminalsDta,
    getSalesPaymentDta,
} from "../data-access/wallet/sales-payment-dta";
import {
    createTerminalCheckout,
    CreateTerminalCheckoutProps,
} from "@/modules/square";
import { SalesTransaction } from "../../types";
import { createTransactionDta } from "../data-access/wallet/transaction-dta";
import { revalidatePath } from "next/cache";

export type GetSalesPayment = AsyncFnType<typeof getSalesPaymentUseCase>;
export async function getSalesPaymentUseCase(id) {
    const resp = await getSalesPaymentDta(id);
    return resp;
}
export type GetPaymentTerminals = AsyncFnType<
    typeof getPaymentTerminalsUseCase
>;
export async function getPaymentTerminalsUseCase() {
    const resp = await getPaymentTerminalsDta();
    return resp;
}
interface CreatePayment {
    salesPayment: CreateSalesPaymentProps;
    terminal?: CreateTerminalCheckoutProps;
}
export async function createTerminalPaymentUseCase(data: CreatePayment) {
    const salesPayment = await createSalesPaymentDta(data.salesPayment);
    console.log(salesPayment);

    data.terminal.idempotencyKey = salesPayment.id;
    const terminalCheckout = await createTerminalCheckout(data.terminal);
    return terminalCheckout;
}
export async function checkTerminalPaymentStatusUseCase(id) {
    const s = await checkTerminalPaymentStatusDta(id);
    return s;
}
export async function cancelSalesPaymentCheckoutUseCase(id) {
    return await cancelSalesPaymentCheckoutDta(id);
}
export async function createTransactionUseCase(data: SalesTransaction) {
    if (!data.accountNo) throw new Error("Payment Requires customer phone.");
    const c = await createTransactionDta(data);
    await revalidatePath(`/sales-books/orders`);
    return c;
}
