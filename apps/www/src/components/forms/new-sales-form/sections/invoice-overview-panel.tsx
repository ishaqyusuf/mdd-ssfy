"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { endFlow, logStage, startFlow } from "@/lib/dev-flow-logger";
import { Input } from "@gnd/ui/input";
import { Button } from "@gnd/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import {
    Building2,
    Check,
    ChevronDown,
    ChevronUp,
    CreditCard,
    Info,
    Plus,
    Phone,
    Search,
    Truck,
    X,
} from "lucide-react";
import {
    useCustomerProfilesQuery,
    useCustomerTaxProfilesQuery,
    useNewSalesFormResolveCustomerQuery,
    useNewSalesFormSearchCustomersQuery,
} from "../api";
import { useNewSalesFormStore } from "../store";
import { computeSummary, repriceLineItemsByProfile } from "../mappers";

function currency(value?: number | null) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(Number(value || 0));
}

const PAYMENT_TERMS = ["None", "Due on Receipt", "Net 7", "Net 15", "Net 30", "Net 60"];
const DELIVERY_OPTIONS = ["pickup", "delivery", "ship"];
const PAYMENT_METHODS = ["None", "Cash", "Check", "Credit Card", "ACH", "Link"];

function normalizeProfileTitle(value?: string | null) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

function getDefaultCustomerProfile(profiles: any[]) {
    if (!Array.isArray(profiles) || !profiles.length) return null;
    return (
        profiles.find(
            (profile: any) =>
                normalizeProfileTitle(profile?.title) === "tier 1",
        ) ||
        profiles.find((profile: any) => {
            const meta = profile?.meta || {};
            return Boolean(
                meta?.isDefault ||
                    meta?.default ||
                    meta?.selected ||
                    meta?.is_default,
            );
        }) ||
        profiles[0] ||
        null
    );
}

