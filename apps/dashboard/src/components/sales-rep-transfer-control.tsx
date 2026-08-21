"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@gnd/ui/command";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@gnd/ui/field";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

type TransferableSale = {
	id?: number | null;
	orderId?: string | null;
	salesRepId?: number | null;
	type?: string | null;
};

export function SalesRepTransferControl({
	sale,
	presentation = "inline",
}: {
	sale?: TransferableSale | null;
	presentation?: "inline" | "popover";
}) {
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [selectedSalesRepId, setSelectedSalesRepId] = useState<number | null>(
		null,
	);
	const [reason, setReason] = useState("");
	const [isPasswordOpen, setIsPasswordOpen] = useState(false);
	const [password, setPassword] = useState("");
	const currentSalesRepId = sale?.salesRepId ?? null;
	const currentUserId = Number(auth?.id || 0) || null;
	const canTransfer =
		!!sale?.id && currentUserId !== null && currentSalesRepId === currentUserId;
	const saleTypeLabel = sale?.type === "quote" ? "quote" : "order";
	const salesRepsQuery = useQuery(
		trpc.sales.salesRepOptions.queryOptions(
			{ salesId: sale?.id ?? undefined },
			{
				enabled: canTransfer && isOpen && !!sale?.id,
				staleTime: 5 * 60 * 1000,
			},
		),
	);
	const resetTransferState = () => {
		setIsOpen(false);
		setIsPasswordOpen(false);
		setSearch("");
		setSelectedSalesRepId(null);
		setReason("");
		setPassword("");
	};
	const salesReps = salesRepsQuery.data ?? [];
	const selectedSalesRep = salesReps.find(
		(rep) => rep.id === selectedSalesRepId,
	);
	const transferMutation = useMutation(
		trpc.sales.transferSalesRep.mutationOptions({
			async onSuccess(result) {
				await queryClient.invalidateQueries({
					queryKey: trpc.sales.getSaleOverview.queryKey({
						orderNo: result.order.orderId,
						salesType: sale?.type === "quote" ? "quote" : "order",
					}),
				});
				if (result.changed) {
					toast.success("Sales rep updated", {
						description: `${result.order.orderId} now belongs to ${result.salesRep.name}.`,
					});
				} else {
					toast("Sales rep already assigned", {
						description: `${result.order.orderId} is already assigned to ${result.salesRep.name}.`,
					});
				}
				resetTransferState();
			},
			onError(error) {
				setPassword("");
				toast.error("Unable to transfer sales rep", {
					description: error.message,
				});
			},
		}),
	);

	if (!canTransfer) return null;

	const isPending = transferMutation.isPending;
	const canSubmit =
		!!sale?.id &&
		!!selectedSalesRep &&
		selectedSalesRep.id !== currentSalesRepId &&
		!isPending;
	const trigger = (
		<Button
			type="button"
			size={presentation === "popover" ? "xs" : "sm"}
			variant="outline"
			className={presentation === "inline" ? "mt-3" : undefined}
			onClick={presentation === "inline" ? () => setIsOpen(true) : undefined}
		>
			<Icons.UserPlus data-icon="inline-start" />
			Change rep
		</Button>
	);
	const picker = (
		<div
			className={cn(
				"flex flex-col gap-3",
				presentation === "inline" &&
					"mt-3 rounded-md border border-border/60 p-3",
			)}
		>
			<div className="flex items-center justify-between gap-3">
				<p className="text-xs font-medium uppercase text-muted-foreground">
					Transfer {saleTypeLabel} to
				</p>
				{presentation === "inline" ? (
					<Button
						type="button"
						size="icon-xs"
						variant="ghost"
						aria-label="Close sales rep transfer"
						onClick={resetTransferState}
					>
						<Icons.X aria-hidden="true" />
					</Button>
				) : null}
			</div>

			<Command className="rounded-md border border-border/60">
				<CommandInput
					placeholder="Search sales reps"
					value={search}
					onValueChange={setSearch}
				/>
				<CommandList className="max-h-56">
					{salesRepsQuery.isPending ? (
						<div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
							<Icons.Loader2 className="size-4 animate-spin" />
							Loading reps
						</div>
					) : (
						<>
							<CommandEmpty>No matching reps</CommandEmpty>
							<CommandGroup>
								{salesReps.map((rep) => {
									const isCurrent = rep.id === currentSalesRepId;
									const isSelected = rep.id === selectedSalesRepId;

									return (
										<CommandItem
											key={rep.id}
											value={`${rep.id} ${rep.name} ${rep.email || ""} ${rep.roles.join(" ")}`}
											disabled={isCurrent || isPending}
											aria-selected={isSelected}
											className={cn(
												"flex items-center gap-3 px-3 py-2",
												isSelected && "bg-muted",
											)}
											onSelect={() => setSelectedSalesRepId(rep.id)}
										>
											<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
												{rep.initials}
											</span>
											<span className="min-w-0 flex-1">
												<span className="block truncate text-sm font-medium">
													{rep.name}
												</span>
												{rep.email ? (
													<span className="block truncate text-xs text-muted-foreground">
														{rep.email}
													</span>
												) : null}
											</span>
											{isCurrent ? (
												<Badge variant="outline">Current</Badge>
											) : isSelected ? (
												<Icons.CheckCircle2 className="size-4 text-primary" />
											) : null}
										</CommandItem>
									);
								})}
							</CommandGroup>
						</>
					)}
				</CommandList>
			</Command>

			<FieldGroup className="gap-3">
				<Field>
					<FieldLabel htmlFor="sales-rep-transfer-reason" className="sr-only">
						Optional transfer note
					</FieldLabel>
					<Textarea
						id="sales-rep-transfer-reason"
						value={reason}
						maxLength={500}
						rows={2}
						placeholder="Optional note"
						className="min-h-16 resize-none"
						onChange={(event) => setReason(event.target.value)}
					/>
				</Field>
			</FieldGroup>

			<div className="flex justify-end gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					disabled={isPending}
					onClick={resetTransferState}
				>
					Cancel
				</Button>
				<Button
					type="button"
					size="sm"
					disabled={!canSubmit}
					onClick={() => setIsPasswordOpen(true)}
				>
					<Icons.UserCheck data-icon="inline-start" />
					Transfer
				</Button>
			</div>
		</div>
	);

	return (
		<>
			{presentation === "popover" ? (
				<Popover
					open={isOpen}
					onOpenChange={(open) => {
						if (isPending) return;
						if (open) setIsOpen(true);
						else if (!isPasswordOpen) resetTransferState();
					}}
				>
					<PopoverTrigger asChild>{trigger}</PopoverTrigger>
					<PopoverContent align="start" className="w-96">
						{picker}
					</PopoverContent>
				</Popover>
			) : isOpen ? (
				picker
			) : (
				trigger
			)}

			<Dialog
				open={isPasswordOpen}
				onOpenChange={(open) => {
					if (isPending) return;
					setIsPasswordOpen(open);
					if (!open) setPassword("");
				}}
			>
				<DialogContent className="sm:max-w-md">
					<form
						className="flex flex-col gap-4"
						onSubmit={(event) => {
							event.preventDefault();
							if (!sale?.id || !selectedSalesRep || !password) return;
							transferMutation.mutate({
								salesId: sale.id,
								salesRepId: selectedSalesRep.id,
								reason: reason.trim() || null,
								password,
							});
						}}
					>
						<DialogHeader>
							<DialogTitle>Confirm sales rep transfer</DialogTitle>
							<DialogDescription>
								Enter your password to move {sale?.orderId} to{" "}
								{selectedSalesRep?.name}.
							</DialogDescription>
						</DialogHeader>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="sales-rep-transfer-password">
									Password
								</FieldLabel>
								<Input
									id="sales-rep-transfer-password"
									type="password"
									autoComplete="current-password"
									value={password}
									disabled={isPending}
									onChange={(event) => setPassword(event.target.value)}
								/>
							</Field>
						</FieldGroup>
						<DialogFooter>
							<Button
								type="button"
								variant="ghost"
								disabled={isPending}
								onClick={() => {
									setIsPasswordOpen(false);
									setPassword("");
								}}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={!canSubmit || !password || isPending}
							>
								{isPending ? (
									<Icons.Loader2
										data-icon="inline-start"
										className="animate-spin"
									/>
								) : (
									<Icons.UserCheck data-icon="inline-start" />
								)}
								Confirm transfer
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}
