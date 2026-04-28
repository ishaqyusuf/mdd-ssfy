"use client";

import { useMemo, useState } from "react";

import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
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
import { Label } from "@gnd/ui/label";
import { Textarea } from "@gnd/ui/textarea";
import { useQueryClient } from "@gnd/ui/tanstack";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SalesDocumentEmailDialogProps = {
	salesOrderId?: number | null;
	mode: "quote" | "invoice" | "packing-slip" | "production" | "order-packing";
	documentTitle: string;
	customerEmail?: string | null;
	customerName?: string | null;
	downloadUrl?: string | null;
	disabled?: boolean;
};

export function SalesDocumentEmailDialog({
	salesOrderId,
	mode,
	documentTitle,
	customerEmail,
	customerName,
	downloadUrl,
	disabled = false,
}: SalesDocumentEmailDialogProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [email, setEmail] = useState(customerEmail || "");
	const [note, setNote] = useState("");
	const notification = useNotificationTrigger({
		executingToast: "Sending email...",
		successToast: "Email sent.",
		errorToast: "Unable to send email.",
		onSuccess: async () => {
			setOpen(false);
			setNote("");
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: trpc.notes.activityTree.pathKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.notes.list.pathKey(),
				}),
			]);
		},
	});

	const isQuote = mode === "quote";
	const isEmailValid = EMAIL_RE.test(email.trim());
	const attachmentLabel = isQuote ? "Quote attached" : "Invoice attached";
	const canSend =
		!disabled &&
		!notification.isActionPending &&
		!!salesOrderId &&
		isEmailValid;
	const helperText = useMemo(() => {
		if (customerName?.trim()) {
			return `This email will be sent to ${customerName}. You can update the address before sending.`;
		}
		return "Enter the customer email address for this document.";
	}, [customerName]);

	return (
		<>
			<Button
				variant="outline"
				disabled={disabled || !salesOrderId}
				onClick={() => {
					setEmail(customerEmail || "");
					setOpen(true);
				}}
			>
				<Icons.Mail className="mr-2 size-4" />
				Email
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>Send {isQuote ? "Quote" : "Invoice"} Email</DialogTitle>
						<DialogDescription>{helperText}</DialogDescription>
					</DialogHeader>

					<div className="space-y-5">
						<div className="rounded-xl border bg-muted/25 p-4">
							<div className="flex items-start gap-3">
								<div className="flex size-10 items-center justify-center rounded-lg bg-background shadow-sm">
									<Icons.FileText className="size-4 text-muted-foreground" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium">{attachmentLabel}</p>
									<p className="truncate text-sm text-muted-foreground">
										{documentTitle}
									</p>
								</div>
								{downloadUrl ? (
									<Button variant="ghost" size="sm" asChild>
										<a href={downloadUrl}>Download</a>
									</Button>
								) : null}
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="sales-preview-email-address">Customer Email</Label>
							<Input
								id="sales-preview-email-address"
								type="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								placeholder="customer@example.com"
							/>
							{email.trim() && !isEmailValid ? (
								<p className="text-xs text-rose-600">
									Enter a valid email address.
								</p>
							) : null}
						</div>

						<div className="space-y-2">
							<Label htmlFor="sales-preview-email-note">Message</Label>
							<Textarea
								id="sales-preview-email-note"
								value={note}
								onChange={(event) => setNote(event.target.value)}
								placeholder="Add an extra note for the customer..."
								className="min-h-32"
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={notification.isActionPending}
						>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={!canSend}
							onClick={() => {
								if (!salesOrderId) return;
								notification.simpleSalesDocumentEmail({
									emailType: isQuote ? "without payment" : "with payment",
									printType: isQuote ? "quote" : "order",
									salesIds: [salesOrderId],
									customerEmail: email.trim(),
									note: note.trim() || undefined,
								});
							}}
						>
							{notification.isActionPending ? (
								<Icons.Loader2 className="mr-2 size-4 animate-spin" />
							) : (
								<Icons.Send className="mr-2 size-4" />
							)}
							Send Email
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
