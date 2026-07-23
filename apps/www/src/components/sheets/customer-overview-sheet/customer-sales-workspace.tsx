"use client";

import { Icons } from "@gnd/ui/icons";

import Link from "@/components/link";
import { CustomerSalesWorkspaceColumnVisibility } from "@/components/tables-2/customer-sales-workspace/column-visibility";
import type { CustomerSalesWorkspaceRow } from "@/components/tables-2/customer-sales-workspace/columns";
import { DataTable as CustomerSalesWorkspaceDataTable } from "@/components/tables-2/customer-sales-workspace/data-table";
import { useSalesOverviewOpen } from "@/hooks/use-sales-overview-open";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Input } from "@gnd/ui/input";
import { DropdownMenu } from "@gnd/ui/namespace";
import type { TaskName } from "@jobs/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

type Props = {
	accountNo: string;
};

type EmailType = "without payment" | "with payment" | "with part payment";

export function CustomerSalesWorkspace({ accountNo }: Props) {
	const trpc = useTRPC();
	const qc = useQueryClient();
	const workspaceQuery = useQuery(
		trpc.customers.getCustomerOverviewV2.queryOptions(
			{ accountNo },
			{
				enabled: !!accountNo,
				staleTime: 60_000,
			},
		),
	);
	const [items, setItems] = useState<CustomerSalesWorkspaceRow[]>([]);
	const [search, setSearch] = useState("");
	const [typeFilter, setTypeFilter] = useState<"all" | "order" | "quote">(
		"all",
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
		taskTitle: "Sending sales email",
		taskDescription: "We will keep watching this email job until it finishes.",
		successToast: "Email sent.",
		errorToast: "Unable to send email.",
	});
	const deleteSaleMutation = useMutation(
		trpc.sales.deleteSale.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					qc.invalidateQueries({
						queryKey: trpc.customers.getCustomerOverviewV2.queryKey({
							accountNo,
						}),
					}),
					qc.invalidateQueries({
						queryKey: trpc.sales.getOrders.infiniteQueryKey(),
					}),
					qc.invalidateQueries({
						queryKey: trpc.sales.quotes.infiniteQueryKey(),
					}),
				]);
			},
		}),
	);

	useEffect(() => {
		if (!workspaceQuery.data?.salesWorkspace) return;
		setItems(
			[
				...workspaceQuery.data.salesWorkspace.orders.map((item) => ({
					...item,
					type: "order" as const,
				})),
				...workspaceQuery.data.salesWorkspace.quotes.map((item) => ({
					...item,
					type: "quote" as const,
				})),
			].sort((left, right) => right.id - left.id),
		);
	}, [workspaceQuery.data]);

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
						String(value).toLowerCase().includes(normalizedSearch),
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

			return matchesSearch && matchesType && matchesPayment && matchesDelivery;
		});
	}, [deliveryFilter, items, paymentFilter, search, typeFilter]);

	const selectedItems = useMemo(
		() => items.filter((item) => selectedIds.includes(item.id)),
		[items, selectedIds],
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

	const sendEmail = async (
		printType: "order" | "quote",
		emailType: EmailType,
	) => {
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
		if (!selectedItems.length) return;
		if (!window.confirm(`Delete ${selectedItems.length} selected sale(s)?`)) {
			return;
		}
		await Promise.all(
			selectedItems.map((item) =>
				deleteSaleMutation.mutateAsync({
					salesId: item.id,
				}),
			),
		);
		setItems((current) =>
			current.filter((item) => !selectedIds.includes(item.id)),
		);
		setSelectedIds([]);
	};

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center justify-between gap-3">
						<span>Sales workspace</span>
						<div className="flex gap-2">
							<CustomerSalesWorkspaceColumnVisibility />
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
							onChange={(value) => setTypeFilter(value as typeof typeFilter)}
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
					<CustomerSalesWorkspaceDataTable
						data={filteredItems}
						isLoading={workspaceQuery.isPending && !items.length}
						selectedIds={selectedIds}
						onToggleAll={toggleAll}
						onToggleRow={(item, checked) => toggleRow(item.id, checked)}
						onOpenRow={(item) => {
							if (item.type === "quote") {
								overviewOpen.openQuote(item.uuid);
								return;
							}
							overviewOpen.openOrder(item.uuid);
						}}
						onDeleted={(item) => {
							setItems((current) =>
								current.filter((currentItem) => currentItem.id !== item.id),
							);
							setSelectedIds((current) =>
								current.filter((id) => id !== item.id),
							);
						}}
					/>
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
										<DropdownMenu.Label>Sales emails</DropdownMenu.Label>
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
												void sendEmail("order", "with part payment");
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
										<DropdownMenu.Label>Quote emails</DropdownMenu.Label>
										<DropdownMenu.Item
											onSelect={(event) => {
												event.preventDefault();
												void sendEmail("quote", "without payment");
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
							disabled={deleteSaleMutation.isPending}
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
