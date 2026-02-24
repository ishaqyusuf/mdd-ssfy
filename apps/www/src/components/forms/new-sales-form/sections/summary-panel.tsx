"use client";

import { Input } from "@gnd/ui/input";
import { Button } from "@gnd/ui/button";
import { Textarea } from "@gnd/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import { useNewSalesFormStore } from "../store";

function currency(value?: number | null) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(Number(value || 0));
}

const PAYMENT_TERMS = [
    "None",
    "Due on Receipt",
    "Net 7",
    "Net 15",
    "Net 30",
    "Net 60",
] as const;

const DELIVERY_OPTIONS = [
    { value: "pickup", label: "Pickup" },
    { value: "delivery", label: "Delivery" },
    { value: "ship", label: "Ship" },
];

export function SummaryPanel() {
    const record = useNewSalesFormStore((s) => s.record);
    const setTaxRate = useNewSalesFormStore((s) => s.setTaxRate);
    const setMeta = useNewSalesFormStore((s) => s.setMeta);
    const upsertExtraCost = useNewSalesFormStore((s) => s.upsertExtraCost);
    const removeExtraCost = useNewSalesFormStore((s) => s.removeExtraCost);

    if (!record) return null;
    return (
        <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Summary
            </h3>
            <div className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-2">
                <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        P.O.
                    </label>
                    <Input
                        value={record.form.po || ""}
                        onChange={(e) => setMeta({ po: e.target.value })}
                        placeholder="PO number"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Delivery Option
                    </label>
                    <Select
                        value={record.form.deliveryOption || "pickup"}
                        onValueChange={(value) => setMeta({ deliveryOption: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select delivery option" />
                        </SelectTrigger>
                        <SelectContent>
                            {DELIVERY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Payment Term
                    </label>
                    <Select
                        value={record.form.paymentTerm || "None"}
                        onValueChange={(value) => setMeta({ paymentTerm: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select payment term" />
                        </SelectTrigger>
                        <SelectContent>
                            {PAYMENT_TERMS.map((term) => (
                                <SelectItem key={term} value={term}>
                                    {term}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {record.type === "quote" ? (
                    <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Good Until
                        </label>
                        <Input
                            type="date"
                            value={record.form.goodUntil?.slice(0, 10) || ""}
                            onChange={(e) =>
                                setMeta({
                                    goodUntil: e.target.value
                                        ? new Date(e.target.value).toISOString()
                                        : null,
                                })
                            }
                        />
                    </div>
                ) : null}
                <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Tax Rate (%)
                    </label>
                    <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={record.summary.taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value || 0))}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Tax Code
                    </label>
                    <Input
                        value={record.form.taxCode || ""}
                        onChange={(e) => setMeta({ taxCode: e.target.value || null })}
                        placeholder="Tax code"
                    />
                </div>
            </div>
            <div className="space-y-2 rounded-lg border bg-background p-3">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Notes
                </label>
                <Textarea
                    value={record.form.notes || ""}
                    onChange={(e) => setMeta({ notes: e.target.value })}
                    placeholder="Internal notes"
                    rows={4}
                />
            </div>
            <div className="space-y-2 rounded-lg border bg-background p-3">
                <div className="flex items-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Extra Costs
                    </p>
                    <Button
                        size="sm"
                        variant="outline"
                        className="ml-auto"
                        onClick={() =>
                            upsertExtraCost({
                                label: "Custom",
                                type: "CustomNonTaxxable",
                                amount: 0,
                            })
                        }
                    >
                        Add Cost
                    </Button>
                </div>
                {(record.extraCosts || []).map((cost, index) => (
                    <div key={`${cost.type}-${index}`} className="grid gap-2 md:grid-cols-12">
                        <Input
                            className="md:col-span-5"
                            value={cost.label}
                            onChange={(e) =>
                                upsertExtraCost(
                                    {
                                        ...cost,
                                        label: e.target.value,
                                    },
                                    index,
                                )
                            }
                        />
                        <Input
                            className="md:col-span-4"
                            value={cost.type}
                            onChange={(e) =>
                                upsertExtraCost(
                                    {
                                        ...cost,
                                        type: e.target.value as any,
                                    },
                                    index,
                                )
                            }
                        />
                        <Input
                            className="md:col-span-2"
                            type="number"
                            step="0.01"
                            value={cost.amount}
                            onChange={(e) =>
                                upsertExtraCost(
                                    {
                                        ...cost,
                                        amount: Number(e.target.value || 0),
                                    },
                                    index,
                                )
                            }
                        />
                        <Button
                            className="md:col-span-1"
                            variant="destructive"
                            disabled={cost.type === "Labor"}
                            onClick={() => removeExtraCost(index)}
                        >
                            X
                        </Button>
                    </div>
                ))}
            </div>
            <div className="space-y-1 rounded-lg border bg-background p-3 text-sm">
                <p className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sub Total</span>
                    <span className="font-semibold">{currency(record.summary.subTotal)}</span>
                </p>
                <p className="flex items-center justify-between">
                    <span className="text-muted-foreground">Adjusted Subtotal</span>
                    <span className="font-semibold">
                        {currency((record.summary as any).adjustedSubTotal)}
                    </span>
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
        </section>
    );
}
