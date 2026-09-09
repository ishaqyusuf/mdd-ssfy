"use client";
import { useTRPC } from "@/trpc/client";
import { availabilityBusinessDate } from "@gnd/sales/production-availability-contract";
import { Button } from "@gnd/ui/button";
import { ButtonGroup } from "@gnd/ui/button-group";
import { Calendar } from "@gnd/ui/calendar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { useQuery } from "@gnd/ui/tanstack";
import { useRef, useState } from "react";
import { useAvailabilitySave } from "./use-availability-save";
import type { RouterOutputs } from "@api/trpc/routers/_app";

function calendarValue(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function AvailabilityActionGroup({
	salesOrderId,
	onOpenForm,
	disabled = false,
	title,
}: {
	salesOrderId: number;
	onOpenForm: () => void;
	disabled?: boolean;
	title?: string;
}) {
	const trpc = useTRPC();
	const [menuOpen, setMenuOpen] = useState(false);
	const [calendarOpen, setCalendarOpen] = useState(false);
	const [supplier, setSupplier] = useState<{ id: number | null; name: string }>(
		{ id: null, name: "N/A" },
	);
	const [date, setDate] = useState(() => availabilityBusinessDate());
	const openingCalendar = useRef(false);
	const snapshot = useRef<
		RouterOutputs["sales"]["productionAvailability"] | null
	>(null);
	const summary = useQuery(
		trpc.sales.productionAvailability.queryOptions(
			{ salesOrderId },
			{ enabled: menuOpen || calendarOpen },
		),
	);
	const suppliers = useQuery(
		trpc.sales.productionAvailabilitySuppliers.queryOptions(
			{ salesOrderId },
			{ enabled: menuOpen },
		),
	);
	const save = useAvailabilitySave(() => {
		setCalendarOpen(false);
		setMenuOpen(false);
		snapshot.current = null;
	});
	const today = availabilityBusinessDate();
	function chooseSupplier(value: typeof supplier) {
		if (!summary.data?.canMarkAvailable) return;
		snapshot.current = summary.data;
		setSupplier(value);
		setDate(today);
		openingCalendar.current = true;
		setMenuOpen(false);
		save.reset();
	}
	function submit(value: string) {
		const preview = snapshot.current;
		if (!preview || summary.isFetching || value > today) return;
		save.save({
			salesOrderId,
			expectedRevision: preview.revision,
			supplierId: supplier.id,
			receivedDate: value,
			selection: { mode: "all" },
		});
	}
	return (
		<Popover
			open={calendarOpen}
			onOpenChange={(open) => {
				if (!open && !save.isPending) setCalendarOpen(false);
			}}
		>
			<DropdownMenu
				open={menuOpen}
				onOpenChange={(open) => {
					if (!save.isPending) {
						setMenuOpen(open);
						if (open) setCalendarOpen(false);
					}
				}}
			>
				<ButtonGroup aria-label="Material availability actions">
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={disabled || save.isPending}
						title={title}
						onClick={onOpenForm}
					>
						Mark as available
					</Button>
					<PopoverTrigger asChild>
						<DropdownMenuTrigger asChild>
							<Button
								type="button"
								size="sm"
								variant="outline"
								disabled={disabled || save.isPending}
								aria-label="More availability actions"
							>
								<Icons.MoreHorizontal className="size-4" />
							</Button>
						</DropdownMenuTrigger>
					</PopoverTrigger>
				</ButtonGroup>
				<DropdownMenuContent
					align="end"
					onCloseAutoFocus={(event) => {
						if (openingCalendar.current) {
							event.preventDefault();
							openingCalendar.current = false;
							setCalendarOpen(true);
						}
					}}
				>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							Mark all as available
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className="max-h-72 overflow-y-auto">
							<DropdownMenuLabel>Suppliers</DropdownMenuLabel>
							{summary.isLoading || suppliers.isLoading ? (
								<DropdownMenuItem disabled>Loading suppliers…</DropdownMenuItem>
							) : summary.isError || suppliers.isError ? (
								<DropdownMenuItem
									onSelect={(event) => {
										event.preventDefault();
										void summary.refetch();
										void suppliers.refetch();
									}}
								>
									Retry suppliers and materials
								</DropdownMenuItem>
							) : (
								<>
									<DropdownMenuItem
										disabled={!summary.data?.canMarkAvailable}
										onSelect={() => chooseSupplier({ id: null, name: "N/A" })}
									>
										N/A
									</DropdownMenuItem>
									{suppliers.data?.map((value) => (
										<DropdownMenuItem
											key={value.id}
											disabled={!summary.data?.canMarkAvailable}
											onSelect={() => chooseSupplier(value)}
										>
											{value.name}
										</DropdownMenuItem>
									))}
									{!summary.data?.canMarkAvailable && (
										<DropdownMenuItem disabled>
											No materials available for this action
										</DropdownMenuItem>
									)}
								</>
							)}
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				</DropdownMenuContent>
			</DropdownMenu>
			<PopoverContent
				align="end"
				collisionPadding={16}
				sticky="always"
				className="w-auto max-w-[calc(100vw-2rem)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto p-0"
				onEscapeKeyDown={(event) => {
					if (save.isPending) event.preventDefault();
				}}
				onInteractOutside={(event) => {
					if (save.isPending) event.preventDefault();
				}}
			>
				<div className="space-y-1 border-b p-3">
					<h3 className="text-sm font-medium">Received date</h3>
					<p className="text-xs text-muted-foreground">
						{supplier.name} ·{" "}
						{snapshot.current?.needs.filter(
							(need) => need.qtyAvailableToMark > 0,
						).length ?? 0}{" "}
						items · {snapshot.current?.markableQty ?? 0} units
						{snapshot.current?.workerMode ? " for your assignments" : ""}
					</p>
					<p className="text-xs text-muted-foreground">
						Select a date, then double-click it to save.
					</p>
				</div>
				<Calendar
					mode="single"
					required
					selected={new Date(`${date}T12:00:00`)}
					defaultMonth={new Date(`${date}T12:00:00`)}
					disabled={(day) => save.isPending || calendarValue(day) > today}
					onSelect={(day) => setDate(calendarValue(day))}
					onDayClick={(day, modifiers, event) => {
						if (!modifiers.disabled && event.detail === 2)
							submit(calendarValue(day));
					}}
				/>
				{save.error && (
					<p role="alert" className="max-w-72 px-3 text-sm text-destructive">
						{save.error.message}
						<Button
							type="button"
							variant="outline"
							disabled={save.isPending || summary.isFetching}
							onClick={async () => {
								const fresh = await summary.refetch();
								if (fresh.data) {
									snapshot.current = fresh.data;
									save.reset();
								}
							}}
						>
							Refresh materials
						</Button>
					</p>
				)}
				<div className="flex justify-between gap-2 border-t p-3">
					<Button
						size="sm"
						variant="ghost"
						disabled={save.isPending}
						onClick={() => {
							setCalendarOpen(false);
							setMenuOpen(true);
						}}
					>
						Back
					</Button>
					<Button
						size="sm"
						disabled={save.isPending}
						onClick={() => submit(date)}
					>
						{save.isPending ? "Saving…" : "Save availability"}
					</Button>
				</div>
				{save.isPending && (
					<p role="status" className="sr-only">
						Saving availability
					</p>
				)}
			</PopoverContent>
		</Popover>
	);
}
