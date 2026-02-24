"use client";

import { useNewSalesFormStore } from "../store";

function currency(value?: number | null) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(Number(value || 0));
}

export function InvoiceOverviewPanel() {
    const record = useNewSalesFormStore((s) => s.record);
    if (!record) return null;

    return (
        <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Invoice Overview
            </h3>
            <div className="rounded-lg border bg-background p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Customer</p>
                <p className="font-semibold">
                    {record.customer?.name ||
                        record.customer?.businessName ||
                        `#${record.form.customerId || "N/A"}`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Billing: {record.form.billingAddressId ?? "N/A"} | Shipping:{" "}
                    {record.form.shippingAddressId ?? "N/A"}
                </p>
            </div>

            <div className="space-y-2 rounded-lg border bg-background p-3 text-sm">
                <p className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sub Total</span>
                    <span className="font-semibold">{currency(record.summary.subTotal)}</span>
                </p>
                <p className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-semibold">{currency(record.summary.taxTotal)}</span>
                </p>
                <p className="flex items-center justify-between border-t pt-2">
                    <span className="font-medium">Grand Total</span>
                    <span className="text-base font-bold">
                        {currency(record.summary.grandTotal)}
                    </span>
                </p>
            </div>

            <div className="grid gap-2 rounded-lg border bg-background p-3 text-xs text-muted-foreground">
                <p>
                    Payment Term: <span className="font-medium">{record.form.paymentTerm || "None"}</span>
                </p>
                <p>
                    Delivery: <span className="font-medium">{record.form.deliveryOption || "pickup"}</span>
                </p>
                {record.type === "quote" ? (
                    <p>
                        Good Until:{" "}
                        <span className="font-medium">
                            {record.form.goodUntil?.slice(0, 10) || "N/A"}
                        </span>
                    </p>
                ) : null}
                <p>
                    Line Items: <span className="font-medium">{record.lineItems.length}</span>
                </p>
            </div>
        </section>
    );
}
