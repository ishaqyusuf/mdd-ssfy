"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@gnd/ui/table";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useState } from "react";
import { DealerQuoteComposer } from "../dealer-sales-form/dealer-quote-composer";
import { formatCurrency, formatDate } from "./shared";

export function DealerSalesDocuments({ type }: { type: "order" | "quote" }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
	const documentsQuery = useQuery(
		trpc.dealerPortal.salesDocuments.queryOptions({ type }),
	);
	const convertQuote = useMutation(
		trpc.dealerPortal.convertQuoteToOrder.mutationOptions({
			onSuccess: async () => {
				setEditingQuoteId(null);
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.salesDocuments.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.dashboard.pathKey(),
					}),
				]);
				toast({
					title: "Quote converted to order.",
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Could not convert quote.",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const documents = documentsQuery.data ?? [];

	return (
		<div className="space-y-6">
			{type === "quote" ? (
				<DealerQuoteComposer
					editingQuoteId={editingQuoteId}
					onCancelEdit={() => setEditingQuoteId(null)}
				/>
			) : null}
			<section className="rounded-lg border bg-background">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{type === "quote" ? "Quote" : "Order"}</TableHead>
							<TableHead>Customer</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Total</TableHead>
							<TableHead>Balance</TableHead>
							<TableHead>Created</TableHead>
							{type === "quote" ? (
								<TableHead className="text-right">Actions</TableHead>
							) : null}
						</TableRow>
					</TableHeader>
					<TableBody>
						{documentsQuery.isPending ? (
							<TableRow>
								<TableCell
									className="h-24 text-center"
									colSpan={type === "quote" ? 7 : 6}
								>
									Loading {type === "quote" ? "quotes" : "orders"}...
								</TableCell>
							</TableRow>
						) : documents.length ? (
							documents.map((document) => (
								<TableRow key={document.id}>
									<TableCell className="font-medium">
										<div className="flex items-center gap-2">
											<FileText className="size-4 text-muted-foreground" />
											{document.orderId}
										</div>
									</TableCell>
									<TableCell>
										{document.customer?.businessName ||
											document.customer?.name ||
											document.customer?.email ||
											"-"}
									</TableCell>
									<TableCell>
										<Badge className="capitalize" variant="outline">
											{document.status || "open"}
										</Badge>
									</TableCell>
									<TableCell>{formatCurrency(document.grandTotal)}</TableCell>
									<TableCell>{formatCurrency(document.amountDue)}</TableCell>
									<TableCell>{formatDate(document.createdAt)}</TableCell>
									{type === "quote" ? (
										<TableCell className="text-right">
											<div className="flex justify-end gap-2">
												<Button
													onClick={() => setEditingQuoteId(document.id)}
													size="sm"
													type="button"
													variant="ghost"
												>
													Edit
												</Button>
												<Button
													disabled={convertQuote.isPending}
													onClick={() =>
														convertQuote.mutate({ id: document.id })
													}
													size="sm"
													type="button"
													variant="outline"
												>
													Convert to order
												</Button>
											</div>
										</TableCell>
									) : null}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									className="h-24 text-center"
									colSpan={type === "quote" ? 7 : 6}
								>
									No {type === "quote" ? "quotes" : "orders"} yet.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</section>
		</div>
	);
}
