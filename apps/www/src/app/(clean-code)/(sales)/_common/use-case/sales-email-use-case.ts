"use server";

import { AsyncFnType } from "@/app/(clean-code)/type";
import {
    EmailData,
    getSalesEmailDta,
    inboxDta,
    userEmailProfileDta,
} from "../data-access/sales-mail";
import { updateCustomerEmailDta } from "../data-access/customer.dta";
import {
    getSalesCustomerIdDta,
    getSalesListDataByIdDta,
} from "../data-access/sales-dta";

export type GetSalesEmail = AsyncFnType<typeof getSalesEmailUseCase>;
export type MailData = EmailData;
export async function getSalesEmailUseCase(id, type: EmailData["type"]) {
    const data = await getSalesEmailDta(id);
    const inbox = await inboxDta(type, id);
    const sendProfile = await userEmailProfileDta(type);
    const salesData = await getSalesListDataByIdDta(id);
    return {
        data,
        inbox,
        sendProfile,
        id,
        type,
        subject: "",
        composeData: salesData,
    };
}
export async function setSalesCustomerEmailUseCase(id, email) {
    const customerId = await getSalesCustomerIdDta(id);

    await updateCustomerEmailDta(customerId, email);
}
