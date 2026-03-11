import { type ReactNode } from "react";
import { View } from "react-native";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";
import type { ChannelName } from "@notifications/channels";
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
    <View className={cn("flex-col", className)}>
      <ActivityHistory {...activityHistoryProps} />

      <View className="my-3 h-px bg-border/70" />

      <Chat {...chatComponentProps}>
        {children || (
          <>
            <Chat.Header>
              <Text className="text-xs font-medium text-muted-foreground">AI Compose</Text>
            </Chat.Header>
            <Chat.Content placeholder={placeholder} />
            <Chat.Footer>
              <Chat.ColorPicker />
              <View className="flex-1" />
              <Chat.SendButton />
            </Chat.Footer>
          </>
        )}
      </Chat>
    </View>
  );
}
