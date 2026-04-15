"use client";

import { cn } from "@gnd/ui/cn";
import { Separator } from "@gnd/ui/separator";
import type { ChannelName } from "@notifications/channels";
import type { ReactNode } from "react";
import { ActivityHistory, type ActivityHistoryProps } from "./activity-history";
import { Chat, type ChatProps, type InboxContacts } from "./chat";

export type InboxChatProps = Omit<ChatProps, "children"> & {
	channel: ChannelName;
	payload?: Record<string, unknown>;
	contacts?: InboxContacts;
	placeholder?: string;
};

export interface InboxProps {
	children?: ReactNode;
	chatProps: InboxChatProps;
	activityHistoryProps?: ActivityHistoryProps;
	className?: string;
}

export function Inbox({
	children,
	chatProps,
	activityHistoryProps,
	className,
}: InboxProps) {
	const { placeholder = "Write a note...", ...chatComponentProps } = chatProps;

	return (
		<div className={cn("flex flex-col", className)}>
			<Chat {...chatComponentProps}>
				{children || (
					<>
						<Chat.Header>
							<div className="text-xs font-medium text-muted-foreground">
								AI Compose
							</div>
						</Chat.Header>
						<Chat.Content placeholder={placeholder} />
						<Chat.Footer>
							<Chat.ColorPicker />
							<div className="flex-1" />
							<Chat.SendButton />
						</Chat.Footer>
					</>
				)}
			</Chat>

			<Separator className="my-3" />

			<div>
				<ActivityHistory {...activityHistoryProps} />
			</div>
		</div>
	);
}
