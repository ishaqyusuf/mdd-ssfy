"use client";

import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@/types/type";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import * as React from "react";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { buttonVariants } from "@gnd/ui/button";
import { cells } from "@gnd/ui/custom/data-table/cells";
import { Icons } from "@gnd/ui/icons";
import { Item } from "@gnd/ui/namespace";
import { InvoiceColumn } from "./column.invoice";

import { SuperAdminGuard } from "@/components/auth-guard";
import { SalesFormVersionMenuItems } from "@/components/sales-form-version-menu-items";
import { SalesMenu } from "@/components/sales-menu";
import { useAuth } from "@/hooks/use-auth";
import { useBin } from "@/hooks/use-bin";
import { useDriversList } from "@/hooks/use-data-list";
import { invalidateInfiniteQueries } from "@/hooks/use-invalidate-query";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { prepareSalesHtmlPreview } from "@/modules/sales-print/application/sales-print-service";
import { useTRPC } from "@/trpc/client";
import type { DeliveryOption } from "@/types/sales";
import { SubmitButton } from "@gnd/ui/submit-button";
import { toast } from "@gnd/ui/use-toast";
import type { UpdateSalesControl } from "@sales/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
	FulfillmentCompleteModal,
	type FulfillmentDispatch,
} from "./fulfillment-complete-modal";
export type SalesOrderItem = RouterOutputs["sales"]["index"]["data"][number];
interface ItemProps {
	item: SalesOrderItem;
}

function SalesOrderPreviewAction({ item }: ItemProps) {
	const [isPreviewing, setIsPreviewing] = React.useState(false);

	return (
		<Button
			type="button"
			size="xs"
			variant="outline"
			title="Preview"
			aria-label={`Preview ${item.orderId || item.slug}`}
			disabled={isPreviewing}
			onClick={async () => {
				const previewWindow = window.open("", "_blank");
				if (previewWindow) {
					previewWindow.opener = null;
				}
				setIsPreviewing(true);

				try {
					const href = await prepareSalesHtmlPreview({
						salesIds: [item.id],
						mode: "invoice",
					});

					if (previewWindow && !previewWindow.closed) {
						previewWindow.location.replace(href);
					} else {
						window.open(href, "_blank", "noopener,noreferrer");
					}
				} catch (error: any) {
					if (previewWindow && !previewWindow.closed) {
						previewWindow.close();
					}

					toast({
						title: "Unable to open preview.",
						description: error?.message || "Please try again.",
						variant: "error",
					});
				} finally {
					setIsPreviewing(false);
				}
			}}
		>
			{isPreviewing ? (
				<Icons.Loader2 className="size-4 animate-spin" />
			) : (
				<Icons.Eye className="size-4" />
			)}
		</Button>
	);
}

function getProductionStatusLabel(item: SalesOrderItem) {
	const status = (item as any)?.control?.productionStatus;
	if (status && status !== "unknown") return status;
	return item.status.production?.scoreStatus || item.status.production?.status;
}

function getFulfillmentStatusLabel(item: SalesOrderItem) {
	const status = (item as any)?.control?.dispatchStatus;
	if (status && status !== "unknown") return status;
	return item?.deliveryStatus || "-";
}

function CompactCustomerCell({ item }: { item: SalesOrderItem }) {
	return (
		<div className="max-w-[220px] xl:max-w-[300px]">
			<Item.Title
				className={cn(
					"flex max-w-[220px] items-center gap-1 xl:max-w-[300px]",
					item.isBusiness && "text-blue-700",
				)}
			>
				<TextWithTooltip
					className="max-w-[120px] truncate xl:max-w-[160px]"
					text={item.displayName || "-"}
				/>
				<span className="font-normal text-muted-foreground">
					{" - "}
					{item.customerPhone || "-"}
				</span>
			</Item.Title>
			<Item.Description>
				<TextWithTooltip
					className="min-w-max max-w-[220px] truncate"
					text={item.address || "no address"}
				/>
			</Item.Description>
		</div>
	);
}

