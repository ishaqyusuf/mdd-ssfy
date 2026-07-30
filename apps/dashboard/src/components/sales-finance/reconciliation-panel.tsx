"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import type { SalesFinanceReconciliationResolution } from "@gnd/sales/payment-system";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { CircleAlert, CircleCheck, History, Loader2 } from "lucide-react";
import { useState } from "react";

type Transaction = NonNullable<
	RouterOutputs["salesFinance"]["transactionDetail"]
>;

const resolutionOptions = [
	{
		value: "verified",
		label: "Verified",
		description: "Evidence agrees with the source record.",
	},
	{
		value: "corrected_source",
		label: "Source corrected",
		description: "The underlying payment or application was corrected.",
	},
	{
		value: "accepted_legacy",
		label: "Accepted legacy evidence",
		description: "Legacy evidence was reviewed and accepted with explanation.",
	},
	{
		value: "duplicate_record",
		label: "Duplicate record",
		description: "The exception is explained by a confirmed duplicate.",
	},
] satisfies Array<{
	value: SalesFinanceReconciliationResolution;
	label: string;
	description: string;
}>;

function label(value: string) {
	return value
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function formatDate(value: string | Date | null | undefined) {
	if (!value) return "Date not recorded";
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? "Date not recorded"
		: date.toLocaleString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
				hour: "numeric",
				minute: "2-digit",
			});
}

export function SalesFinanceReconciliationPanel({
	transaction,
}: {
	transaction: Transaction;
}) {
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [note, setNote] = useState("");
	const [resolution, setResolution] =
		useState<SalesFinanceReconciliationResolution>("verified");

	async function invalidateFinance() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.salesFinance.transactionDetail.queryKey({
					id: transaction.id,
				}),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.salesFinance.transactions.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.salesFinance.summary.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.salesFinance.analytics.queryKey(),
			}),
		]);
	}

	const start = useMutation(
		trpc.salesFinance.reconciliationStart.mutationOptions({
			async onSuccess() {
				setNote("");
				toast({
					title: "Reconciliation opened",
					description:
						"The current exception evidence is now assigned an auditable review session.",
				});
				await invalidateFinance();
			},
			onError(error) {
				toast({
					variant: "error",
					title: "Unable to open reconciliation",
					description: error.message,
				});
			},
		}),
	);
	const resolve = useMutation(
		trpc.salesFinance.reconciliationResolve.mutationOptions({
			async onSuccess() {
				setNote("");
				toast({
					title: "Reconciliation resolved",
					description:
						"The transaction leaves the Review queue while its evidence remains unchanged.",
				});
				await invalidateFinance();
			},
			onError(error) {
				toast({
					variant: "error",
					title: "Unable to resolve reconciliation",
					description: error.message,
				});
			},
		}),
	);

	if (!transaction.rawNeedsReview) return null;

	const canReconcile = Boolean(auth.can?.editOrderPayment);
	const isOpen = transaction.reconciliationStatus === "in_progress";
	const isResolved = transaction.reconciliationStatus === "resolved";
	const pending = start.isPending || resolve.isPending;

	return (
		<section className="space-y-4 rounded-xl border p-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex min-w-0 items-start gap-3">
					{isResolved ? (
						<CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" />
					) : (
						<CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />
					)}
					<div>
						<h3 className="font-semibold">Reconciliation</h3>
						<p className="mt-1 text-sm text-muted-foreground">
							{isResolved
								? "Resolved against the current exception fingerprint."
								: isOpen
									? "A review session is open against the current evidence."
									: transaction.reconciliationStatus === "stale"
										? "The source evidence changed after the previous review."
										: "No reconciliation session has reviewed this evidence yet."}
						</p>
					</div>
				</div>
				<Badge
					variant={isResolved ? "secondary" : "outline"}
					className="capitalize"
				>
					{label(transaction.reconciliationStatus)}
				</Badge>
			</div>

			{canReconcile && !isOpen ? (
				<div className="space-y-3">
					<Textarea
						value={note}
						onChange={(event) => setNote(event.target.value)}
						placeholder="Optional opening note: what evidence will be checked?"
						maxLength={1_000}
					/>
					<Button
						type="button"
						variant={isResolved ? "outline" : "default"}
						disabled={pending}
						onClick={() =>
							start.mutate({
								id: transaction.id,
								note: note.trim() || null,
							})
						}
					>
						{pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
						{isResolved ? "Reopen reconciliation" : "Open reconciliation"}
					</Button>
				</div>
			) : null}

			{canReconcile && isOpen ? (
				<div className="space-y-3">
					<Select
						value={resolution}
						onValueChange={(value) =>
							setResolution(value as SalesFinanceReconciliationResolution)
						}
					>
						<SelectTrigger aria-label="Resolution type">
							<SelectValue placeholder="Select resolution" />
						</SelectTrigger>
						<SelectContent>
							{resolutionOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									<span className="block">{option.label}</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground">
						{
							resolutionOptions.find((option) => option.value === resolution)
								?.description
						}
					</p>
					<Textarea
						value={note}
						onChange={(event) => setNote(event.target.value)}
						placeholder="Required resolution evidence (at least 10 characters)"
						maxLength={2_000}
					/>
					<Button
						type="button"
						disabled={pending || note.trim().length < 10}
						onClick={() =>
							resolve.mutate({
								id: transaction.id,
								resolution,
								note: note.trim(),
							})
						}
					>
						{pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
						Resolve reconciliation
					</Button>
				</div>
			) : null}

			{!canReconcile ? (
				<p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
					You can inspect reconciliation evidence, but editing requires the
					Order Payment permission.
				</p>
			) : null}

			{transaction.reconciliationHistory.length ? (
				<div className="border-t pt-4">
					<div className="mb-3 flex items-center gap-2">
						<History className="size-4 text-muted-foreground" />
						<h4 className="text-sm font-medium">Audit history</h4>
					</div>
					<div className="space-y-3">
						{transaction.reconciliationHistory.map((event) => (
							<div
								key={event.id}
								className="rounded-lg border bg-muted/20 px-3 py-2"
							>
								<div className="flex items-center justify-between gap-3">
									<p className="text-sm font-medium capitalize">
										{label(event.action)}
										{event.resolution ? ` · ${label(event.resolution)}` : ""}
									</p>
									<p className="shrink-0 text-xs text-muted-foreground">
										{formatDate(event.createdAt)}
									</p>
								</div>
								{event.note ? (
									<p className="mt-1 text-sm text-muted-foreground">
										{event.note}
									</p>
								) : null}
							</div>
						))}
					</div>
				</div>
			) : null}
		</section>
	);
}
