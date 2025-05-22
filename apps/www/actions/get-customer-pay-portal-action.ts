"use server";
import { sum } from "@/lib/utils";
import { getCustomerPendingSales } from "./get-customer-pending-sales";
import { getSquareDevices } from "@/modules/square";
import { cookies } from "next/headers";
import { Cookies } from "@/utils/constants";

export async function getCustomerPayPortalAction(accountNo) {
    const pendingSales = await getCustomerPendingSales(accountNo);
    const totalPayable = sum(pendingSales, "amountDue");
    const terminals = await getSquareDevices();
    const lastUsedTerminalId = (await cookies()).get(
        Cookies.LastSquareTerminalUsed,
    )?.value;
    return {
        pendingSales,
        totalPayable,
        terminals,
        lastUsedTerminalId,
    };
}
