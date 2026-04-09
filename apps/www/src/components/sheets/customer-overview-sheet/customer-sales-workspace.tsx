"use client";

import { Icons } from "@gnd/ui/icons";

import { deleteSalesByOrderIds } from "@/app-deps/(clean-code)/(sales)/_common/data-actions/sales-actions";
import { getCustomerSalesWorkspace } from "@/actions/get-customer-sales-workspace";
import { SalesMenu } from "@/components/sales-menu";
import Link from "@/components/link";
import {
    DataSkeletonProvider,
    useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";
import { useSalesOverviewOpen } from "@/hooks/use-sales-overview-open";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { cn } from "@/lib/utils";
import type { TaskName } from "@jobs/schema";
import { formatMoney } from "@gnd/utils";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Checkbox } from "@gnd/ui/checkbox";
import { Input } from "@gnd/ui/input";
import { DropdownMenu } from "@gnd/ui/namespace";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { useEffect, useMemo, useState } from "react";

type Props = {
    accountNo: string;
};

type SalesWorkspaceItem = Awaited<
    ReturnType<typeof getCustomerSalesWorkspace>
>["orders"][number];

type WorkspaceItem = SalesWorkspaceItem & {
    type: "order" | "quote";
};

type EmailType = "without payment" | "with payment" | "with part payment";

