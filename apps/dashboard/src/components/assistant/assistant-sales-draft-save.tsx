"use client";

import { useDebounce } from "@/hooks/use-debounce";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Input } from "@gnd/ui/input";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { useQuery } from "@gnd/ui/tanstack";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";

const money = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

export function AssistantSalesDraftSave({
	conversationId,
	generationId,
	type,
	disabled,
	onSaved,
}: {
	conversationId: string;
	generationId: string;
	type: "order" | "quote";
	disabled?: boolean;
	onSaved: () => void;
}) {
	const trpc = useTRPC();
	const client = useTRPCClient();
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const query = useDebounce(search, 250);
	const [customerId, setCustomerId] = useState<number | null>(null);
	const [review, setReview] =
		useState<RouterOutputs["assistant"]["prepareSalesDraft"]["review"]>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const customers = useQuery(
		trpc.newSalesForm.searchCustomers.queryOptions(
			{
				query,
				recent: !query.trim(),
				type,
				limit: 10,
			},
			{ enabled: open && !review },
		),
	);
	async function prepare(selectedCustomerId: number) {
		setCustomerId(selectedCustomerId);
		setBusy(true);
		setError(null);
		try {
			const result = await client.assistant.prepareSalesDraft.mutate({
				conversationId,
				generationId,
				customerId: selectedCustomerId,
			});
			if (result.savedSale) {
				setOpen(false);
				onSaved();
			} else setReview(result.review);
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "The draft could not be prepared.",
			);
		} finally {
			setBusy(false);
		}
	}
	async function save() {
		if (!review || !customerId || busy) return;
		setBusy(true);
		setError(null);
		try {
			await client.assistant.saveSalesDraft.mutate({
				conversationId,
				generationId,
				customerId,
				revision: review.revision,
			});
			setOpen(false);
			onSaved();
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "The draft could not be saved.",
			);
		} finally {
			setBusy(false);
		}
	}
	return (
		<>
			<Button
				type="button"
				size="sm"
				variant="outline"
				className="mt-3"
				disabled={disabled}
				onClick={() => setOpen(true)}
			>
				Review and save {type}
			</Button>
			<Dialog
				open={open}
				onOpenChange={(value) => {
					if (!busy) setOpen(value);
				}}
			>
				<DialogContent className="sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>
							{review ? `Review ${type} draft` : `Select customer for ${type}`}
						</DialogTitle>
						<DialogDescription>
							{review
								? "Save as a draft. You can finish editing in the Sales form."
								: "Choose the customer for this request."}
						</DialogDescription>
					</DialogHeader>
					{!review ? (
						<>
							<Input
								aria-label="Search customers"
								placeholder="Search customers…"
								value={search}
								disabled={busy}
								onChange={(event) => setSearch(event.target.value)}
							/>
							<ScrollArea className="h-64" hideScrollbar>
								<div className="space-y-1">
									{customers.data?.map((customer) => (
										<Button
											key={customer.id}
											type="button"
											variant="ghost"
											className="h-auto w-full justify-start px-3 py-2 text-left"
											disabled={busy}
											onClick={() => void prepare(customer.id)}
										>
											<span>
												<span className="block">
													{customer.businessName ||
														customer.name ||
														`Customer ${customer.id}`}
												</span>
												<span className="block text-xs text-muted-foreground">
													{[customer.name, customer.phoneNo, `#${customer.id}`]
														.filter(Boolean)
														.join(" · ")}
												</span>
											</span>
										</Button>
									))}
									{customers.isPending ? (
										<p className="p-3 text-sm text-muted-foreground">
											Loading customers…
										</p>
									) : null}
									{customers.isError ? (
										<p role="alert" className="p-3 text-sm text-destructive">
											{customers.error.message}
										</p>
									) : null}
									{customers.data?.length === 0 ? (
										<p className="p-3 text-sm text-muted-foreground">
											No customers found.
										</p>
									) : null}
								</div>
							</ScrollArea>
						</>
					) : (
						<>
							<div className="flex items-center justify-between gap-3">
								<p className="font-medium">{review.customer.name}</p>
								<Button
									type="button"
									size="sm"
									variant="ghost"
									disabled={busy}
									onClick={() => {
										setReview(null);
										setError(null);
									}}
								>
									Change customer
								</Button>
							</div>
							<ScrollArea
								className="max-h-[45vh] [&>div]:max-h-[45vh]"
								hideScrollbar
							>
								<div className="space-y-3 pr-3">
									{review.lineItems.map((line) => (
										<div key={line.uid} className="border-b pb-3">
											<div className="flex justify-between gap-4 text-sm">
												<span>
													{line.quantity} × {line.title}
												</span>
												<span className="shrink-0 tabular-nums">
													{money.format(line.total)}
												</span>
											</div>
											{line.details.map((detail, index) => (
												<p
													key={`${index}-${detail}`}
													className="mt-1 text-xs text-muted-foreground"
												>
													{detail}
												</p>
											))}
										</div>
									))}
									{review.notes.length ? (
										<div className="rounded-md bg-muted p-3 text-sm">
											<p className="mb-1 font-medium">For review</p>
											{review.notes.map((note, index) => (
												<p key={`${index}-${note}`}>{note}</p>
											))}
										</div>
									) : null}
								</div>
							</ScrollArea>
							<div className="space-y-1 text-sm text-muted-foreground">
								<div className="flex justify-between">
									<span>Subtotal</span>
									<span>{money.format(review.subtotal)}</span>
								</div>
								{(review.extraCosts ?? []).map((cost) => (
									<div key={cost.label} className="flex justify-between">
										<span>{cost.label}</span>
										<span>{money.format(cost.amount)}</span>
									</div>
								))}
								{review.taxTotal > 0 ? (
									<div className="flex justify-between">
										<span>Tax</span>
										<span>{money.format(review.taxTotal)}</span>
									</div>
								) : null}
								{review.cardFee > 0 ? (
									<div className="flex justify-between">
										<span>Credit card fee</span>
										<span>{money.format(review.cardFee)}</span>
									</div>
								) : null}
							</div>
							<div className="flex justify-between font-medium">
								<span>Total</span>
								<span>{money.format(review.total)}</span>
							</div>
							<Button
								type="button"
								size="sm"
								disabled={busy || disabled}
								onClick={() => void save()}
							>
								{busy ? "Saving…" : `Save ${type} draft`}
							</Button>
						</>
					)}
					{busy && !review ? (
						<p role="status" className="flex items-center gap-2 text-sm">
							<LoaderCircle size={16} className="animate-spin" />
							Preparing draft…
						</p>
					) : null}
					{error ? (
						<div role="alert" className="text-sm text-destructive">
							<p>{error}</p>
							{review && customerId ? (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									disabled={busy}
									onClick={() => void prepare(customerId)}
								>
									Refresh review
								</Button>
							) : null}
						</div>
					) : null}
				</DialogContent>
			</Dialog>
		</>
	);
}
