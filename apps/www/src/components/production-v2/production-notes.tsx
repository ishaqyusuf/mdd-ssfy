"use client";

import { Inbox } from "@/components/chat/inbox";
import { activityAnd, activityTag } from "@notifications/activity-tree";

const orderChannelNames = ["sales_info"] as const;
const itemChannelNames = ["sales_item_info"] as const;

type ProductionOrderNotesProps = {
	salesId: number;
	salesNo: string;
};

type ProductionItemNoteContext = {
	salesId: number;
	salesNo: string;
	itemId: number;
	itemControlId: number;
};

type ProductionItemNotesProps = {
	context: ProductionItemNoteContext;
};

export function ProductionOrderNotes({
	salesId,
	salesNo,
}: ProductionOrderNotesProps) {
	return (
		<Inbox
			className="gap-1"
			activityHistoryProps={{
				channel: "sales_info",
				emptyText: "No order activity yet",
				filter: activityAnd([
					activityTag("salesId", salesId),
					activityTag("salesNo", salesNo),
				]),
			}}
			chatProps={{
				channel: "sales_info",
				names: orderChannelNames,
				payload: {
					salesId,
					salesNo,
				},
				placeholder: "Write an order note...",
			}}
		/>
	);
}

export function ProductionItemNotes({ context }: ProductionItemNotesProps) {
	return (
		<Inbox
			className="gap-1"
			activityHistoryProps={{
				channel: "sales_item_info",
				emptyText: "No item activity yet",
				filter: activityAnd([
					activityTag("salesId", context.salesId),
					activityTag("salesNo", context.salesNo),
					activityTag("itemId", context.itemId),
					activityTag("itemControlId", context.itemControlId),
				]),
			}}
			chatProps={{
				channel: "sales_item_info",
				names: itemChannelNames,
				payload: {
					salesId: context.salesId,
					salesNo: context.salesNo,
					itemId: context.itemId,
					itemControlId: context.itemControlId,
				},
				placeholder: "Write a production item note...",
			}}
		/>
	);
}