export function CustomerSalesWorkspace({ accountNo }: Props) {
    const loader = async () => getCustomerSalesWorkspace(accountNo);
    const skel = useCreateDataSkeletonCtx({
        loader,
        autoLoad: true,
    });
    const [items, setItems] = useState<WorkspaceItem[]>([]);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<"all" | "order" | "quote">(
        "all"
    );
    const [paymentFilter, setPaymentFilter] = useState<
        "all" | "pending" | "paid"
    >("all");
    const [deliveryFilter, setDeliveryFilter] = useState<
        "all" | "pending" | "completed"
    >("all");
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const overviewOpen = useSalesOverviewOpen();
    const emailTrigger = useTaskTrigger({
        executingToast: "Sending email...",
        successToast: "Email sent.",
        errorToast: "Unable to send email.",
    });

    useEffect(() => {
        if (!skel.data) return;
        setItems(
            [
                ...skel.data.orders.map((item) => ({
                    ...item,
                    type: "order" as const,
                })),
                ...skel.data.quotes.map((item) => ({
                    ...item,
                    type: "quote" as const,
                })),
            ].sort((left, right) => right.id - left.id)
        );
    }, [skel.data]);

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const normalizedSearch = search.trim().toLowerCase();
            const matchesSearch =
                !normalizedSearch ||
                [
                    item.orderId,
                    item.displayName,
                    item.customerPhone,
                    item.poNo,
                    item.address,
                ]
                    .filter(Boolean)
                    .some((value) =>
                        String(value).toLowerCase().includes(normalizedSearch)
                    );
            const matchesType =
                typeFilter === "all" ? true : item.type === typeFilter;
            const hasPendingPayment = Number(item.due || 0) > 0;
            const matchesPayment =
                paymentFilter === "all"
                    ? true
                    : paymentFilter === "pending"
                      ? hasPendingPayment
                      : !hasPendingPayment;
            const deliveryStatus = item.status?.delivery?.status;
            const matchesDelivery =
                deliveryFilter === "all"
                    ? true
                    : deliveryFilter === "pending"
                      ? item.type === "order" && deliveryStatus !== "completed"
                      : item.type === "order" && deliveryStatus === "completed";

            return (
                matchesSearch &&
                matchesType &&
                matchesPayment &&
                matchesDelivery
            );
        });
    }, [deliveryFilter, items, paymentFilter, search, typeFilter]);

    const selectedItems = useMemo(
        () => items.filter((item) => selectedIds.includes(item.id)),
        [items, selectedIds]
    );
    const selectedOrderIds = selectedItems
        .filter((item) => item.type === "order")
        .map((item) => item.id);
    const selectedQuoteIds = selectedItems
        .filter((item) => item.type === "quote")
        .map((item) => item.id);

    const toggleAll = (checked: boolean) => {
        setSelectedIds(checked ? filteredItems.map((item) => item.id) : []);
    };

    const toggleRow = (itemId: number, checked: boolean) => {
        setSelectedIds((current) => {
            if (checked) return [...new Set([...current, itemId])];
            return current.filter((id) => id !== itemId);
        });
    };

    const sendEmail = async (printType: "order" | "quote", emailType: EmailType) => {
        const salesIds =
            printType === "order" ? selectedOrderIds : selectedQuoteIds;
        if (!salesIds.length) return;

        emailTrigger.trigger({
            taskName: "send-sales-email" as TaskName,
            payload: {
                salesIds,
                printType,
                emailType,
            },
        });
    };

    const deleteSelected = async () => {
        const orderIds = selectedItems.map((item) => item.orderId).filter(Boolean);
        if (!orderIds.length) return;
        if (!window.confirm(`Delete ${orderIds.length} selected sale(s)?`)) {
            return;
        }
        await deleteSalesByOrderIds(orderIds);
        setItems((current) =>
            current.filter((item) => !selectedIds.includes(item.id))
        );
        setSelectedIds([]);
    };

    const allFilteredSelected =
        filteredItems.length > 0 &&
        filteredItems.every((item) => selectedIds.includes(item.id));

    return (
        <DataSkeletonProvider value={skel}>
            <div className="space-y-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between gap-3">
                            <span>Sales workspace</span>
                            <div className="flex gap-2">
                                <Button asChild size="sm">
                                    <Link href="/sales-book/create-order">
                                        <Icons.Plus className="mr-2 size-4" />
                                        New sales
                                    </Link>
                                </Button>
                                <Button asChild size="sm" variant="outline">
                                    <Link href="/sales-book/create-quote">
                                        <Icons.Plus className="mr-2 size-4" />
                                        New quote
                                    </Link>
                                </Button>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-4">
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search order, customer, phone, PO"
                            />
                            <FilterSelect
                                label="Type"
                                value={typeFilter}
                                options={[
                                    ["all", "All"],
                                    ["order", "Orders"],
                                    ["quote", "Quotes"],
                                ]}
                                onChange={(value) =>
                                    setTypeFilter(value as typeof typeFilter)
                                }
                            />
                            <FilterSelect
                                label="Payment"
                                value={paymentFilter}
                                options={[
                                    ["all", "All"],
                                    ["pending", "Pending payment"],
                                    ["paid", "Paid"],
                                ]}
                                onChange={(value) =>
                                    setPaymentFilter(value as typeof paymentFilter)
                                }
                            />
                            <FilterSelect
                                label="Delivery"
                                value={deliveryFilter}
                                options={[
                                    ["all", "All"],
                                    ["pending", "Pending delivery"],
                                    ["completed", "Completed delivery"],
                                ]}
                                onChange={(value) =>
                                    setDeliveryFilter(value as typeof deliveryFilter)
                                }
                            />
                        </div>
                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10">
                                            <Checkbox
                                                checked={allFilteredSelected}
                                                onCheckedChange={(checked) =>
                                                    toggleAll(checked === true)
                                                }
                                                aria-label="Select all"
                                            />
                                        </TableHead>
                                        <TableHead>Order</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead>Delivery</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                        <TableHead className="w-16"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.length ? (
                                        filteredItems.map((item) => {
                                            const isSelected = selectedIds.includes(item.id);
                                            const due = Number(item.due || 0);

                                            return (
                                                <TableRow
                                                    key={`${item.type}-${item.id}`}
                                                    className={cn(
                                                        isSelected && "bg-muted/50"
                                                    )}
                                                >
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={(checked) =>
                                                                toggleRow(
                                                                    item.id,
                                                                    checked === true
                                                                )
                                                            }
                                                            aria-label={`Select ${item.orderId}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <button
                                                            type="button"
                                                            className="flex items-center gap-2 text-left font-medium hover:text-primary"
                                                            onClick={() => {
                                                                if (item.type === "quote") {
                                                                    overviewOpen.openQuoteSheet(
                                                                        item.uuid
                                                                    );
                                                                    return;
                                                                }
                                                                overviewOpen.openSalesAdminSheet(
                                                                    item.uuid
                                                                );
                                                            }}
                                                        >
                                                            <span>{item.orderId}</span>
                                                            <Icons.ExternalLink className="size-3.5 text-muted-foreground" />
                                                        </button>
                                                        <div className="text-xs text-muted-foreground">
                                                            {item.salesDate}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">
                                                            {item.displayName || "-"}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {item.customerPhone || item.address || "-"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                item.type === "order"
                                                                    ? "default"
                                                                    : "secondary"
                                                            }
                                                        >
                                                            {item.type === "order"
                                                                ? "Sales"
                                                                : "Quote"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <StatusBadge
                                                            tone={due > 0 ? "warn" : "success"}
                                                            label={
                                                                due > 0
                                                                    ? `Pending $${formatMoney(due)}`
                                                                    : "Paid"
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.type === "quote" ? (
                                                            <StatusBadge
                                                                tone="muted"
                                                                label="Not applicable"
                                                            />
                                                        ) : (
                                                            <StatusBadge
                                                                tone={
                                                                    item.status?.delivery?.status ===
                                                                    "completed"
                                                                        ? "success"
                                                                        : "warn"
                                                                }
                                                                label={
                                                                    item.status?.delivery?.status ||
                                                                    "Pending"
                                                                }
                                                            />
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        ${formatMoney(item.invoice.total)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <SalesMenu
                                                            id={item.id}
                                                            slug={item.slug}
                                                            type={item.type}
                                                            trigger={
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                >
                                                                    ...
                                                                </Button>
                                                            }
                                                        >
                                                            <SalesMenu.Sub>
                                                                <SalesMenu.SubTrigger>
                                                                    <Icons.Mail className="mr-2 size-4 text-muted-foreground/70" />
                                                                    Send email
                                                                </SalesMenu.SubTrigger>
                                                                <SalesMenu.SubContent>
                                                                    {item.type === "quote" ? (
                                                                        <SalesMenu.QuoteEmailMenuItems />
                                                                    ) : (
                                                                        <SalesMenu.SalesEmailMenuItems />
                                                                    )}
                                                                </SalesMenu.SubContent>
                                                            </SalesMenu.Sub>
                                                            <SalesMenu.Delete
                                                                onDeleted={() => {
                                                                    setItems((current) =>
                                                                        current.filter(
                                                                            (currentItem) =>
                                                                                currentItem.id !==
                                                                                item.id
                                                                        )
                                                                    );
                                                                    setSelectedIds(
                                                                        (current) =>
                                                                            current.filter(
                                                                                (id) =>
                                                                                    id !== item.id
                                                                            )
                                                                    );
                                                                }}
                                                            />
                                                        </SalesMenu>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={8}
                                                className="h-32 text-center text-muted-foreground"
                                            >
                                                No sales found for the selected filters.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {selectedItems.length ? (
                    <div className="sticky bottom-4 z-20 flex justify-center">
                        <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2 shadow-xl">
                            <div className="pr-2 text-sm text-muted-foreground">
                                {selectedItems.length} selected
                            </div>
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Icons.Mail className="mr-2 size-4" />
                                        Send email
                                    </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content align="center" className="w-56">
                                    {selectedOrderIds.length ? (
                                        <>
                                            <DropdownMenu.Label>
                                                Sales emails
                                            </DropdownMenu.Label>
                                            <DropdownMenu.Item
                                                onSelect={(event) => {
                                                    event.preventDefault();
                                                    void sendEmail("order", "without payment");
                                                }}
                                            >
                                                Send without payment
                                            </DropdownMenu.Item>
                                            <DropdownMenu.Item
                                                onSelect={(event) => {
                                                    event.preventDefault();
                                                    void sendEmail("order", "with payment");
                                                }}
                                            >
                                                Send with payment
                                            </DropdownMenu.Item>
                                            <DropdownMenu.Item
                                                onSelect={(event) => {
                                                    event.preventDefault();
                                                    void sendEmail(
                                                        "order",
                                                        "with part payment"
                                                    );
                                                }}
                                            >
                                                Send with part payment
                                            </DropdownMenu.Item>
                                        </>
                                    ) : null}
                                    {selectedOrderIds.length && selectedQuoteIds.length ? (
                                        <DropdownMenu.Separator />
                                    ) : null}
                                    {selectedQuoteIds.length ? (
                                        <>
                                            <DropdownMenu.Label>
                                                Quote emails
                                            </DropdownMenu.Label>
                                            <DropdownMenu.Item
                                                onSelect={(event) => {
                                                    event.preventDefault();
                                                    void sendEmail(
                                                        "quote",
                                                        "without payment"
                                                    );
                                                }}
                                            >
                                                Send quote email
                                            </DropdownMenu.Item>
                                        </>
                                    ) : null}
                                </DropdownMenu.Content>
                            </DropdownMenu.Root>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                    void deleteSelected();
                                }}
                            >
                                <Icons.Trash2 className="mr-2 size-4" />
                                Delete
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedIds([])}
                            >
                                Clear
                            </Button>
                        </div>
                    </div>
                ) : null}
            </div>
        </DataSkeletonProvider>
    );
}

function FilterSelect({
    label,
    onChange,
    options,
    value,
}: {
    label: string;
    value: string;
    options: Array<[string, string]>;
    onChange: (value: string) => void;
}) {
    return (
        <label className="grid gap-1 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
                <Icons.Filter className="size-3.5" />
                {label}
            </span>
            <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            >
                {options.map(([optionValue, optionLabel]) => (
                    <option key={optionValue} value={optionValue}>
                        {optionLabel}
                    </option>
                ))}
            </select>
        </label>
    );
}

function StatusBadge({
    label,
    tone,
}: {
    label: string;
    tone: "success" | "warn" | "muted";
}) {
    return (
        <Badge
            variant="outline"
            className={cn(
                tone === "success" &&
                    "border-emerald-200 bg-emerald-50 text-emerald-700",
                tone === "warn" &&
                    "border-amber-200 bg-amber-50 text-amber-700",
                tone === "muted" &&
                    "border-slate-200 bg-slate-50 text-slate-600"
            )}
        >
            {label}
        </Badge>
    );
}
