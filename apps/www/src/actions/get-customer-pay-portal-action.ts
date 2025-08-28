"use server";
import { sum } from "@/lib/utils";
import { getCustomerPendingSales } from "./get-customer-pending-sales";
import { fetchDevicesByLocations, getSquareDevices } from "@/modules/square";
import { cookies } from "next/headers";
import { Cookies } from "@/utils/constants";
import { getCustomerWallet } from "@sales/wallet";
import { prisma } from "@/db";

export async function getCustomerPayPortalAction(accountNo) {
    const pendingSales = await getCustomerPendingSales(accountNo);
    const wallet = await getCustomerWallet(prisma, accountNo);
    const totalPayable = sum(pendingSales, "amountDue");
    const terminals = await getSquareDevices();
    const byLocations = await fetchDevicesByLocations();
    const lastUsedTerminalId = (await cookies()).get(
        Cookies.LastSquareTerminalUsed,
    )?.value;
    return {
        pendingSales,
        totalPayable,
        terminals,
        lastUsedTerminalId,
        wallet,
        walletBalance: wallet.balance,
        byLocations,
    };
}
