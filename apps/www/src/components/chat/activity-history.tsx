"use client";

import { useTRPC } from "@/trpc/client";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Separator } from "@gnd/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { getColorFromName, hexToRgba } from "@gnd/utils/colors";
import { useMemo, type ReactNode } from "react";

export type ActivityTagFilter = {
  tagName: string;
  tagValue: unknown;
};

type ActivityNode = {
  id: number;
  createdAt: Date | string | null;
  subject: string | null;
  headline: string | null;
  note: string | null;
  tags: Record<string, unknown>;
  children: ActivityNode[];
};

export interface ActivityHistoryProps {
  channel?: string;
  tags?: ActivityTagFilter[];
  contactId?: number;
  pageSize?: number;
  maxDepth?: number;
  className?: string;
  emptyText?: string | null;
  emptyNode?: ReactNode;
}

function formatActivityDate(value: Date | string | null | undefined) {
  if (!value) return "No date";
  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(dateValue);
}

function activityLabel(node: ActivityNode) {
  return node.headline || node.subject || "Activity";
}

function activityNote(node: ActivityNode) {
  return node.note || "";
}

function channelColor(node: ActivityNode) {
  const value =
    typeof node.tags?.noteColor === "string"
      ? node.tags.noteColor
      : typeof node.tags?.channel === "string"
        ? node.tags.channel
        : typeof node.tags?.type === "string"
          ? node.tags.type
          : "activity";

  if (typeof value === "string" && value.startsWith("#")) return value;
  return getColorFromName(value);
}

function ActivityTreeItem({
  node,
  depth = 0,
}: {
  node: ActivityNode;
  depth?: number;
}) {
  const color = channelColor(node);
  const hasChildren = node.children.length > 0;
  const indentClass = depth > 0 ? "pl-5" : "";
  const note = activityNote(node);

  return (
    <div className={cn("py-2", indentClass)}>
      <div className="grid grid-cols-[14px_1fr] gap-2.5">
        <div className="relative pt-1">
          <span className="absolute left-[4px] top-4 bottom-[-10px] w-px bg-border/60" />
          <span
            className="absolute left-0 top-1.5 size-2.5 rounded-full ring-2 ring-background"
            style={{
              backgroundColor: color,
            }}
          />
        </div>
        <div className="min-w-0 rounded-lg border border-border/50 bg-card/70 px-2.5 py-2 shadow-sm">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-5">
              {activityLabel(node)}
            </p>
            <span className="shrink-0 text-[10px] text-muted-foreground/90">
              {formatActivityDate(node.createdAt)}
            </span>
          </div>
          {!!note && (
            <p
              className="mt-1.5 whitespace-pre-wrap rounded-md px-2 py-1 text-[13px] leading-5 text-muted-foreground"
              style={{
                backgroundColor: hexToRgba(color, 0.08),
              }}
            >
              {note}
            </p>
          )}
        </div>
      </div>

      {hasChildren && (
        <div className="mt-1 space-y-0.5">
          {node.children.map((child) => (
            <ActivityTreeItem key={`${node.id}-${child.id}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ActivityHistory({
  channel,
  tags = [],
  contactId,
  pageSize = 40,
  maxDepth = 4,
  className,
  emptyText = "No activity yet",
  emptyNode,
}: ActivityHistoryProps) {
  const trpc = useTRPC();
  const tagFilters = useMemo(
    () => [
      ...(tags || []),
      ...(channel ? ([{ tagName: "channel", tagValue: channel }] as ActivityTagFilter[]) : []),
    ],
    [channel, tags],
  );

  const { data, isPending, isError } = useQuery(
    trpc.notes.activityTree.queryOptions({
      ...(contactId ? { contactIds: [contactId] } : {}),
      ...(tagFilters.length ? { tagFilters } : {}),
      tagFilterMode: "all",
      includeChildren: true,
      pageSize,
      maxDepth,
    }),
  );

  if (isPending) {
    return (
      <div className={cn("space-y-2.5", className)}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-lg border border-border/50 bg-muted/30" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn("py-6 text-center text-sm text-muted-foreground", className)}>
        Unable to load activity history
      </div>
    );
  }

  const rows = (data?.data || []) as ActivityNode[];

  if (!rows.length) {
    if (emptyNode) return <>{emptyNode}</>;
    if (!emptyText) return null;
    return (
      <div className={cn("py-10 text-center", className)}>
        <div className="mx-auto mb-2 flex size-8 items-center justify-center rounded-full border border-border/60 bg-muted/30">
          <Icons.Notifications className="size-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-0.5", className)}>
      {rows.map((item, index) => (
        <div key={item.id}>
          <ActivityTreeItem node={item} />
          {index < rows.length - 1 && <Separator className="my-0.5" />}
        </div>
      ))}
      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Icons.Notifications className="size-3.5" />
        <span>Activity chain</span>
      </div>
    </div>
  );
}
