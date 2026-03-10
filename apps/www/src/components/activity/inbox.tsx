"use client";

import { useTRPC } from "@/trpc/client";
import { cn } from "@gnd/ui/cn";
import { getColorFromName } from "@gnd/utils/colors";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Separator } from "@gnd/ui/separator";
import { Textarea } from "@gnd/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ActivityHistory, type ActivityTagFilter } from "./activity-history";
import type { ChannelName } from "@notifications/channels";

type InboxContact = {
    id: number;
    role?: "employee" | "customer";
};

type InboxContactGroup = {
    ids: number[];
    role?: "employee" | "customer";
};

type InboxContacts =
    | InboxContact[]
    | InboxContactGroup[]
    | {
          employee?: number[];
          customer?: number[];
      };

export interface InboxProps {
    channel: ChannelName;
    payload?: Record<string, unknown>;
    contacts?: InboxContacts;
    contactId?: number;
    subject?: string;
    headline?: string;
    placeholder?: string;
    className?: string;
    onSent?: () => void;
}

const palette = ["#00A9FE", "#00D084", "#FF6900", "#EB144C", "#8A2BE2"];

function normalizeContacts(contacts?: InboxContacts): InboxContactGroup[] {
    if (!contacts) return [];

    if (Array.isArray(contacts)) {
        return contacts
            .map((item) => {
                if ("ids" in item) {
                    return {
                        role: item.role || "employee",
                        ids: item.ids || [],
                    };
                }
                return {
                    role: item.role || "employee",
                    ids: [item.id],
                };
            })
            .filter((group) => group.ids.length > 0);
    }

    return [
        {
            role: "employee",
            ids: contacts.employee || [],
        },
        {
            role: "customer",
            ids: contacts.customer || [],
        },
    ].filter((group) => group.ids.length > 0);
}

export function Inbox({
    channel,
    payload = {},
    contacts,
    contactId,
    subject,
    headline,
    placeholder = "Write a note...",
    className,
    onSent,
}: InboxProps) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const [message, setMessage] = useState("");
    const [noteColor, setNoteColor] = useState(getColorFromName(channel));

    const normalizedContacts = useMemo(
        () => normalizeContacts(contacts),
        [contacts],
    );

    const { data: notificationAccount } = useQuery(
        trpc.user.notificationAccount.queryOptions(),
    );

    const historyTags = useMemo(() => {
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
    }, [payload]);

    const mutation = useMutation(
        trpc.notes.createInboxActivity.mutationOptions({
            onSuccess: () => {
                setMessage("");
                onSent?.();
                queryClient.invalidateQueries({
                    queryKey: trpc.notes.activityTree.pathKey(),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.notes.list.pathKey(),
                });
                toast.success("Message sent");
            },
            onError: (error) => {
                toast.error(error.message || "Failed to send message");
            },
        }),
    );

    function submit() {
        const trimmed = message.trim();
        const hasPayload = Object.keys(payload || {}).length > 0;

        if (!trimmed && !hasPayload) {
            toast.error("Message is empty");
            return;
        }

        mutation.mutate({
            channel,
            payload,
            contacts: normalizedContacts,
            subject,
            headline,
            message: trimmed || undefined,
            noteColor,
        });
    }

    return (
        <div className={cn("flex flex-col", className)}>
            <div className="min-h-[220px] max-h-[420px] overflow-auto">
                <ActivityHistory
                    channel={channel}
                    tags={historyTags}
                    contactId={contactId || notificationAccount?.id}
                    emptyText="Start this conversation"
                />
            </div>

            <Separator className="my-3" />

            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Icons.Notifications className="size-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                        Note color
                    </span>
                    <div className="flex items-center gap-1.5">
                        {palette.map((color) => (
                            <button
                                key={color}
                                type="button"
                                className={cn(
                                    "size-4 rounded-full transition-transform",
                                    noteColor === color && "scale-110 ring-1 ring-border",
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => setNoteColor(color)}
                                aria-label={`Select ${color} note color`}
                            />
                        ))}
                    </div>
                </div>

                <Textarea
                    value={message}
                    placeholder={placeholder}
                    onChange={(event) => setMessage(event.target.value)}
                    className="min-h-[84px]"
                />

                <div className="flex items-center justify-end">
                    <Button
                        type="button"
                        onClick={submit}
                        disabled={mutation.isPending}
                        className="gap-2"
                    >
                        <Icons.ArrowOutward className="size-4" />
                        <span>Send</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
