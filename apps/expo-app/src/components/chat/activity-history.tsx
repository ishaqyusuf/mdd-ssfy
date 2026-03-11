import { useTRPC } from "@/trpc/client";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { type ReactNode, useMemo } from "react";
import { View } from "react-native";

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
  senderContactName?: string | null;
  tags: Record<string, unknown>;
  children: ActivityNode[];
};

export type ActivityHistoryProps = {
  channel?: string;
  tags?: ActivityTagFilter[];
  contactId?: number;
  pageSize?: number;
  maxDepth?: number;
  className?: string;
  emptyText?: string | null;
  emptyNode?: ReactNode;
};

function formatActivityDate(value: Date | string | null | undefined) {
  if (!value) return "No date";
  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return "No date";
  return format(dateValue, "PP, p");
}

function activityLabel(node: ActivityNode) {
  return node.headline || node.subject || "Activity";
}

function activityAuthor(node: ActivityNode) {
  return node.senderContactName || "Unknown";
}

function TimelineItem({
  node,
  depth = 0,
  isLatest,
  isLast,
}: {
  node: ActivityNode;
  depth?: number;
  isLatest?: boolean;
  isLast?: boolean;
}) {
  return (
    <View className={cn("relative pl-8", depth > 0 && "ml-4")}>
      {!isLast && (
        <View className="absolute left-[11px] top-4 bottom-[-32px] w-[2px] bg-white/10" />
      )}

      <View
        className={cn(
          "absolute left-0 top-1 h-6 w-6 rounded-full border-4 border-muted z-10",
          isLatest ? "bg-success" : "bg-muted-foreground",
        )}
      />
      <View className="absolute top-1 h-full w-[0.5px] bg-muted-foreground/30 my-2 left-[10px]" />

      <View className="flex-col pb-8">
        <View className="mb-0.5 flex-row items-start justify-between">
          <Text className="text-sm font-bold text-foreground">{activityLabel(node)}</Text>
          <Text className="text-[10px] font-medium uppercase text-muted-foreground">
            {formatActivityDate(node.createdAt)}
          </Text>
        </View>

        <Text className="mt-0.5 text-xs text-muted-foreground">
          by <Text className="font-semibold text-success">{activityAuthor(node)}</Text>
        </Text>

        {node.note ? (
          <View className="mt-3 rounded-lg border border-muted-foreground/20 bg-muted p-3">
            <Text className="text-xs italic leading-relaxed text-muted-foreground">{node.note}</Text>
          </View>
        ) : null}

        {node.children?.length ? (
          <View className="mt-3">
            {node.children.map((child, index) => (
              <TimelineItem
                key={`${node.id}-${child.id}`}
                node={child}
                depth={depth + 1}
                isLatest={false}
                isLast={index === node.children.length - 1}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
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
      <View className={cn("rounded-2xl bg-card p-4", className)}>
        <View className="gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className={cn("rounded-2xl bg-card p-6", className)}>
        <Text className="text-center text-sm text-muted-foreground">
          Unable to load activity history
        </Text>
      </View>
    );
  }

  const rows = (data?.data || []) as ActivityNode[];

  if (!rows.length) {
    if (emptyNode) return <>{emptyNode}</>;
    if (!emptyText) return null;

    return (
      <View className={cn("items-center rounded-2xl bg-card py-8", className)}>
        <View className="mb-3 size-10 items-center justify-center rounded-full bg-muted">
          <Icon name="Bell" className="text-muted-foreground" size={14} />
        </View>
        <Text className="text-sm text-muted-foreground">{emptyText}</Text>
      </View>
    );
  }

  return (
    <View className={cn("rounded-2xl bg-card p-4", className)}>
      {rows.map((item, index) => (
        <TimelineItem
          key={item.id}
          node={item}
          isLatest={index === 0}
          isLast={index === rows.length - 1}
        />
      ))}
    </View>
  );
}