export function InvoiceOverviewPanel() {
    const record = useNewSalesFormStore((s) => s.record);
    const setMeta = useNewSalesFormStore((s) => s.setMeta);
    const setTaxRate = useNewSalesFormStore((s) => s.setTaxRate);
    const setLineItems = useNewSalesFormStore((s) => s.setLineItems);
    const setSummary = useNewSalesFormStore((s) => s.setSummary);
    const patchRecord = useNewSalesFormStore((s) => s.patchRecord);
    const upsertExtraCost = useNewSalesFormStore((s) => s.upsertExtraCost);
    const lastProfileCoefficientRef = useRef<number | null | undefined>(undefined);
    const lastProfileIdRef = useRef<number | null | undefined>(undefined);

    const [isCustomerSearchActive, setIsCustomerSearchActive] = useState(false);
    const [customerSearchQuery, setCustomerSearchQuery] = useState("");
    const [isCustomerExpanded, setIsCustomerExpanded] = useState(false);
    const debounced = useDebounce(customerSearchQuery, 250);
    const customerSearch = useNewSalesFormSearchCustomersQuery(debounced);
    const customerProfiles = useCustomerProfilesQuery(true);
    const customerTaxProfiles = useCustomerTaxProfilesQuery(true);
    const resolvedCustomer = useNewSalesFormResolveCustomerQuery(
        {
            customerId: Number(record?.form.customerId || 0),
            billingId: record?.form.billingAddressId || undefined,
            shippingId: record?.form.shippingAddressId || undefined,
        },
        !!record?.form.customerId,
    );

    useEffect(() => {
        const data = resolvedCustomer.data as any;
        if (!record || !data || !record.form.customerId) return;
        const nextMeta = {
            customerId: Number(data.customerId || record.form.customerId || 0) || null,
            customerProfileId: data.profileId ?? record.form.customerProfileId ?? null,
            billingAddressId: data.billing?.id ?? data.billingId ?? null,
            shippingAddressId: data.shipping?.id ?? data.shippingId ?? null,
            paymentTerm: (data.netTerm as string) || "None",
            taxCode: (data.taxCode as string) || null,
        };
        const changed =
            nextMeta.customerId !== (record.form.customerId ?? null) ||
            nextMeta.customerProfileId !== (record.form.customerProfileId ?? null) ||
            nextMeta.billingAddressId !== (record.form.billingAddressId ?? null) ||
            nextMeta.shippingAddressId !== (record.form.shippingAddressId ?? null) ||
            nextMeta.paymentTerm !== (record.form.paymentTerm ?? "None") ||
            nextMeta.taxCode !== (record.form.taxCode ?? null);
        if (changed) setMeta(nextMeta);
    }, [
        record?.form.billingAddressId,
        record?.form.customerId,
        record?.form.customerProfileId,
        record?.form.paymentTerm,
        record?.form.shippingAddressId,
        record?.form.taxCode,
        resolvedCustomer.data,
        setMeta,
    ]);

    if (!record) return null;

    const customerMeta = (record.customer as any)?.meta || {};
    const creditLimit = Number(
        customerMeta.creditLimit ?? customerMeta.limit ?? customerMeta.credit_limit ?? 0,
    );

    const laborIndex = (record.extraCosts || []).findIndex((cost) => cost.type === "Labor");
    const laborCost = laborIndex >= 0 ? Number(record.extraCosts[laborIndex]?.amount || 0) : 0;
    const addOnTotal = (record.extraCosts || [])
        .filter((cost) => !["Labor", "Discount", "DiscountPercentage"].includes(cost.type))
        .reduce((sum, cost) => sum + Number(cost.amount || 0), 0);
    const cccPercentage = Number((record as any).settings?.cccPercentage ?? 3.5);
    const showCcc = String(record.form.paymentMethod || "").trim().toLowerCase() === "credit card";
    const liveSummary = useMemo(
        () =>
            computeSummary(
                record.lineItems || [],
                Number(record.summary?.taxRate || 0),
                record.extraCosts || [],
                record.form.paymentMethod || null,
                cccPercentage,
            ),
        [
            cccPercentage,
            record.extraCosts,
            record.form.paymentMethod,
            record.lineItems,
            record.summary?.taxRate,
        ],
    );

    useEffect(() => {
        if (!record) return;
        const flow = startFlow({
            feature: "new-sales-form/invoice-summary",
            threadContext: "summary-render",
            tags: ["debug", "dev-only", "shelf", "summary"],
            inputs: {
                lineCount: record.lineItems?.length || 0,
            },
        });
        logStage(flow, {
            stage: "derive",
            eventType: "response.received",
            outputs: {
                summary: liveSummary,
                shelfLines: (record.lineItems || [])
                    .filter((line: any) => Array.isArray(line?.shelfItems) && line.shelfItems.length)
                    .map((line: any) => ({
                        uid: line.uid,
                        qty: line.qty,
                        unitPrice: line.unitPrice,
                        lineTotal: line.lineTotal,
                        shelfItems: (line.shelfItems || []).map((row: any) => ({
                            productId: row?.productId,
                            qty: row?.qty,
                            unitPrice: row?.unitPrice,
                            totalPrice: row?.totalPrice,
                        })),
                    })),
            },
        });
        endFlow(flow, {
            subTotal: liveSummary?.subTotal,
            taxTotal: liveSummary?.taxTotal,
            grandTotal: liveSummary?.grandTotal,
        });
    }, [liveSummary, record]);

    useEffect(() => {
        if (!record) return;
        const hasDrift =
            Number(record.summary?.subTotal || 0) !== Number(liveSummary.subTotal || 0) ||
            Number(record.summary?.adjustedSubTotal || 0) !==
                Number(liveSummary.adjustedSubTotal || 0) ||
            Number(record.summary?.taxTotal || 0) !== Number(liveSummary.taxTotal || 0) ||
            Number(record.summary?.grandTotal || 0) !== Number(liveSummary.grandTotal || 0) ||
            Number(record.summary?.ccc || 0) !== Number(liveSummary.ccc || 0);
        if (!hasDrift) return;
        setSummary({
            ...record.summary,
            ...liveSummary,
        });
    }, [liveSummary, record, setSummary]);

    const creditUsed = Number(liveSummary.grandTotal || 0);
    const usagePct = creditLimit > 0 ? Math.min(100, Math.max(0, (creditUsed / creditLimit) * 100)) : 0;

    const customerInitial = useMemo(() => {
        const base = record.customer?.name || record.customer?.businessName || "Customer";
        return base
            .split(" ")
            .slice(0, 2)
            .map((part) => part[0] || "")
            .join("")
            .toUpperCase();
    }, [record.customer?.name, record.customer?.businessName]);
    const profileOptions = customerProfiles.data || [];
    const taxOptions = (customerTaxProfiles.data || []).map((tax: any) => ({
        taxCode: String(tax?.taxCode || ""),
        title: String(tax?.title || tax?.taxCode || "Tax"),
        percentage: Number(
            tax?.percentage ?? tax?.tax ?? tax?.rate ?? 0,
        ),
    }));

    function resolveTaxRateByCode(taxCode?: string | null) {
        if (!taxCode) return 0;
        const match = taxOptions.find((tax) => tax.taxCode === taxCode);
        return Number(match?.percentage || 0);
    }

    useEffect(() => {
        if (!record) return;
        const currentProfile = profileOptions.find(
            (profile: any) => Number(profile?.id) === Number(record.form.customerProfileId || 0),
        ) as any;
        const currentCoefficient = Number(currentProfile?.coefficient);
        const normalizedCurrent = Number.isFinite(currentCoefficient)
            ? currentCoefficient
            : null;
        const currentProfileId = record.form.customerProfileId
            ? Number(record.form.customerProfileId)
            : null;
        if (lastProfileCoefficientRef.current === undefined) {
            lastProfileCoefficientRef.current = normalizedCurrent;
            lastProfileIdRef.current = currentProfileId;
            return;
        }
        const profileChanged = lastProfileIdRef.current !== currentProfileId;
        if (
            lastProfileCoefficientRef.current === normalizedCurrent &&
            !profileChanged
        ) {
            return;
        }
        setLineItems(
            repriceLineItemsByProfile(
                record.lineItems || [],
                lastProfileCoefficientRef.current ?? null,
                normalizedCurrent,
            ),
        );
        lastProfileCoefficientRef.current = normalizedCurrent;
        lastProfileIdRef.current = currentProfileId;
    }, [profileOptions, record, setLineItems]);

    useEffect(() => {
        if (!record) return;
        if (record.form.customerProfileId != null) return;
        const defaultProfile = getDefaultCustomerProfile(profileOptions);
        if (!defaultProfile?.id) return;
        const profileMeta = defaultProfile?.meta || {};
        setMeta({
            customerProfileId: Number(defaultProfile.id),
            paymentTerm:
                profileMeta?.netTerm ||
                profileMeta?.net ||
                record.form.paymentTerm ||
                "None",
        });
    }, [profileOptions, record, setMeta]);

    useEffect(() => {
        if (!record) return;
        const nextRate = resolveTaxRateByCode(record.form.taxCode);
        if (Number(record.summary?.taxRate || 0) !== Number(nextRate || 0)) {
            setTaxRate(nextRate);
        }
    }, [record, setTaxRate, customerTaxProfiles.data]);

    function applyCustomerProfile(value: string) {
        if (value === "none") {
            setMeta({ customerProfileId: null });
            return;
        }
        const selectedId = Number(value);
        const profile = profileOptions.find(
            (p: any) => Number(p.id) === selectedId,
        ) as any;
        const profileMeta = profile?.meta || {};
        setMeta({
            customerProfileId: selectedId,
            paymentTerm:
                profileMeta?.netTerm ||
                profileMeta?.net ||
                record.form.paymentTerm ||
                "None",
        });
    }

    return (
        <section className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                        Customer Profile
                    </h3>
                    {isCustomerSearchActive ? (
                        <button
                            onClick={() => setIsCustomerSearchActive(false)}
                            className="text-xs font-bold text-primary hover:underline"
                        >
                            Cancel
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setIsCustomerSearchActive(true);
                                setCustomerSearchQuery("");
                            }}
                            className="text-xs font-bold text-primary hover:underline"
                        >
                            Change
                        </button>
                    )}
                </div>

                {isCustomerSearchActive ? (
                    <div className="relative z-20">
                        <div className="flex w-full items-center overflow-hidden rounded-xl border border-primary bg-card ring-2 ring-primary/20">
                            <input
                                autoFocus
                                className="h-12 w-full flex-1 border-none bg-transparent pl-4 pr-10 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                                placeholder="Search customer name, phone, or profile"
                                type="text"
                                value={customerSearchQuery}
                                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                            />
                            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center text-muted-foreground">
                                {customerSearchQuery ? (
                                    <button
                                        onClick={() => setCustomerSearchQuery("")}
                                        className="hover:text-foreground"
                                    >
                                        <X size={16} />
                                    </button>
                                ) : (
                                    <Search size={16} />
                                )}
                            </div>
                        </div>

                        <div className="mt-2 flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                            <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    {(customerSearch.data || []).length} Results found
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground">Esc to close</span>
                            </div>
                            <div className="flex max-h-[280px] flex-col overflow-y-auto">
                                {(customerSearch.data || []).map((customer) => (
                                    <button
                                        key={customer.id}
                                        onClick={() => {
                                            setMeta({
                                                customerId: customer.id,
                                                customerProfileId:
                                                    customer.profileId ?? null,
                                                billingAddressId:
                                                    customer.billingAddressId ??
                                                    null,
                                                shippingAddressId:
                                                    customer.shippingAddressId ??
                                                    null,
                                                taxCode:
                                                    customer.taxCode || null,
                                            });
                                            patchRecord({
                                                customer: {
                                                    id: customer.id,
                                                    name: customer.name,
                                                    businessName: customer.businessName,
                                                    phoneNo: customer.phoneNo,
                                                    email: customer.email,
                                                },
                                            });
                                            setIsCustomerSearchActive(false);
                                        }}
                                        className="group flex items-center gap-3 border-l-4 border-transparent p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/50"
                                    >
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-blue-100 text-xs font-black text-primary">
                                            {(customer.name || customer.businessName || "C").slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-sm font-semibold text-foreground">
                                                    {customer.name || customer.businessName}
                                                </p>
                                                {customer.isBusiness ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                                        <Building2 size={12} />
                                                        Business
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                {customer.phoneNo ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Phone size={12} />
                                                        {customer.phoneNo}
                                                    </span>
                                                ) : null}
                                                {customer.profileName ? (
                                                    <span className="font-medium text-foreground/80">
                                                        Tier: {customer.profileName}
                                                    </span>
                                                ) : null}
                                                {customer.taxName ? (
                                                    <span>{customer.taxName}</span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="border-t border-border bg-muted/50 p-2">
                                <button className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground">
                                    <Plus size={16} />
                                    <span className="truncate">Create New Customer</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                        onClick={() => setIsCustomerExpanded((prev) => !prev)}
                    >
                        <div className="flex items-start gap-4 p-4">
                            <div className="relative shrink-0">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-blue-100 text-sm font-black text-primary">
                                    {customerInitial}
                                </div>
                                <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-card bg-green-500 p-0.5">
                                    <Check size={10} className="text-white" strokeWidth={4} />
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between">
                                    <p className="truncate text-base font-bold leading-tight text-foreground">
                                        {record.customer?.name ||
                                            record.customer?.businessName ||
                                            "Not selected"}
                                    </p>
                                    {isCustomerExpanded ? (
                                        <ChevronUp size={16} className="text-muted-foreground" />
                                    ) : (
                                        <ChevronDown size={16} className="text-muted-foreground" />
                                    )}
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Account #: {record.form.customerId || "N/A"}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <span className="inline-flex items-center rounded-md border bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                                        CUSTOMER
                                    </span>
                                </div>
                                <div
                                    className="mt-3 max-w-[260px]"
                                    onClick={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                >
                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Customer Profile
                                    </label>
                                    <Select
                                        value={
                                            record.form.customerProfileId
                                                ? String(record.form.customerProfileId)
                                                : "none"
                                        }
                                        onValueChange={applyCustomerProfile}
                                    >
                                        <SelectTrigger className="h-8 rounded-lg bg-card text-xs font-bold">
                                            <SelectValue placeholder="Select Profile" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {profileOptions.map((profile) => (
                                                <SelectItem
                                                    key={profile.id}
                                                    value={String(profile.id)}
                                                >
                                                    {profile.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        {isCustomerExpanded ? (
                            <div className="px-4 pb-4">
                                <div className="mb-3 h-px w-full bg-border" />
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            <CreditCard size={12} /> Billing Address
                                        </span>
                                        <p className="border-l-2 border-border pl-4 text-sm font-medium text-foreground">
                                            Billing Address ID: {record.form.billingAddressId ?? "N/A"}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            <Truck size={12} /> Shipping Address
                                        </span>
                                        <p className="border-l-2 border-border pl-4 text-sm font-medium text-foreground">
                                            Shipping Address ID: {record.form.shippingAddressId ?? "N/A"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-foreground">
                    <Info size={18} className="text-primary" />
                    <h3 className="text-sm font-bold">Global Invoice Details</h3>
                </div>
                <div className="grid gap-4 rounded-xl border border-border bg-muted/30 p-4 shadow-sm">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                P.O. Number
                            </label>
                            <Input
                                value={record.form.po || ""}
                                onChange={(e) => setMeta({ po: e.target.value })}
                                className="h-9 rounded-lg bg-card text-xs font-bold"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Net Terms
                            </label>
                            <Select
                                value={record.form.paymentTerm || "None"}
                                onValueChange={(value) => setMeta({ paymentTerm: value })}
                            >
                                <SelectTrigger className="h-9 rounded-lg bg-card text-xs font-bold">
                                    <SelectValue />
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
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Due Date
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
                                className="h-9 rounded-lg bg-card text-xs font-bold"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Production Due Date
                            </label>
                            <Input
                                type="date"
                                value={record.form.prodDueDate?.slice(0, 10) || ""}
                                onChange={(e) =>
                                    setMeta({
                                        prodDueDate: e.target.value
                                            ? new Date(e.target.value).toISOString()
                                            : null,
                                    })
                                }
                                className="h-9 rounded-lg bg-card text-xs font-bold"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Payment Method
                            </label>
                            <Select
                                value={record.form.paymentMethod || "None"}
                                onValueChange={(value) =>
                                    setMeta({
                                        paymentMethod: value === "None" ? null : value,
                                    })
                                }
                            >
                                <SelectTrigger className="h-9 rounded-lg bg-card text-xs font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_METHODS.map((mode) => (
                                        <SelectItem key={mode} value={mode}>
                                            {mode}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Delivery Mode
                            </label>
                            <Select
                                value={record.form.deliveryOption || "pickup"}
                                onValueChange={(value) => setMeta({ deliveryOption: value })}
                            >
                                <SelectTrigger className="h-9 rounded-lg bg-card text-xs font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DELIVERY_OPTIONS.map((mode) => (
                                        <SelectItem key={mode} value={mode}>
                                            {mode}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-foreground">
                    <CreditCard size={18} className="text-primary" />
                    <h3 className="text-sm font-bold text-primary">Totals & Pricing (Entire Invoice)</h3>
                </div>
                <div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Subtotal (All Items)</span>
                        <span className="text-sm font-bold text-foreground">{currency(liveSummary.subTotal)}</span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-medium text-muted-foreground">Tax Group</span>
                        <div className="max-w-[190px] flex-1">
                            <Select
                                value={record.form.taxCode || "none"}
                                onValueChange={(value) => {
                                    const nextTaxCode = value === "none" ? null : value;
                                    setMeta({ taxCode: nextTaxCode });
                                    setTaxRate(resolveTaxRateByCode(nextTaxCode));
                                }}
                            >
                                <SelectTrigger className="h-9 rounded-lg bg-muted text-xs font-bold">
                                    <SelectValue placeholder="Select Tax Group" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Tax Exempt</SelectItem>
                                    {taxOptions.map((tax) => (
                                        <SelectItem key={tax.taxCode} value={tax.taxCode}>
                                            {tax.title}
                                            {Number(tax.percentage || 0) > 0
                                                ? ` (${tax.percentage}%)`
                                                : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Tax Amount</span>
                        <span className="text-sm font-bold text-foreground">
                            {currency(liveSummary.taxTotal)}
                        </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-muted-foreground">Total Labor Cost</span>
                            <span className="text-[10px] text-muted-foreground">Global calculation</span>
                        </div>
                        <div className="relative w-[120px]">
                            <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">$</span>
                            <Input
                                className="h-9 rounded-lg bg-muted pl-6 pr-3 text-right text-xs font-bold"
                                type="number"
                                step="0.01"
                                value={laborCost}
                                onChange={(e) => {
                                    const amount = Number(e.target.value || 0);
                                    if (laborIndex >= 0)
                                        upsertExtraCost({ ...record.extraCosts[laborIndex], amount }, laborIndex);
                                    else
                                        upsertExtraCost({ label: "Labor", type: "Labor", amount, taxxable: false });
                                }}
                            />
                        </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-dashed border-border pt-1">
                        <button
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
                            onClick={() =>
                                upsertExtraCost({
                                    label: "Custom Add-on",
                                    type: "CustomNonTaxxable",
                                    amount: 0,
                                    taxxable: false,
                                })
                            }
                        >
                            <Plus size={14} />
                            Global Add-on Cost
                        </button>
                        <span className="text-xs font-bold text-muted-foreground">+{currency(addOnTotal)}</span>
                    </div>

                    {showCcc ? (
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-muted-foreground">
                                    CCC ({cccPercentage}%)
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    Credit card processing surcharge
                                </span>
                            </div>
                            <span className="text-sm font-bold text-foreground">
                                {currency(liveSummary.ccc)}
                            </span>
                        </div>
                    ) : null}

                    <div className="mt-2 flex items-center justify-between rounded-lg border border-primary/10 bg-primary/5 p-4">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase tracking-tighter text-primary">
                                Grand Total Due
                            </span>
                            <span className="text-[10px] text-primary/60">Includes all taxes & labor</span>
                        </div>
                        <span className="text-2xl font-black text-primary">
                            {currency(liveSummary.grandTotal)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-transparent bg-muted p-4">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-bold uppercase tracking-widest">Customer Credit Limit</span>
                    <span className="font-mono font-bold text-foreground">
                        {creditLimit > 0 ? `${currency(creditUsed)} / ${currency(creditLimit)}` : "N/A"}
                    </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(0, usagePct)}%` }} />
                </div>
            </div>
        </section>
    );
}
