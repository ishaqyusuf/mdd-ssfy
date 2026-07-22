"use client";

import { useMemo, useState } from "react";

import { SearchInput } from "@/components/search-input";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";

type TransferableSale = {
	id?: number | null;
	orderId?: string | null;
	salesRepId?: number | null;
	type?: string | null;
};

export function SalesRepTransferControl({
	sale,
}: {
	sale?: TransferableSale | null;
}) {
	const auth = useAuth();
	const trpc = useTRPC();
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
	const filteredSalesReps = useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) return salesReps.slice(0, 12);
		return salesReps
			.filter((rep) =>
				[rep.name, rep.email, ...rep.roles]
					.filter(
						(value): value is string =>
							typeof value === "string" && value.length > 0,
					)
					.some((value) => value.toLowerCase().includes(term)),
			)
			.slice(0, 12);
	}, [salesReps, search]);
	const selectedSalesRep = salesReps.find(
		(rep) => rep.id === selectedSalesRepId,
	);
	const transferMutation = useMutation(
		trpc.sales.transferSalesRep.mutationOptions({
			onSuccess: (result) => {
				if (result.changed) {
					toast({
						title: "Sales rep updated.",
						description: `${result.order.orderId} now belongs to ${result.salesRep.name}.`,
						variant: "success",
					});
				} else {
					toast({
						title: "Sales rep already assigned.",
						description: `${result.order.orderId} is already assigned to ${result.salesRep.name}.`,
					});
				}
				resetTransferState();
			},
			onError: (error) => {
				setPassword("");
				toast({
					title: "Unable to transfer sales rep.",
					description: error.message,
					variant: "destructive",
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

	if (!isOpen) {
		return (
			<Button
				type="button"
				size="sm"
				variant="outline"
				className="mt-3"
				onClick={() => setIsOpen(true)}
			>
				<Icons.UserPlus className="mr-2 size-4" />
				Change Rep
			</Button>
		);
	}

	return (
		<div className="mt-3 space-y-3 rounded-md border border-border/60 p-3">
			<div className="flex items-center justify-between gap-3">
				<p className="text-xs font-medium uppercase text-muted-foreground">
					Transfer {saleTypeLabel} to
				</p>
				<Button
					type="button"
					size="icon"
					variant="ghost"
					className="size-7"
					aria-label="Close sales rep transfer"
					onClick={resetTransferState}
				>
					<Icons.X className="size-4" />
				</Button>
			</div>

			<SearchInput
				placeholder="Search sales reps"
				value={search}
				onChangeText={setSearch}
			/>

			<div className="max-h-56 overflow-y-auto rounded-md border border-border/60">
				{salesRepsQuery.isPending ? (
					<div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
						<Icons.Loader2 className="size-4 animate-spin" />
						Loading reps
					</div>
				) : filteredSalesReps.length ? (
					filteredSalesReps.map((rep) => {
						const isCurrent = rep.id === currentSalesRepId;
						const isSelected = rep.id === selectedSalesRepId;

						return (
							<button
								key={rep.id}
								type="button"
								disabled={isCurrent || isPending}
								className={cn(
									"flex w-full items-center gap-3 border-b border-border/40 px-3 py-2 text-left last:border-b-0 hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-70",
									isSelected ? "bg-muted" : null,
								)}
								onClick={() => setSelectedSalesRepId(rep.id)}
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
							</button>
						);
					})
				) : (
					<div className="px-3 py-4 text-sm text-muted-foreground">
						No matching reps
					</div>
				)}
			</div>

			<textarea
				value={reason}
				maxLength={500}
				rows={2}
				placeholder="Optional note"
				className="min-h-16 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				onChange={(event) => setReason(event.target.value)}
			/>

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
					onClick={() => {
						if (!sale?.id || !selectedSalesRep) return;
						setIsPasswordOpen(true);
					}}
				>
					<Icons.UserCheck className="mr-2 size-4" />
					Transfer
				</Button>
			</div>

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
						className="space-y-4"
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
							<DialogTitle>Confirm Sales Rep Transfer</DialogTitle>
							<DialogDescription>
								Enter your password to move {sale?.orderId} to{" "}
								{selectedSalesRep?.name}.
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-2">
							<label
								htmlFor="sales-rep-transfer-password"
								className="text-sm font-medium"
							>
								Password
							</label>
							<Input
								id="sales-rep-transfer-password"
								type="password"
								autoComplete="current-password"
								value={password}
								disabled={isPending}
								onChange={(event) => setPassword(event.target.value)}
							/>
						</div>

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
									<Icons.Loader2 className="mr-2 size-4 animate-spin" />
								) : (
									<Icons.UserCheck className="mr-2 size-4" />
								)}
								Confirm Transfer
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
