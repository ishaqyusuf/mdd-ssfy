"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@gnd/ui/tooltip";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SalesDocumentEmailDialogProps = {
	salesOrderId?: number | null;
	mode: "quote" | "invoice" | "packing-slip" | "production" | "order-packing";
	documentTitle: string;
	orderNo?: string | null;
	customerEmail?: string | null;
	customerName?: string | null;
	downloadUrl?: string | null;
	disabled?: boolean;
	triggerVariant?: "default" | "icon";
	trigger?: ReactNode | null;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
};

function buildDefaultSubject(orderNo?: string | null) {
	const normalizedOrderNo = orderNo?.trim();
	return normalizedOrderNo
		? `Regarding your GND sales #${normalizedOrderNo}`
		: "Regarding your GND sales document";
}

export function SalesDocumentEmailDialog({
	salesOrderId,
	mode,
	documentTitle,
	orderNo,
	customerEmail,
	customerName,
	downloadUrl,
	disabled = false,
	triggerVariant = "default",
	trigger: customTrigger,
	open: controlledOpen,
	onOpenChange,
}: SalesDocumentEmailDialogProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [internalOpen, setInternalOpen] = useState(false);
	const [email, setEmail] = useState(customerEmail || "");
	const [subject, setSubject] = useState(buildDefaultSubject(orderNo));
	const [message, setMessage] = useState("");
	const [attachSalesPdf, setAttachSalesPdf] = useState(true);
	const open = controlledOpen ?? internalOpen;
	const setOpen = onOpenChange ?? setInternalOpen;
	const notification = useNotificationTrigger({
		executingToast: "Sending email...",
		successToast: "Email sent.",
		errorToast: "Unable to send email.",
		onSuccess: async () => {
			setOpen(false);
			setSubject(buildDefaultSubject(orderNo));
			setMessage("");
			setAttachSalesPdf(true);
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
	const attachmentLabel = "Attach sales PDF";
	const canSend =
		!disabled &&
		!notification.isActionPending &&
		!!salesOrderId &&
		isEmailValid &&
		subject.trim().length > 0;
	const helperText = useMemo(() => {
		if (customerName?.trim()) {
			return `This email will be sent to ${customerName}. You can update the address and subject before sending.`;
		}
		return "Enter the customer email address and subject for this document.";
	}, [customerName]);
	const defaultTrigger = (
		<Button
			variant="outline"
			size={triggerVariant === "icon" ? "icon" : "default"}
			disabled={disabled || !salesOrderId}
			onClick={() => {
				setEmail(customerEmail || "");
				setSubject(buildDefaultSubject(orderNo));
				setMessage("");
				setAttachSalesPdf(true);
				setOpen(true);
			}}
			className={triggerVariant === "icon" ? "size-8 rounded-full" : undefined}
		>
			<Icons.Mail
				className={triggerVariant === "icon" ? "size-4" : "mr-2 size-4"}
			/>
			{triggerVariant === "icon" ? (
				<span className="sr-only">Email</span>
			) : (
				"Email"
			)}
		</Button>
	);
	const trigger = customTrigger === undefined ? defaultTrigger : customTrigger;

	useEffect(() => {
		if (!open) return;
		setEmail(customerEmail || "");
		setSubject(buildDefaultSubject(orderNo));
		setMessage("");
		setAttachSalesPdf(true);
	}, [customerEmail, open, orderNo]);

	useEffect(() => {
		if (!open) return;
		if (!customerEmail?.trim()) return;
		if (email.trim()) return;
		setEmail(customerEmail);
	}, [customerEmail, email, open]);

	return (
		<>
			{trigger === null ? null : triggerVariant === "icon" && customTrigger === undefined ? (
				<Tooltip>
					<TooltipTrigger asChild>{trigger}</TooltipTrigger>
					<TooltipContent
						sideOffset={14}
						className="rounded-none px-2 py-1 font-medium text-[10px]"
					>
						Email
					</TooltipContent>
				</Tooltip>
			) : (
				trigger
			)}

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>Compose {isQuote ? "Quote" : "Invoice"} Email</DialogTitle>
						<DialogDescription>{helperText}</DialogDescription>
					</DialogHeader>

					<div className="space-y-5">
						<div className="rounded-xl border bg-muted/25 p-4">
							<div className="flex items-start gap-3">
								<div className="flex size-10 items-center justify-center rounded-lg bg-background shadow-sm">
									<Icons.FileText className="size-4 text-muted-foreground" />
								</div>
								<div className="min-w-0 flex-1">
									<div className="flex items-start gap-3">
										<Checkbox
											id="sales-preview-attach-pdf"
											checked={attachSalesPdf}
											onCheckedChange={(checked) =>
												setAttachSalesPdf(checked === true)
											}
										/>
										<div>
											<Label
												htmlFor="sales-preview-attach-pdf"
												className="text-sm font-medium"
											>
												{attachmentLabel}
											</Label>
											<p className="truncate text-sm text-muted-foreground">
												{documentTitle}
											</p>
										</div>
									</div>
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
							<Label htmlFor="sales-preview-email-subject">Subject</Label>
							<Input
								id="sales-preview-email-subject"
								value={subject}
								onChange={(event) => setSubject(event.target.value)}
								placeholder="Regarding your GND sales"
							/>
							{!subject.trim() ? (
								<p className="text-xs text-rose-600">Subject is required.</p>
							) : null}
						</div>

						<div className="space-y-2">
							<Label htmlFor="sales-preview-email-message">Message</Label>
							<Textarea
								id="sales-preview-email-message"
								value={message}
								onChange={(event) => setMessage(event.target.value)}
								placeholder="Write your message to the customer..."
								className="min-h-32"
							/>
							<p className="text-xs text-muted-foreground">
								If this sale has an outstanding balance, a payment button will be
								included automatically.
							</p>
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
								notification.composedSalesDocumentEmail({
									printType: isQuote ? "quote" : "order",
									salesIds: [salesOrderId],
									customerEmail: email.trim(),
									customerName: customerName?.trim() || undefined,
									subject: subject.trim(),
									message: message.trim() || undefined,
									attachSalesPdf,
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
