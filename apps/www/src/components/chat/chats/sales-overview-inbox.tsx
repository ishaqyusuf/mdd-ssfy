"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { DropdownMenu as Dropdown } from "@gnd/ui/namespace";
import {
	type ActivityHistoryNode,
	activityAnd,
	activityOr,
	activityTag,
} from "@notifications/activity-tree";
import { getChannelsOptionList, isChannelName } from "@notifications/channels";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ActivityHistory } from "../activity-history";
import { Chat, useChat } from "../chat";

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
	variant?: "all" | "inbound" | "activity";
};

function flattenActivityChannels(nodes: ActivityHistoryNode[]): string[] {
	const channelSet = new Set<string>();

	const visit = (items: ActivityHistoryNode[]) => {
		for (const item of items) {
			const value = item.tags?.channel;
			const channels = Array.isArray(value) ? value : value ? [value] : [];
			for (const channel of channels) {
				if (typeof channel === "string") {
					channelSet.add(channel);
				}
			}
			if (item.children?.length) {
				visit(item.children as ActivityHistoryNode[]);
			}
		}
	};

	visit(nodes);
	return Array.from(channelSet);
}

function filterActivityTreeByChannel(
	nodes: ActivityHistoryNode[],
	channel: string | null,
): ActivityHistoryNode[] {
	if (!channel) return nodes;

	return nodes.flatMap((node) => {
		const filteredChildren = filterActivityTreeByChannel(
			(node.children || []) as ActivityHistoryNode[],
			channel,
		);
		const value = node.tags?.channel;
		const channels = Array.isArray(value) ? value : value ? [value] : [];
		const matches = channels.includes(channel);

		if (!matches && !filteredChildren.length) {
			return [];
		}

		return [
			{
				...node,
				children: filteredChildren,
			},
		];
	});
}

function ActivityChannelFilter({
	value,
	onChange,
	channels,
}: {
	value: string | null;
	onChange: (value: string | null) => void;
	channels: string[];
}) {
	const options = channels
		.filter((channel) => isChannelName(channel))
		.map((channel) => getChannelsOptionList({ channel })[0])
		.filter(Boolean);
	const activeLabel =
		options.find((option) => option.value === value)?.label || "All channels";

	return (
		<Dropdown.Root>
			<Dropdown.Trigger asChild>
				<Button
					type="button"
					variant="outline"
					className="h-7 w-fit min-w-[150px] justify-between rounded-md px-2 shadow-none"
				>
					<span className="truncate">{activeLabel}</span>
					<Icons.ChevronDown className="size-3.5 text-muted-foreground" />
				</Button>
			</Dropdown.Trigger>
			<Dropdown.Content align="end">
				<Dropdown.Label>Filter activity</Dropdown.Label>
				<Dropdown.Separator />
				<Dropdown.Item onSelect={() => onChange(null)}>
					All channels
				</Dropdown.Item>
				{options.map((option) => (
					<Dropdown.Item
						key={option.value}
						onSelect={() => onChange(option.value)}
					>
						{option.label}
					</Dropdown.Item>
				))}
			</Dropdown.Content>
		</Dropdown.Root>
	);
}

export function SalesOverviewInbox({
	saleData,
	variant = "all",
}: SalesOverviewInboxProps) {
	if (!saleData?.id) return null;

	const trpc = useTRPC();
	const salesFilter = activityOr([
		activityTag("salesId", String(saleData.id)),
		activityTag("salesNo", String(saleData.orderId)),
	]);
	const isInboundOnly = variant === "inbound";
	const isActivityView = variant === "activity";
	const activityFilter = isInboundOnly
		? activityAnd([
				salesFilter,
				activityOr([
					activityTag("channel", "inventory_inbound"),
					activityTag("channel", "inventory_inbound_activity"),
				]),
			])
		: salesFilter;
	const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
	const activityQuery = useQuery(
		trpc.notes.activityTree.queryOptions({
			filter: activityFilter,
			tagFilterMode: "all",
			includeChildren: true,
			pageSize: 40,
			maxDepth: 4,
		}),
	);
	const activityRows = useMemo(
		() => (activityQuery.data?.data || []) as ActivityHistoryNode[],
		[activityQuery.data],
	);
	const fetchedChannels = useMemo(
		() => flattenActivityChannels(activityRows),
		[activityRows],
	);
	useEffect(() => {
		if (selectedChannel && !fetchedChannels.includes(selectedChannel)) {
			setSelectedChannel(null);
		}
	}, [fetchedChannels, selectedChannel]);
	const filteredActivityRows = useMemo(
		() =>
			isActivityView
				? filterActivityTreeByChannel(activityRows, selectedChannel)
				: activityRows,
		[activityRows, isActivityView, selectedChannel],
	);

	return (
		<div
			className={cn(
				"flex flex-col",
				isActivityView &&
					"h-[calc(100svh-15rem)] min-h-[28rem] overflow-hidden",
			)}
		>
			<div className={cn(isActivityView && "shrink-0 pb-3")}>
				<Chat
					channel={isInboundOnly ? "inventory_inbound" : "sales_info"}
					names={isInboundOnly ? ["inventory_inbound"] : channelNames}
					attachmentName="attachment"
					attachmentType="mixed"
					attachmentChannels={["inventory_inbound", "sales_info"]}
					multiAttachmentSupport
					payload={{
						salesId: saleData.id,
						salesNo: saleData.orderId,
					}}
					defaultPayloads={defaultPayloads}
					transformSubmitData={async (payload) => {
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
					}}
					placeholder={
						isInboundOnly
							? "Add an inbound update, receipt note, or receiving context..."
							: "Write a sales activity note..."
					}
					className={cn(!isActivityView && "mb-3")}
				>
					<SalesInboxComposer />
				</Chat>
			</div>
			<div className={cn(isActivityView && "min-h-0 flex-1 overflow-y-auto pr-1")}>
				<ActivityHistory
					data={filteredActivityRows}
					isPending={activityQuery.isPending}
					isError={activityQuery.isError}
					emptyText={isInboundOnly ? "No inbound activity yet" : null}
					headerAction={
						isActivityView && fetchedChannels.length ? (
							<ActivityChannelFilter
								value={selectedChannel}
								onChange={setSelectedChannel}
								channels={fetchedChannels}
							/>
						) : null
					}
					title={isActivityView ? "Activity History" : "Activity Timeline"}
					className={cn("min-h-[180px]")}
				/>
			</div>
		</div>
	);
}
