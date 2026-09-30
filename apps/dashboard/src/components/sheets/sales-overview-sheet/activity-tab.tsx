"use client";

import type { ChatDraft } from "@/components/chat/chat";
import { SalesOverviewInbox } from "@/components/chat/chats/sales-overview-inbox";
import { Button } from "@gnd/ui/button";
import Sheet from "@gnd/ui/custom/sheet-v2";
import { Icons } from "@gnd/ui/icons";
import type { RefObject } from "react";

import { useSaleOverview } from "./context";

export type SalesOverviewActivityProps = {
	draftRef?: RefObject<ChatDraft | null>;
	onOpenInbound?: (inboundId: number) => void;
};

export function SalesOverviewActivity(props: SalesOverviewActivityProps) {
	const { data } = useSaleOverview();
	if (!data?.id) return null;

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<SalesOverviewInbox
				saleData={{ id: data.id, orderId: data.orderId }}
				variant="activity"
				draftRef={props.draftRef}
				onOpenInbound={props.onOpenInbound}
			/>
		</div>
	);
}

export function SalesOverviewActivityPane({
	onClose,
	...props
}: SalesOverviewActivityProps & { onClose: () => void }) {
	return (
		<Sheet.SecondaryContent
			scrollable={false}
			Header={
				<Sheet.Header className="flex-row items-center justify-between gap-3 space-y-0">
					<Sheet.Title>Activity</Sheet.Title>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-7 shrink-0"
						onClick={onClose}
						aria-label="Close activity"
						title="Close activity"
					>
						<Icons.X className="size-4" />
					</Button>
				</Sheet.Header>
			}
		>
			<SalesOverviewActivity {...props} />
		</Sheet.SecondaryContent>
	);
}
