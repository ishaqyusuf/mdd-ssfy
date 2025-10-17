import { Tags } from "@/utils/constants";
import { revalidateTag } from "next/cache";
import { __gtCustomerSalesTx } from "./get-tags";

export function __rtSalesCreated(id, customerId, phone) {
    const accountNo = phone || `cust-${customerId}`;
    const salesTags = __gtCustomerSalesTx(accountNo);
    salesTags.map((a) => revalidateTag(a));
}
