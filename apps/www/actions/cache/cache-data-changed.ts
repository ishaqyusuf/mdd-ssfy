import { Tags } from "@/utils/constants";
import { revalidateTag } from "next/cache";

export function __salesOrderIdUpdate() {
    revalidateTag(Tags.salesOrderNos);
}
export function __salesPayrollUpdated({ orderId = null, userId = null }) {
    revalidateTag(`sales_rep_total_sales`);
    revalidateTag(`sales_rep_active_customers`);
    revalidateTag(`sales_rep_commission_summary`);
    revalidateTag(`sales_rep_commission_summary_${userId}`);
    revalidateTag(`sales_rep_total_sales_${userId}`);
    revalidateTag(`sales_rep_commission_summary`);
    revalidateTag(`sales_rep_total_sales`);
    // revalidateTag(`sales_rep_active_customers`);
    revalidateTag(`sales-payment-count`);
}

export function __salesPaymentUpdated() {
    revalidateTag(`sales-payment-count`);
}
