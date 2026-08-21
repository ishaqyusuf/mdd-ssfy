"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@gnd/ui/field";
import { Icons } from "@gnd/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { Spinner } from "@gnd/ui/spinner";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { ToggleGroup, ToggleGroupItem } from "@gnd/ui/toggle-group";
import { useState } from "react";
import { toast } from "sonner";

type DeliveryMode = "pickup" | "delivery";

function toInputDate(value?: Date | string | null) {
	if (!value) return "";
	if (typeof value === "string") {
		const dateOnly = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
		if (dateOnly) return dateOnly;
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, "0"),
		String(date.getDate()).padStart(2, "0"),
	].join("-");
}

function formatFulfillmentDate(value?: Date | string | null) {
	const inputDate = toInputDate(value);
	if (!inputDate) return "Set date";
	const [year, month, day] = inputDate.split("-").map(Number);
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(year, month - 1, day));
}

export function DeliveryOptionPopover({
	salesId,
	salesOrderNo,
	salesType,
	fallbackMode,
	fallbackDeliveryId,
	fallbackFulfillmentDate,
}: {
	salesId: number;
	salesOrderNo: string;
	salesType: "order" | "quote";
	fallbackMode?: string | null;
	fallbackDeliveryId?: number | null;
	fallbackFulfillmentDate?: Date | string | null;
}) {
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [draftMode, setDraftMode] = useState<DeliveryMode | null>(null);
	const [draftDate, setDraftDate] = useState<string | null>(null);
	const canEdit = Boolean(
		auth.can?.editPickup || auth.can?.editOrders || auth.can?.viewPacking,
	);
	const deliveryQuery = useQuery(
		trpc.dispatch.salesDeliveryInfo.queryOptions(
			{ salesId },
			{ enabled: open && canEdit },
		),
	);
	const dispatch = deliveryQuery.data?.deliveries?.[0];
	const persistedMode = String(
		dispatch?.deliveryMode ||
			deliveryQuery.data?.deliveryOption ||
			fallbackMode ||
			"pickup",
	).toLowerCase();
	const mode: DeliveryMode =
		persistedMode === "delivery" ? "delivery" : "pickup";
	const deliveryId = dispatch?.id ?? fallbackDeliveryId;
	const fulfillmentDate = dispatch?.dueDate ?? fallbackFulfillmentDate;
	const selectedMode = draftMode ?? mode;
	const selectedDate = draftDate ?? toInputDate(fulfillmentDate);
	const selectedCalendarDate = selectedDate
		? new Date(`${selectedDate}T00:00:00`)
		: undefined;

	const updateDelivery = useMutation(
		trpc.dispatch.updateSalesDeliveryOption.mutationOptions({
			async onSuccess() {
				setDraftMode(null);
				setDraftDate(null);
				setOpen(false);
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.salesDeliveryInfo.queryKey({ salesId }),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.getSaleOverview.queryKey({
							orderNo: salesOrderNo,
							salesType,
						}),
					}),
				]);
				toast.success("Delivery details updated");
			},
			onError(error) {
				toast.error(error.message || "Unable to update delivery details");
			},
		}),
	);

	const setPopoverOpen = (nextOpen: boolean) => {
		if (!nextOpen && updateDelivery.isPending) return;
		setOpen(nextOpen);
		if (!nextOpen) {
			setDraftMode(null);
			setDraftDate(null);
		}
	};

	const save = () => {
		updateDelivery.mutate({
			salesId,
			deliveryId,
			defaultOption: mode,
			option: selectedMode,
			date: selectedDate ? new Date(`${selectedDate}T12:00:00`) : null,
		});
	};

	if (!canEdit) {
		return (
			<span className="inline-flex items-center gap-1.5 capitalize">
				{mode}
				<span aria-hidden="true" className="text-muted-foreground">
					·
				</span>
				<span>{formatFulfillmentDate(fulfillmentDate)}</span>
			</span>
		);
	}

	return (
		<Popover open={open} onOpenChange={setPopoverOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="xs"
					className="w-full min-w-0 justify-start px-0"
					aria-label="Change delivery option and fulfillment date"
				>
					<span className="font-medium capitalize">{mode}</span>
					<span aria-hidden="true" className="text-muted-foreground">
						·
					</span>
					<span className="truncate">
						{formatFulfillmentDate(fulfillmentDate)}
					</span>
					<Icons.Edit3
						data-icon="inline-end"
						className="ml-auto"
						aria-hidden="true"
					/>
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-80">
				<h3 className="text-sm font-semibold">Delivery option</h3>
				<FieldGroup className="mt-4 gap-4">
					<FieldSet className="gap-2">
						<FieldLegend variant="label">Fulfillment type</FieldLegend>
						<ToggleGroup
							type="single"
							variant="outline"
							value={selectedMode}
							onValueChange={(value) => {
								if (value === "pickup" || value === "delivery") {
									setDraftMode(value);
								}
							}}
							className="grid w-full grid-cols-2"
						>
							<ToggleGroupItem value="pickup">Pickup</ToggleGroupItem>
							<ToggleGroupItem value="delivery">Delivery</ToggleGroupItem>
						</ToggleGroup>
					</FieldSet>
					<Field>
						<FieldLabel>Fulfillment date</FieldLabel>
						<Calendar
							mode="single"
							aria-label="Fulfillment date"
							className="mx-auto p-0"
							defaultMonth={selectedCalendarDate}
							selected={selectedCalendarDate}
							onSelect={(date) => setDraftDate(date ? toInputDate(date) : "")}
						/>
					</Field>
				</FieldGroup>
				<div className="mt-4 flex justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={updateDelivery.isPending}
						onClick={() => setPopoverOpen(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						size="sm"
						disabled={updateDelivery.isPending || deliveryQuery.isPending}
						onClick={save}
					>
						{updateDelivery.isPending ? (
							<Spinner data-icon="inline-start" />
						) : null}
						Save
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
