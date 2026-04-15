"use client";

import {
	activityAnd,
	activityOr,
	activityTag,
} from "@notifications/activity-tree";
import { Chat, useChat } from "../chat";
import { Inbox } from "../inbox";

const channelNames = [
	"sales_info",
	"inventory_inbound",
	// "simple_sales_email_reminder"
] as const;

const paymentLinkOptions = [
	{ label: "None", value: "none" },
	{ label: "25%", value: "25" },
	{ label: "50%", value: "50" },
	{ label: "75%", value: "75" },
	{ label: "Yes", value: "full" },
];

const invoiceDownloadOptions = [
	{ label: "Yes", value: "yes" },
	{ label: "No", value: "no" },
];

const defaultPayloads = {
	simple_sales_email_reminder: {
		paymentLinkOption: "none",
		invoiceDownload: "no",
	},
};

function SalesInboxComposer() {
	const chat = useChat();
	const isReminderChannel =
		chat.state.channel === "simple_sales_email_reminder";
	const isInventoryInboundChannel = chat.state.channel === "inventory_inbound";

	return (
		<>
			<Chat.Header>
				<Chat.ChannelsOption names={channelNames} />
			</Chat.Header>

			<Chat.Content
				placeholder={
					isReminderChannel
						? "Add internal note for this reminder (optional)..."
						: isInventoryInboundChannel
							? "Add an inbound receiving note or receipt context..."
							: "Write a sales activity note..."
				}
			/>
			<Chat.Footer>
				<Chat.ColorPicker />
				<Chat.PayloadOption
					show={isReminderChannel}
					required={isReminderChannel}
					name="paymentLinkOption"
					label="payment link"
					options={paymentLinkOptions}
				/>
				<Chat.PayloadOption
					show={isReminderChannel}
					required={isReminderChannel}
					name="invoiceDownload"
					label="invoice pdf"
					options={invoiceDownloadOptions}
				/>
				<div className="flex-1" />
				<Chat.SendButton
					label={
						isReminderChannel
							? "Send reminder"
							: isInventoryInboundChannel
								? "Send inbound note"
								: "Send note"
					}
				/>
			</Chat.Footer>
		</>
	);
}

type SalesOverviewInboxProps = {
	saleData?: {
		id?: number | string | null;
		orderId?: number | string | null;
	} | null;
	variant?: "all" | "inbound";
};

export function SalesOverviewInbox({
	saleData,
	variant = "all",
}: SalesOverviewInboxProps) {
	if (!saleData?.id) return null;

	const salesFilter = activityOr([
		activityTag("salesId", String(saleData.id)),
		activityTag("salesNo", String(saleData.orderId)),
	]);
	const isInboundOnly = variant === "inbound";
	const activityFilter = isInboundOnly
		? activityAnd([
				salesFilter,
				activityOr([
					activityTag("channel", "inventory_inbound"),
					activityTag("channel", "inventory_inbound_activity"),
				]),
			])
		: salesFilter;

	return (
		<Inbox
			activityHistoryProps={{
				emptyText: isInboundOnly ? "No inbound activity yet" : null,
				filter: activityFilter,
			}}
			chatProps={{
				channel: isInboundOnly ? "inventory_inbound" : "sales_info",
				names: isInboundOnly ? ["inventory_inbound"] : channelNames,
				attachmentName: "attachment",
				attachmentType: "image",
				attachmentChannels: ["inventory_inbound"],
				multiAttachmentSupport: true,
				payload: {
					salesId: saleData.id,
					salesNo: saleData.orderId,
				},
				defaultPayloads,
				transformSubmitData: async (payload) => {
					const paymentLinkOption = payload.paymentLinkOption;
					const invoiceDownload = payload.invoiceDownload;
					const isReminderTransform =
						typeof paymentLinkOption === "string" ||
						typeof invoiceDownload === "string";

					if (!isReminderTransform || !saleData?.id) {
						return {};
					}

					const payPlanMap: Record<string, 25 | 50 | 75 | 100 | null> = {
						none: null,
						"25": 25,
						"50": 50,
						"75": 75,
						full: 100,
					};

					return {
						salesId: saleData.id,
						payPlan: payPlanMap[paymentLinkOption] ?? null,
						attachInvoice: invoiceDownload === "yes",
					};
				},
				placeholder: isInboundOnly
					? "Add an inbound update, receipt note, or receiving context..."
					: "Write a sales activity note...",
			}}
		>
			<SalesInboxComposer />
		</Inbox>
	);
}