const compactCustomerV2 = true;
const compactCustomer = false;

const compactCustomerColumnV2: ColumnDef<SalesOrderItem>[] = [
	{
		header: "Customer",
		accessorKey: "customer",
		cell: ({ row: { original: item } }) => <CompactCustomerCell item={item} />,
	},
];

const legacyCustomerColumnsV2: ColumnDef<SalesOrderItem>[] = [
	{
		header: "Customer",
		accessorKey: "customer",
		cell: ({ row: { original: item } }) => (
			<TCell.Primary
				className={cn(
					item.isBusiness && "text-blue-700",
					"whitespace-nowrap uppercase",
				)}
			>
				<TextWithTooltip
					className="w-[100px] xl:w-[150px] max-w-none"
					text={item.displayName || "-"}
				/>
			</TCell.Primary>
		),
	},
	{
		header: "Phone",
		accessorKey: "phone",
		cell: ({ row: { original: item } }) => (
			<TCell.Secondary className="whitespace-nowrap">
				<TextWithTooltip
					className="w-[110px]"
					text={item?.customerPhone?.trim() || "-"}
				/>
			</TCell.Secondary>
		),
	},
	{
		header: "Address",
		accessorKey: "address",
		cell: ({ row: { original: item } }) => (
			<TCell.Secondary>
				<TextWithTooltip
					className="w-[100px] xl:w-[120px] 2xl:w-[160px] max-w-none"
					text={item?.address}
				/>
			</TCell.Secondary>
		),
	},
];

const compactCustomerColumn: ColumnDef<SalesOrderItem>[] = [
	{
		header: "Customer",
		accessorKey: "customer",
		cell: ({ row: { original: item } }) => <CompactCustomerCell item={item} />,
	},
];

const legacyCustomerColumns: ColumnDef<SalesOrderItem>[] =
	legacyCustomerColumnsV2;

