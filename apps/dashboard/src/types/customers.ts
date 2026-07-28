import { AddressBooks, Customers, CustomerTypes, CustomerWallet } from "@/db";

import { ISalesOrder, ISalesPayment } from "./sales";
import { OmitMeta } from "./type";

export interface ICustomer extends OmitMeta<Customers> {
    profile: CustomerTypes;
    salesOrders: ISalesOrder[];
    payments: ISalesPayment[];
    primaryAddress: AddressBooks;
    addressBooks: AddressBooks[];
    wallet: CustomerWallet;
    meta: {};
    _count: {
        salesOrders;
        totalDoors;
        pendingDoors;
        totalSales;
        amountDue;
        pendingOrders;
        completedOrders;
        completedDoors;
    };
}
