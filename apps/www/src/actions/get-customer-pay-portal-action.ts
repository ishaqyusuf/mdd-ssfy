"use server";
import { sum } from "@/lib/utils";
import { getCustomerPendingSales } from "./get-customer-pending-sales";
import { getSquareDevices } from "@/modules/square";
import { cookies } from "next/headers";
import { Cookies } from "@/utils/constants";
import {
    getCustomerWalletDta,
    getWalletBalance,
} from "@/app/(clean-code)/(sales)/_common/data-access/wallet/wallet-dta";

export async function getCustomerPayPortalAction(accountNo) {
    const pendingSales = await getCustomerPendingSales(accountNo);
    const wallet = await getCustomerWalletDta(accountNo);
    const walletBalance = await getWalletBalance(wallet?.id!);
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
        wallet,
        walletBalance,
    };
}