export const columns2: ColumnDef<SalesOrderItem>[] = [
	cells.selectColumn,
	{
		header: "Date",
		accessorKey: "salesDate",
		meta: {},
		cell: ({ row: { original: item } }) => (
			<TCell.Secondary className="font-mono$">
				{item?.salesDate}
			</TCell.Secondary>
		),
	},
	{
		header: "Order #",
		accessorKey: "orderNo",
		cell: ({ row: { original: item } }) => (
			<TCell.Secondary className="whitespace-nowrap inline-flex items-center gap-1">
				<span>{item.orderId}</span>
				{!item.orderId?.toUpperCase().endsWith(item.salesRepInitial) && (
					<Badge className="font-mono$" variant="secondary">
						{item.salesRepInitial}
					</Badge>
				)}
				{!item.noteCount || (
					<Badge className="p-1 h-5" variant="secondary">
						<Icons.StickyNote className="w-3 mr-1" />
						<span className="">{item.noteCount}</span>
					</Badge>
				)}
			</TCell.Secondary>
		),
	},
	{
		header: "P.O",
		accessorKey: "po",
		meta: {
			className: "",
		},
		cell: ({ row: { original: item } }) => <div>{item?.poNo}</div>,
	},
	// Toggle this switch to restore the legacy separate Customer / Phone / Address columns.
	...(compactCustomerV2 ? compactCustomerColumnV2 : legacyCustomerColumnsV2),
	{
		header: "Invoice",
		accessorKey: "invoice",
		meta: {
			className: "text-right",
			preventDefault: true,
		},
		cell: ({ row: { original: item } }) => {
			return <InvoiceColumn item={item} />;
		},
	},
	{
		header: "Method",
		id: "deliveryMethod",
		accessorKey: "dispatch",
		cell: ({ row: { original: item } }) => (
			<Progress.Status>{item?.deliveryOption || "Not set"}</Progress.Status>
		),
	},
	{
		header: "Production",
		accessorKey: "production",
		cell: ({ row: { original: item } }) => (
			<Progress>
				<Progress.Status>{getProductionStatusLabel(item)}</Progress.Status>
			</Progress>
		),
	},
	{
		header: "Fulfillment",
		id: "fulfillmentStatus",
		accessorKey: "dispatch",
		cell: ({ row: { original: item } }) => (
			<Progress.Status>{getFulfillmentStatusLabel(item)}</Progress.Status>
		),
	},
	{
		header: "",
		accessorKey: "action",
		meta: {
			actionCell: true,
			preventDefault: true,
		},
		cell: ({ row: { original: item } }) => (
			<>
				<Actions item={item} />
			</>
		),
	},
];
export const columns: ColumnDef<SalesOrderItem>[] = [
	cells.selectColumn,
	{
		header: "Date",
		accessorKey: "salesDate",
		meta: {},
		cell: ({ row: { original: item } }) => (
			<TCell.Secondary className="font-mono$">
				{item?.salesDate}
			</TCell.Secondary>
		),
	},
	{
		header: "Order #",
		accessorKey: "orderNo",
		cell: ({ row: { original: item } }) => (
			<TCell.Secondary className="whitespace-nowrap inline-flex items-center gap-1">
				<span>{item.orderId}</span>
				{!item.orderId?.toUpperCase().endsWith(item.salesRepInitial) && (
					<Badge className="font-mono$" variant="secondary">
						{item.salesRepInitial}
					</Badge>
				)}
				{!item.noteCount || (
					<Badge className="p-1 h-5" variant="secondary">
						<Icons.StickyNote className="w-3 mr-1" />
						<span className="">{item.noteCount}</span>
					</Badge>
				)}
			</TCell.Secondary>
		),
	},
	{
		header: "P.O",
		accessorKey: "po",
		meta: {
			className: "",
		},
		cell: ({ row: { original: item } }) => <div>{item?.poNo}</div>,
	},
	// Toggle this switch to restore the legacy separate Customer / Phone / Address columns.
	...(compactCustomer ? compactCustomerColumn : legacyCustomerColumns),
	// {
	//     header: "Invoice",
	//     accessorKey: "invoice",
	//     meta: {
	//         className: "text-right",
	//     },
	//     cell: ({ row: { original: item } }) => (
	//         <div className="text-right">
	//             <TCell.Money
	//                 value={item.invoice.total}
	//                 className={cn("font-mono$")}
	//             />
	//         </div>
	//     ),
	// },
	{
		header: "Invoice",
		accessorKey: "invoice",
		meta: {
			className: "text-right",
			preventDefault: true,
		},
		cell: ({ row: { original: item } }) => {
			return <InvoiceColumn item={item} />;
		},
	},

	{
		header: "Method",
		id: "deliveryMethod",
		accessorKey: "dispatch",
		cell: ({ row: { original: item } }) => (
			<Progress.Status>{item?.deliveryOption || "Not set"}</Progress.Status>
		),
	},
	{
		header: "Production",
		accessorKey: "production",
		cell: ({ row: { original: item } }) => (
			<Progress>
				<Progress.Status>{getProductionStatusLabel(item)}</Progress.Status>
			</Progress>
		),
	},
	{
		header: "Fulfillment",
		id: "fulfillmentStatus",
		accessorKey: "dispatch",
		cell: ({ row: { original: item } }) => (
			<Progress.Status>{getFulfillmentStatusLabel(item)}</Progress.Status>
		),
	},
	{
		header: "",
		accessorKey: "action",
		meta: {
			actionCell: true,
			preventDefault: true,
			className: "dt-action-cell",
		},
		cell: ({ row: { original: item } }) => (
			<>
				<Actions item={item} />
			</>
		),
	},
];

