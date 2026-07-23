"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { useTestEmailMode } from "@/store/test-email-mode";
import { useTRPC } from "@/trpc/client";
import { isValidCustomerPhoneNumber } from "@gnd/notifications/phone-number";
import type { SalesDocumentDeliveryChannel } from "@gnd/notifications/sales-document-message";
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
import { useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@gnd/ui/tooltip";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SalesDocumentEmailDialogProps = {
	salesOrderId?: number | null;
	mode: "quote" | "invoice" | "packing-slip" | "production" | "order-packing";
	documentTitle: string;
	orderNo?: string | null;
	customerEmail?: string | null;
	customerPhone?: string | null;
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
	customerPhone,
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
	const [phone, setPhone] = useState(customerPhone || "");
	const [channels, setChannels] = useState<SalesDocumentDeliveryChannel[]>([
		"email",
	]);
	const [subject, setSubject] = useState(buildDefaultSubject(orderNo));
	const [message, setMessage] = useState("");
	const [sendError, setSendError] = useState<string | null>(null);
	const open = controlledOpen ?? internalOpen;
	const setOpen = onOpenChange ?? setInternalOpen;
	const auth = useAuth();
	const testEmailMode = useTestEmailMode((store) => store.enabled);
	const shouldUseTestEmailMode =
		auth.roleTitle?.toLowerCase() === "super admin" && testEmailMode;
	const notification = useNotificationTrigger({
		monitor: true,
		silent: true,
		taskTitle: `Sending ${mode === "quote" ? "quote" : "invoice"}`,
		taskDescription: "Watch this document delivery in the task monitor.",
		onSuccess: async () => {
			setSendError(null);
			setOpen(false);
			setSubject(buildDefaultSubject(orderNo));
			setMessage("");
			setChannels(["email"]);
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: trpc.notes.activityTree.pathKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.notes.list.pathKey(),
				}),
			]);
		},
		onError: (message) => {
			setSendError(message || "Document delivery failed. Please try again.");
		},
	});

	const isQuote = mode === "quote";
	const isEmailValid = EMAIL_RE.test(email.trim());
	const isPhoneValid = isValidCustomerPhoneNumber(phone);
	const wantsEmail = channels.includes("email");
	const wantsPhone = channels.includes("whatsapp") || channels.includes("sms");
	const isSending =
		notification.isActionPending || notification.status === "SYNCING";
	const canSend =
		!disabled &&
		!isSending &&
		!!salesOrderId &&
		channels.length > 0 &&
		(!wantsEmail || (isEmailValid && subject.trim().length > 0)) &&
		(!wantsPhone || isPhoneValid);
	const helperText = useMemo(() => {
		if (customerName?.trim()) {
			return `Choose how to send this document to ${customerName}. Recipient details can be corrected before sending.`;
		}
		return "Choose a delivery channel and enter the customer contact details.";
	}, [customerName]);
	const defaultTrigger = (
		<Button
			variant="outline"
			size={triggerVariant === "icon" ? "icon" : "default"}
			disabled={disabled || !salesOrderId}
			onClick={() => {
				setEmail(customerEmail || "");
				setPhone(customerPhone || "");
				setChannels(["email"]);
				setSubject(buildDefaultSubject(orderNo));
				setMessage("");
				setSendError(null);
				setOpen(true);
			}}
			className={triggerVariant === "icon" ? "size-8 rounded-full" : undefined}
		>
			<Icons.Mail
				className={triggerVariant === "icon" ? "size-4" : "mr-2 size-4"}
			/>
			{triggerVariant === "icon" ? (
				<span className="sr-only">Send document</span>
			) : (
				"Send"
			)}
		</Button>
	);
	const trigger = customTrigger === undefined ? defaultTrigger : customTrigger;

	useEffect(() => {
		if (!open) return;
		setEmail(customerEmail || "");
		setPhone(customerPhone || "");
		setChannels(["email"]);
		setSubject(buildDefaultSubject(orderNo));
		setMessage("");
		setSendError(null);
	}, [customerEmail, customerPhone, open, orderNo]);

	useEffect(() => {
		if (!open) return;
		if (!customerEmail?.trim()) return;
		if (email.trim()) return;
		setEmail(customerEmail);
	}, [customerEmail, email, open]);

	return (
		<>
			{trigger === null ? null : triggerVariant === "icon" &&
				customTrigger === undefined ? (
				<Tooltip>
					<TooltipTrigger asChild>{trigger}</TooltipTrigger>
					<TooltipContent
						sideOffset={14}
						className="rounded-none px-2 py-1 font-medium text-[10px]"
					>
						Send document
					</TooltipContent>
				</Tooltip>
			) : (
				trigger
			)}

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>Send {isQuote ? "Quote" : "Invoice"}</DialogTitle>
						<DialogDescription>{helperText}</DialogDescription>
					</DialogHeader>

					<div className="space-y-5">
						<div className="rounded-xl border bg-muted/25 p-4">
							<div className="flex items-start gap-3">
								<div className="flex size-10 items-center justify-center rounded-lg bg-background shadow-sm">
									<Icons.FileText className="size-4 text-muted-foreground" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium">
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
							<Label>Delivery Channels</Label>
							<div className="grid grid-cols-3 gap-2">
								{(
									[
										["email", "Email", Icons.Mail],
										["whatsapp", "WhatsApp", Icons.WhatsApp],
										["sms", "SMS", Icons.Smartphone],
									] as const
								).map(([channel, label, ChannelIcon]) => {
									const selected = channels.includes(channel);
									const disabledChannel =
										channel !== "email" && !isPhoneValid && !selected;
									return (
										<Button
											key={channel}
											type="button"
											variant={selected ? "default" : "outline"}
											disabled={disabledChannel || isSending}
											onClick={() =>
												setChannels((current) =>
													current.includes(channel)
														? current.filter((item) => item !== channel)
														: [...current, channel],
												)
											}
											className="justify-start"
										>
											<ChannelIcon className="mr-2 size-4" />
											{label}
										</Button>
									);
								})}
							</div>
							{!isPhoneValid ? (
								<p className="text-xs text-muted-foreground">
									Add a valid customer phone number to enable WhatsApp and SMS.
								</p>
							) : null}
							{channels.length === 0 ? (
								<p className="text-xs text-rose-600">
									Select at least one delivery channel.
								</p>
							) : null}
						</div>

						<div className="space-y-2">
							<Label htmlFor="sales-preview-email-address">
								Customer Email
							</Label>
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
							<Label htmlFor="sales-preview-phone">Customer Phone</Label>
							<Input
								id="sales-preview-phone"
								type="tel"
								value={phone}
								onChange={(event) => setPhone(event.target.value)}
								placeholder="(305) 555-0100"
							/>
							{phone.trim() && !isPhoneValid ? (
								<p className="text-xs text-rose-600">
									Enter a valid phone number, including country code when
									outside the US.
								</p>
							) : null}
						</div>

						{wantsEmail ? (
							<div className="space-y-2">
								<Label htmlFor="sales-preview-email-subject">Subject</Label>
								<Input
									id="sales-preview-email-subject"
									value={subject}
									onChange={(event) => setSubject(event.target.value)}
									placeholder="Regarding your GND sales"
								/>
								{!subject.trim() ? (
									<p className="text-xs text-rose-600">
										Subject is required for email.
									</p>
								) : null}
							</div>
						) : null}

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
								Short document, acceptance, and payment links are included
								automatically when applicable.
							</p>
						</div>

						{sendError ? (
							<div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
								<Icons.AlertCircle className="mt-0.5 size-4 shrink-0" />
								<p>{sendError}</p>
							</div>
						) : null}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={isSending}
						>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={!canSend}
							onClick={() => {
								if (!salesOrderId) return;
								setSendError(null);
								notification.composedSalesDocumentEmail({
									printType: isQuote ? "quote" : "order",
									salesIds: [salesOrderId],
									customerEmail: email.trim() || undefined,
									customerPhone: phone.trim() || undefined,
									customerName: customerName?.trim() || undefined,
									subject: subject.trim(),
									message: message.trim() || undefined,
									channels,
									testEmailMode: wantsEmail && shouldUseTestEmailMode,
								});
							}}
						>
							{isSending ? (
								<Icons.Loader2 className="mr-2 size-4 animate-spin" />
							) : (
								<Icons.Send className="mr-2 size-4" />
							)}
							Send Document
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
