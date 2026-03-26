"use client";

import { Inbox } from "@/components/chat/inbox";
import {
	activityAnd,
	activityOr,
	activityTag,
} from "@notifications/activity-tree";

const orderChannelNames = ["sales_info"] as const;
const itemChannelNames = ["sales_item_info"] as const;

type ProductionOrderNotesProps = {
	salesId: number;
	salesNo: string;
	scope: "worker" | "admin";
};

type ProductionItemNoteContext = {
	salesId: number;
	salesNo: string;
	itemId: number;
	itemControlId: number;
};

type ProductionItemNotesProps = {
	context: ProductionItemNoteContext;
	title: string;
	description?: string | null;
};

export function ProductionOrderNotes({
	salesId,
	salesNo,
	scope,
}: ProductionOrderNotesProps) {
	const filter =
		scope === "worker"
			? activityOr([
					activityAnd([
						activityTag("channel", "sales_info"),
						activityOr([
							activityTag("salesId", salesId),
							activityTag("salesNo", salesNo),
						]),
					]),
					activityAnd([
						activityTag("channel", "sales_item_info"),
						activityOr([
							activityTag("salesId", salesId),
							activityTag("salesNo", salesNo),
						]),
					]),
				])
			: activityOr([
					activityTag("salesId", salesId),
					activityTag("salesNo", salesNo),
				]);

	return (
		<Inbox
			className="gap-1"
			activityHistoryProps={{
				emptyText: "No order activity yet",
				filter,
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

export function ProductionItemNotes({
	context,
	title,
	description,
}: ProductionItemNotesProps) {
	const headline = [title, description].filter(Boolean).join(" | ");

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
					headline,
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