function Actions({ item }: { item: SalesOrderItem }) {
	const produceable = !!item.stats?.prodCompleted?.total;
	const productionStatus = String(
		(item as any)?.control?.productionStatus ||
			item?.status?.production?.status ||
			"",
	).toLowerCase();
	const hasPendingProduction = ["pending", "in progress"].includes(
		productionStatus,
	);
	const isFulfillmentCompleted = [
		(item as any)?.control?.dispatchStatus,
		item?.deliveryStatus,
		(item as any)?.status?.delivery?.status,
	]
		.filter(Boolean)
		.some((status) => String(status).toLowerCase() === "completed");
	const isBin = useBin();
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [isFulfillmentModalOpen, setFulfillmentModalOpen] =
		React.useState(false);
	const notification = useNotificationTrigger({ silent: true });
	const { trigger } = useTaskTrigger({
		silent: true,
		onSuccess() {
			invalidateInfiniteQueries("sales.getOrders");
			toast({
				title: "Updated sales order.",
				description: `Sales order ${item.orderId} has been updated.`,
				variant: "success",
			});
		},
	});
	const drivers = useDriversList(isFulfillmentModalOpen);
	const dispatchOverview = useQuery(
		trpc.dispatch.orderDispatchOverview.queryOptions(
			{
				salesId: item.id,
			},
			{
				enabled: isFulfillmentModalOpen,
			},
		),
	);
	const dispatches = (dispatchOverview.data?.deliveries ||
		[]) as FulfillmentDispatch[];
	const { mutateAsync: createDispatch, isPending: isCreatingDispatch } =
		useMutation(
			trpc.dispatch.createDispatch.mutationOptions({
				onSuccess() {
					invalidateInfiniteQueries("sales.getOrders");
				},
			}),
		);
	const { mutateAsync: submitDispatch, isPending: isSubmittingDispatch } =
		useMutation(
			trpc.dispatch.submitDispatch.mutationOptions({
				onSuccess() {
					invalidateInfiniteQueries("sales.getOrders");
				},
			}),
		);
	const { mutateAsync: updateDispatchDriver, isPending: isUpdatingDriver } =
		useMutation(
			trpc.dispatch.updateDispatchDriver.mutationOptions({
				onSuccess() {
					invalidateInfiniteQueries("sales.getOrders");
				},
			}),
		);
	const {
		mutateAsync: updateSalesDeliveryOption,
		isPending: isUpdatingDeliveryOption,
	} = useMutation(
		trpc.dispatch.updateSalesDeliveryOption.mutationOptions({
			onSuccess() {
				invalidateInfiniteQueries("sales.getOrders");
			},
		}),
	);
	const {
		mutate: deleteDispatch,
		isPending: isDeletingDispatch,
		variables: deletingDispatchVars,
	} = useMutation(
		trpc.dispatch.deleteDispatch.mutationOptions({
			onSuccess() {
				dispatchOverview.refetch();
				invalidateInfiniteQueries("sales.getOrders");
			},
			onError(error) {
				toast({
					title: "Unable to delete dispatch.",
					description: error.message || "Please try again.",
					variant: "error",
				});
			},
		}),
	);
	const getMeta = () => ({
		salesId: item.id,
		authorId: Number(auth?.id || 0),
		authorName: auth?.name || "System",
	});
	const deletingDispatchId =
		deletingDispatchVars && "dispatchId" in deletingDispatchVars
			? Number(deletingDispatchVars.dispatchId)
			: null;
	const triggerProductionComplete = () => {
		toast({
			title: "Updating production status...",
			description: `Marking production as complete for order ${item.orderId}.`,
			variant: "spinner",
		});
		const payload: UpdateSalesControl = {
			meta: getMeta(),
			submitAll: {},
		};
		trigger({
			taskName: "update-sales-control",
			payload,
		});
		notification.send("sales_production_all_completed", {
			payload: {
				salesId: item.id,
				orderNo: item.orderId || undefined,
			},
			author: {
				id: Number(auth?.id || 0),
				role: "employee",
			},
		});
	};

	const handleFulfillmentConfirm = async (payload: {
		selectedDispatchId: number | null;
		createNew: boolean;
		completionMode: "pending_packing" | "pack_all";
		deliveryMode: DeliveryOption;
		recipient: string;
		completedDate: Date;
		driverId: number | null;
	}) => {
		if (hasPendingProduction) {
			toast({
				title: "Production pending",
				description:
					"Fulfillment cannot be completed while production is still pending.",
				variant: "error",
			});
			return;
		}
		toast({
			title: "Updating fulfillment...",
			description: `Marking fulfillment as complete for order ${item.orderId}.`,
			variant: "spinner",
		});

		try {
			let dispatchId = payload.selectedDispatchId;
			const selectedDispatch = dispatches.find(
				(dispatch) => dispatch.id === dispatchId,
			);
			const selectedDeliveryMode =
				payload.deliveryMode || item.deliveryOption || "delivery";
			const driverId =
				selectedDeliveryMode === "pickup" ? null : payload.driverId;

			if (selectedDeliveryMode !== item.deliveryOption) {
				await updateSalesDeliveryOption({
					salesId: item.id,
					option: selectedDeliveryMode,
				});
			}

			if (payload.createNew || !dispatchId) {
				const createdDispatch = await createDispatch({
					salesId: item.id,
					deliveryMode: selectedDeliveryMode,
					dueDate: payload.completedDate || new Date(),
					driverId: driverId || undefined,
					status: "queue",
				});
				dispatchId = createdDispatch.id;
			} else if (
				selectedDispatch &&
				selectedDeliveryMode !== selectedDispatch.deliveryMode
			) {
				await updateSalesDeliveryOption({
					salesId: item.id,
					deliveryId: selectedDispatch.id,
					option: selectedDeliveryMode,
				});
			}

			if (
				selectedDispatch &&
				driverId !== (selectedDispatch.driverId ?? null)
			) {
				await updateDispatchDriver({
					dispatchId: selectedDispatch.id,
					oldDriverId: selectedDispatch.driverId ?? null,
					newDriverId: driverId ?? null,
				});
			}

			if (!dispatchId) {
				throw new Error("Dispatch is required.");
			}

			if (payload.completionMode === "pack_all") {
				const packAllPayload: UpdateSalesControl = {
					meta: getMeta(),
					packItems: {
						dispatchId,
						dispatchStatus: "completed",
						packMode: "all",
						replaceExisting: true,
					},
				};
				trigger({
					taskName: "update-sales-control",
					payload: packAllPayload,
				});
			}

			await submitDispatch({
				meta: getMeta(),
				submitDispatch: {
					dispatchId,
					receivedBy:
						payload.recipient ||
						item?.addressData?.shipping?.name ||
						"Customer",
					receivedDate: payload.completedDate || new Date(),
				},
			});

			setFulfillmentModalOpen(false);
			queryClient.invalidateQueries({
				queryKey: trpc.dispatch.orderDispatchOverview.queryKey({
					salesId: item.id,
				}),
			});
		} catch (error: any) {
			toast({
				title: "Unable to complete fulfillment.",
				description: error?.message || "Please try again.",
				variant: "error",
			});
		}
	};
	const { mutate: restore, isPending: isRestoring } = useMutation(
		trpc.sales.restore.mutationOptions({
			onSuccess: () => {
				invalidateInfiniteQueries("sales.getOrders");
			},
			meta: {
				toastTitle: {
					error: "Unable to complete",
					loading: "Processing...",
					success: "Done!.",
				},
			},
		}),
	);
	if (isBin) {
		return (
			<>
				<SubmitButton
					type="button"
					onClick={(e) => {
						restore({ salesId: item.id });
					}}
					isSubmitting={isRestoring}
					size="sm"
					variant="destructive"
				>
					Restore
				</SubmitButton>
			</>
		);
	}
	return (
		<div className="relative flex items-center gap-2 z-10">
			<Link
				className={cn(
					buttonVariants({
						// variant: "ghost"
						size: "xs",
					}),
					"bg-green-600/70 hover:bg-green-600 text-accent",
				)}
				href={`/sales-book/edit-order/${item.slug}`}
				target="_blank"
				rel="noopener noreferrer"
				title="Edit"
				aria-label={`Edit ${item.orderId || item.slug}`}
			>
				<Icons.Edit className="size-4" />
			</Link>
			<SalesOrderPreviewAction item={item} />
			<SalesMenu
				id={item.id}
				slug={item.slug}
				type="order"
				trigger={
					<Button size="xs" variant="outline">
						<Icons.MoreHoriz className="size-4 text-muted-foreground" />
					</Button>
				}
			>
				<SalesFormVersionMenuItems
					slug={item.slug}
					type="order"
					uuid={item.uuid}
					includeOverviewV2
				/>
				<SalesMenu.SalesPrintMenuItems />
				<SuperAdminGuard>
					<SalesMenu.PrintModes />
				</SuperAdminGuard>
				<SalesMenu.Sub>
					<SalesMenu.SubTrigger>
						<Icons.Check className="mr-2 size-4 text-muted-foreground/70" />
						Mark as
					</SalesMenu.SubTrigger>
					<SalesMenu.SubContent>
						<SalesMenu.Item
							disabled={!produceable}
							onSelect={(e) => {
								e.preventDefault();
								triggerProductionComplete();
							}}
						>
							<Icons.Check className="mr-2 size-4 text-muted-foreground/70" />
							Production Complete
						</SalesMenu.Item>
						<SalesMenu.Item
							disabled={isFulfillmentCompleted || hasPendingProduction}
							onSelect={(e) => {
								e.preventDefault();
								if (isFulfillmentCompleted || hasPendingProduction) {
									if (hasPendingProduction) {
										toast({
											title: "Production pending",
											description:
												"Fulfillment cannot be completed while production is still pending.",
											variant: "error",
										});
									}
									return;
								}
								setFulfillmentModalOpen(true);
							}}
						>
							<Icons.Check className="mr-2 size-4 text-muted-foreground/70" />
							Fulfillment Complete
						</SalesMenu.Item>
					</SalesMenu.SubContent>
				</SalesMenu.Sub>
				<SalesMenu.Separator />
				<SalesMenu.Delete />
			</SalesMenu>
			<FulfillmentCompleteModal
				open={isFulfillmentModalOpen}
				onOpenChange={setFulfillmentModalOpen}
				dispatches={dispatches}
				drivers={(drivers || []).map((driver: any) => ({
					id: Number(driver.id),
					name: driver.name,
				}))}
				defaultRecipient={
					item?.addressData?.shipping?.name || item.displayName || "Customer"
				}
				defaultDeliveryMode={
					(item.deliveryOption as DeliveryOption) || "delivery"
				}
				isLoading={dispatchOverview.isLoading || dispatchOverview.isFetching}
				isSubmitting={
					isCreatingDispatch ||
					isSubmittingDispatch ||
					isUpdatingDriver ||
					isUpdatingDeliveryOption ||
					isDeletingDispatch
				}
				deletingDispatchId={deletingDispatchId}
				onDeleteDispatch={(dispatchId) => {
					deleteDispatch({ dispatchId });
				}}
				onConfirm={handleFulfillmentConfirm}
			/>
		</div>
	);
}
export const mobileColumn: ColumnDef<SalesOrderItem>[] = [
	{
		header: "",
		accessorKey: "row",
		meta: {
			className: "flex-1 p-0",
		},
		cell: ({ row: { original: item } }) => {
			return <ItemCard item={item} />;
		},
	},
];

