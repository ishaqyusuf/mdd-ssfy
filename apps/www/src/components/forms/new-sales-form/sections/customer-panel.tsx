"use client";

import { useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@gnd/ui/input";
import {
    useNewSalesFormResolveCustomerQuery,
    useNewSalesFormSearchCustomersQuery,
} from "../api";
import { useNewSalesFormStore } from "../store";
import { useEffect } from "react";

export function CustomerPanel() {
    const [query, setQuery] = useState("");
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(
        null,
    );
    const debouncedQuery = useDebounce(query, 350);
    const { data, isPending } = useNewSalesFormSearchCustomersQuery(debouncedQuery);
    const record = useNewSalesFormStore((s) => s.record);
    const setMeta = useNewSalesFormStore((s) => s.setMeta);
    const resolveCustomer = useNewSalesFormResolveCustomerQuery(
        {
            customerId: selectedCustomerId || 0,
            billingId: record?.form.billingAddressId,
            shippingId: record?.form.shippingAddressId,
        },
        !!selectedCustomerId,
    );

    useEffect(() => {
        if (!resolveCustomer.data) return;
        setMeta({
            customerId: resolveCustomer.data.customerId,
            customerProfileId: resolveCustomer.data.profileId,
            billingAddressId: resolveCustomer.data.billingId,
            shippingAddressId: resolveCustomer.data.shippingId,
            paymentTerm: resolveCustomer.data.netTerm || "None",
            taxCode: resolveCustomer.data.taxCode || null,
        });
    }, [resolveCustomer.data, setMeta]);

    return (
        <section className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Customer
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Search Customer
                    </label>
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name, phone, email..."
                        className="bg-background"
                    />
                    {debouncedQuery ? (
                        <div className="max-h-56 space-y-1 overflow-auto rounded-lg border bg-background p-2">
                            {isPending ? (
                                <p className="text-xs text-muted-foreground">Searching...</p>
                            ) : data?.length ? (
                                data.map((customer) => (
                                    <button
                                        key={customer.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedCustomerId(customer.id);
                                            setSelectedCustomerName(
                                                customer.name || customer.businessName || null,
                                            );
                                        }}
                                        className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                                    >
                                        <span className="font-medium">
                                            {customer.name || customer.businessName}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            #{customer.id}
                                        </span>
                                    </button>
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground">No customers found.</p>
                            )}
                        </div>
                    ) : null}
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Current Selection
                    </label>
                    <div className="rounded-lg border bg-background p-3 text-sm">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Selected Customer
                        </p>
                        <p className="font-semibold">
                            {selectedCustomerName ||
                                record?.customer?.name ||
                                record?.customer?.businessName ||
                                "Not selected"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Customer ID:{" "}
                            <span className="font-medium">
                                {record?.form.customerId ?? "Not selected"}
                            </span>
                        </p>

                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Billing Address ID
                                </label>
                                <Input
                                    type="number"
                                    value={record?.form.billingAddressId ?? ""}
                                    onChange={(e) =>
                                        setMeta({
                                            billingAddressId: e.target.value
                                                ? Number(e.target.value)
                                                : null,
                                        })
                                    }
                                    placeholder="Billing ID"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Shipping Address ID
                                </label>
                                <Input
                                    type="number"
                                    value={record?.form.shippingAddressId ?? ""}
                                    onChange={(e) =>
                                        setMeta({
                                            shippingAddressId: e.target.value
                                                ? Number(e.target.value)
                                                : null,
                                        })
                                    }
                                    placeholder="Shipping ID"
                                />
                            </div>
                        </div>
                        <p className="mt-3 rounded-md border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
                            Billing: {record?.form.billingAddressId ?? "N/A"} | Shipping:{" "}
                            {record?.form.shippingAddressId ?? "N/A"}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
