"use server";

export interface RefundOnSalesProps {
    salesId: number;
    refundAmount: Number;
}
export async function refundOnSalesAction(props: RefundOnSalesProps) {}
