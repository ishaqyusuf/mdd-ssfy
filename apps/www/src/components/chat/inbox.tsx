"use client";

import { useTRPC } from "@/trpc/client";
import { Separator } from "@gnd/ui/separator";
import { cn } from "@gnd/ui/cn";
import { useQuery } from "@tanstack/react-query";
import type { ChannelName } from "@notifications/channels";
import { useMemo, type ReactNode } from "react";
import { ActivityHistory, type ActivityTagFilter } from "./activity-history";
import { Chat, type ChatProps, type InboxContacts } from "./chat";

export interface InboxProps extends Omit<ChatProps, "children"> {
  children?: ReactNode;
  channel: ChannelName;
  payload?: Record<string, unknown>;
  contacts?: InboxContacts;
  query?: {
    channel?: ChannelName;
    tags?: ActivityTagFilter[];
    contactId?: number;
    pageSize?: number;
    maxDepth?: number;
  };
  placeholder?: string;
  className?: string;
  historyClassName?: string;
}

export function Inbox({
  children,
  channel,
  payload = {},
  contacts,
  query,
  placeholder = "Write a note...",
  className,
  historyClassName,
  ...chatProps
}: InboxProps) {
  const trpc = useTRPC();

  const { data: notificationAccount } = useQuery(
    trpc.user.notificationAccount.queryOptions(),
  );

  const historyTags = useMemo(() => {
    if (query?.tags?.length) return query.tags;

    const tagFilters: ActivityTagFilter[] = [];
    for (const [tagName, value] of Object.entries(payload || {})) {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        tagFilters.push({
          tagName,
          tagValue: value,
        });
      }
    }
    return tagFilters;
  }, [payload, query?.tags]);

  return (
    <div className={cn("flex flex-col", className)}>
      <div className={cn("min-h-[220px] max-h-[420px] overflow-auto", historyClassName)}>
        <ActivityHistory
          channel={query?.channel ?? channel}
          tags={historyTags}
          contactId={query?.contactId || notificationAccount?.id}
          pageSize={query?.pageSize}
          maxDepth={query?.maxDepth}
          emptyText="Start this conversation"
        />
      </div>

      <Separator className="my-3" />

      <Chat
        channel={channel}
        payload={payload}
        contacts={contacts}
        {...chatProps}
      >
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
    </div>
  );
}
