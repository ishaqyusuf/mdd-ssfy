"use server";

import { db } from "@gnd/db";
import { getCustomerWallet } from "@sales/wallet";

export async function getCustomerWalletId(accountNo) {
    return (await getCustomerWallet(db, accountNo))?.id;
}