function getInvoiceStatusLabel(item: SalesOrderItem) {
	if (item.invoice.pending <= 0) return "Paid";
	if (item.invoice.pending >= item.invoice.total) return "Unpaid";
	return "Part paid";
}

function getInvoiceToneClass(item: SalesOrderItem) {
	if (item.invoice.pending <= 0) {
		return "border-emerald-200 bg-emerald-50 text-emerald-700";
	}
	if (item.invoice.pending >= item.invoice.total) {
		return "border-red-200 bg-red-50 text-red-700";
	}
	return "border-amber-200 bg-amber-50 text-amber-700";
}

function MobileStatusBlock({
	label,
	value,
	icon: Icon,
}: {
	label: string;
	value: string;
	icon: React.ComponentType<{ className?: string }>;
}) {
	return (
		<div className="min-w-0 rounded-2xl border border-border/70 bg-muted/20 px-3 py-2.5">
			<div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
				<Icon className="size-3.5 shrink-0" />
				<span className="truncate">{label}</span>
			</div>
			<div className="mt-1 truncate text-sm font-semibold capitalize text-foreground">
				{value || "-"}
			</div>
		</div>
	);
}

function ItemCard({ item }: ItemProps) {
	const invoiceStatus = getInvoiceStatusLabel(item);
	const productionStatus = getProductionStatusLabel(item) || "-";
	const fulfillmentStatus = getFulfillmentStatusLabel(item) || "-";

	return (
		<div
			className={cn(
				"group flex w-full flex-col gap-3 rounded-3xl border border-border/70 bg-card p-4 text-left shadow-sm transition duration-200 active:scale-[0.995]",
				item.invoice.pending >= item.invoice.total &&
					"border-red-200/80 bg-red-50/30",
			)}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
						Customer
					</p>
					<p
						className={cn(
							"mt-1 truncate text-xl font-semibold leading-6 text-foreground",
							item.isBusiness && "text-blue-700",
						)}
					>
						{item.displayName || "Unknown customer"}
					</p>
					<div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
						<span className="rounded-full bg-muted px-2 py-1 font-mono text-[11px] font-semibold uppercase text-foreground">
							{item.orderId || "-"}
						</span>
						{!item.orderId?.toUpperCase().endsWith(item.salesRepInitial) && (
							<span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold uppercase text-primary">
								{item.salesRepInitial}
							</span>
						)}
						{!item.noteCount || (
							<span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
								<Icons.StickyNote className="mr-1 size-3" />
								{item.noteCount}
							</span>
						)}
					</div>
				</div>

				<div className="flex shrink-0 items-start gap-1.5">
					<span
						className={cn(
							"rounded-full border px-2.5 py-1 text-[11px] font-semibold",
							getInvoiceToneClass(item),
						)}
					>
						{invoiceStatus}
					</span>
					<div
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
						}}
						onKeyDown={(event) => {
							event.stopPropagation();
						}}
					>
						<Actions item={item} />
					</div>
				</div>
			</div>

			<div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
				<div className="min-w-0 space-y-2 text-sm">
					<div className="flex min-w-0 items-center gap-2">
						<Icons.Calendar className="size-4 shrink-0 text-muted-foreground" />
						<span className="truncate text-foreground">
							{item.salesDate || "No date"}
						</span>
					</div>
					<div className="flex min-w-0 items-center gap-2">
						<Icons.Phone className="size-4 shrink-0 text-muted-foreground" />
						<span className="truncate text-muted-foreground">
							{item.customerPhone || "No phone number"}
						</span>
					</div>
					<div className="flex min-w-0 items-start gap-2">
						<Icons.MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
						<TextWithTooltip
							className="max-w-full truncate text-muted-foreground"
							text={item.address || "No address available"}
						/>
					</div>
				</div>

				<div className="min-w-[92px] text-right">
					<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
						Invoice
					</p>
					<TCell.Money
						value={item.invoice.total}
						className={cn(
							"mt-1 block text-base font-semibold",
							item.invoice.pending === item.invoice.total
								? "text-red-600"
								: item.invoice.pending > 0
									? "text-amber-600"
									: "text-emerald-600",
						)}
					/>
					{item.poNo ? (
						<p className="mt-1 max-w-[110px] truncate text-[11px] text-muted-foreground">
							PO {item.poNo}
						</p>
					) : null}
				</div>
			</div>

			<div className="grid grid-cols-2 gap-2">
				<MobileStatusBlock
					label="Production"
					value={productionStatus}
					icon={Icons.Factory}
				/>
				<MobileStatusBlock
					label="Fulfillment"
					value={fulfillmentStatus}
					icon={Icons.Package2}
				/>
			</div>

			<div className="flex items-center justify-between border-border/70 border-t pt-3 text-sm">
				<span className="text-muted-foreground">Open sales order</span>
				<Icons.ExternalLink className="size-4 text-muted-foreground transition group-hover:text-primary" />
			</div>
		</div>
	);
}
