"use client";

import {
	getDefaultContractorAccountingPeriod,
	useContractorAccountingFilterParams,
} from "@/hooks/use-contractor-accounting-filter-params";
import { useTRPC } from "@/trpc/client";
import { formatMoneyCents } from "@gnd/contractor-accounting";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@gnd/ui/sheet";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useState } from "react";

const currency = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

function money(cents: number | null | undefined) {
	return currency.format(Number(formatMoneyCents(cents ?? 0)));
}

export function ContractorAccountingEntrySheet() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { params, setParams } = useContractorAccountingFilterParams();
	const id = params.entryId;
	const defaults = getDefaultContractorAccountingPeriod();
	const [reason, setReason] = useState("");
	const [effectiveDate, setEffectiveDate] = useState(defaults.to);
	const entry = useQuery(
		trpc.contractorAccounting.entry.queryOptions(
			{ id: id || "" },
			{ enabled: Boolean(id) },
		),
	);
	const reverse = useMutation(
		trpc.contractorAccounting.reverseEntry.mutationOptions({
			async onSuccess() {
				setReason("");
				toast({
					title: "Reversal posted",
					description:
						"The original entry remains intact with a linked reversal.",
				});
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.contractorAccounting.entries.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.contractorAccounting.summary.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.contractorAccounting.entry.queryKey(),
					}),
				]);
			},
			onError(error) {
				toast({
					variant: "error",
					title: "Reversal not posted",
					description: error.message,
				});
			},
		}),
	);
	const item = entry.data;

	return (
		<Sheet
			open={Boolean(id)}
			onOpenChange={(open) => {
				if (!open) void setParams({ entryId: null });
			}}
		>
			<SheetContent
				side="right"
				className="flex w-full flex-col p-0 sm:max-w-xl lg:max-w-2xl"
			>
				<SheetHeader className="border-b px-5 py-4 text-left">
					<div className="flex items-center gap-2">
						<SheetTitle>Ledger entry</SheetTitle>
						{item ? <Badge variant="secondary">{item.type}</Badge> : null}
					</div>
					<SheetDescription>
						Immutable accounting source, balance effect, and reversal trail.
					</SheetDescription>
				</SheetHeader>
				<ScrollArea className="min-h-0 flex-1">
					{entry.isPending ? (
						<div className="space-y-4 p-5">
							{["identity", "amounts", "source", "audit"].map((key) => (
								<div
									key={key}
									className="h-20 animate-pulse rounded-xl bg-muted"
								/>
							))}
						</div>
					) : entry.error ? (
						<div className="p-5 text-sm text-destructive">
							{entry.error.message}
						</div>
					) : !item ? (
						<div className="p-5 text-sm text-muted-foreground">
							Ledger entry not found.
						</div>
					) : (
						<div className="space-y-5 p-5">
							<div className="grid gap-3 sm:grid-cols-3">
								<MoneyTile label="Amount" value={money(item.amountCents)} />
								<MoneyTile
									label="Balance effect"
									value={money(item.liabilityDeltaCents)}
								/>
								<MoneyTile
									label="Balance after"
									value={money(item.balanceAfterCents)}
								/>
							</div>
							<section className="overflow-hidden rounded-xl border">
								<Detail
									label="Contractor"
									value={
										item.contractor?.name || `Contractor #${item.contractorId}`
									}
								/>
								<Detail
									label="Effective"
									value={new Date(item.effectiveAt).toLocaleString()}
								/>
								<Detail
									label="Description"
									value={item.description || "Not recorded"}
								/>
								<Detail
									label="Source"
									value={`${item.sourceType} · ${item.sourceId}`}
								/>
								<Detail label="Source key" value={item.sourceKey} mono />
								<Detail
									label="Posted"
									value={new Date(item.postedAt).toLocaleString()}
								/>
							</section>
							{item.reversalOf ? (
								<p className="rounded-xl border bg-muted/30 p-4 text-sm">
									This entry reverses {item.reversalOf.sourceKey}.
								</p>
							) : null}
							{item.reversedBy ? (
								<p className="rounded-xl border bg-muted/30 p-4 text-sm">
									Reversed on{" "}
									{new Date(item.reversedBy.effectiveAt).toLocaleDateString()}.
								</p>
							) : null}
							{!item.reversedBy && item.type !== "REVERSAL" ? (
								<section className="space-y-3 rounded-xl border p-4">
									<div>
										<h3 className="font-medium">Reverse this entry</h3>
										<p className="text-xs text-muted-foreground">
											Corrections post an equal and opposite linked entry.
										</p>
									</div>
									<Input
										type="date"
										value={effectiveDate}
										onChange={(event) => setEffectiveDate(event.target.value)}
									/>
									<Textarea
										value={reason}
										onChange={(event) => setReason(event.target.value)}
										placeholder="Required reversal reason"
									/>
									<Button
										variant="destructive"
										disabled={reverse.isPending || reason.trim().length < 3}
										onClick={() =>
											reverse.mutate({
												entryId: item.id,
												effectiveDate,
												timezone: defaults.timezone,
												reason,
											})
										}
									>
										{reverse.isPending ? "Posting…" : "Post reversal"}
									</Button>
								</section>
							) : null}
						</div>
					)}
				</ScrollArea>
			</SheetContent>
		</Sheet>
	);
}

function MoneyTile({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl border bg-card p-3">
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="mt-1 font-mono font-semibold">{value}</p>
		</div>
	);
}

function Detail({
	label,
	value,
	mono,
}: {
	label: string;
	value: string;
	mono?: boolean;
}) {
	return (
		<div className="grid gap-1 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[130px_1fr]">
			<p className="text-xs font-medium text-muted-foreground">{label}</p>
			<p className={mono ? "break-all font-mono text-xs" : "text-sm"}>
				{value}
			</p>
		</div>
	);
}
