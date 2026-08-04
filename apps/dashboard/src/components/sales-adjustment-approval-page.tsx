"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { useState } from "react";

function money(value: unknown) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

export function SalesAdjustmentApprovalPage({ token }: { token: string }) {
	const trpc = useTRPC();
	const [note, setNote] = useState("");
	const approval = useQuery(
		trpc.newSalesForm.getAdjustmentApproval.queryOptions({ token }),
	);
	const respond = useMutation(
		trpc.newSalesForm.respondAdjustmentApproval.mutationOptions({
			onSuccess: () => approval.refetch(),
		}),
	);
	const data = approval.data;

	if (approval.isPending) {
		return (
			<div className="mx-auto mt-20 h-64 max-w-2xl animate-pulse rounded-2xl bg-muted" />
		);
	}
	if (approval.error || !data) {
		return (
			<div className="mx-auto mt-20 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
				This approval request is unavailable or has expired.
			</div>
		);
	}

	const adjustment = data.adjustment;
	const pending =
		data.status === "PENDING" && new Date(data.expiresAt) > new Date();
	return (
		<main className="min-h-screen bg-slate-50 px-4 py-10">
			<div className="mx-auto max-w-2xl space-y-5">
				<div>
					<p className="text-sm font-medium text-slate-500">
						Sale {adjustment.order.orderId}
					</p>
					<h1 className="text-2xl font-semibold text-slate-950">
						Review requested quantity change
					</h1>
					<p className="mt-2 text-sm text-slate-600">
						The sale will remain unchanged unless you approve this exact
						before-and-after snapshot.
					</p>
				</div>
				<Card>
					<CardHeader className="flex-row items-center justify-between">
						<CardTitle className="text-lg">Change summary</CardTitle>
						<Badge variant="outline">{data.status}</Badge>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
							<div>
								<p className="text-slate-500">Previous total</p>
								<p className="font-semibold">
									{money(adjustment.beforeGrandTotal)}
								</p>
							</div>
							<div>
								<p className="text-slate-500">New total</p>
								<p className="font-semibold">
									{money(adjustment.proposedGrandTotal)}
								</p>
							</div>
							<div>
								<p className="text-slate-500">Amount due</p>
								<p className="font-semibold">
									{money(adjustment.amountDueAfter)}
								</p>
							</div>
							<div>
								<p className="text-slate-500">Wallet credit</p>
								<p className="font-semibold text-emerald-700">
									{money(adjustment.walletCreditAmount)}
								</p>
							</div>
						</div>
						<div className="overflow-hidden rounded-xl border">
							<div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b bg-slate-50 px-4 py-2 text-xs text-slate-500">
								<span>Item</span>
								<span>Previous</span>
								<span>New</span>
							</div>
							{adjustment.lines.map((line) => (
								<div
									key={line.id}
									className="grid grid-cols-[1fr_auto_auto] gap-3 border-b px-4 py-3 text-sm last:border-0"
								>
									<span className="font-medium">{line.title}</span>
									<span>{Number(line.beforeQty)}</span>
									<span className="font-semibold">
										{Number(line.proposedQty)}
									</span>
								</div>
							))}
						</div>
						{adjustment.reason ? (
							<div className="rounded-xl bg-slate-50 p-3 text-sm">
								<p className="text-xs font-medium text-slate-500">Reason</p>
								<p className="mt-1">{adjustment.reason}</p>
							</div>
						) : null}
						{pending ? (
							<div className="space-y-3">
								<Textarea
									value={note}
									onChange={(event) => setNote(event.target.value)}
									placeholder="Optional response note"
								/>
								<div className="grid grid-cols-2 gap-3">
									<Button
										variant="outline"
										disabled={respond.isPending}
										onClick={() =>
											respond.mutate({
												token,
												decision: "REJECT",
												note: note || null,
												userAgent: navigator.userAgent,
											})
										}
									>
										Reject
									</Button>
									<Button
										disabled={respond.isPending}
										onClick={() =>
											respond.mutate({
												token,
												decision: "APPROVE",
												note: note || null,
												userAgent: navigator.userAgent,
											})
										}
									>
										{respond.isPending ? "Submitting…" : "Approve change"}
									</Button>
								</div>
							</div>
						) : (
							<p className="rounded-xl bg-slate-100 p-3 text-sm">
								This request has already been {data.status.toLowerCase()}.
							</p>
						)}
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
