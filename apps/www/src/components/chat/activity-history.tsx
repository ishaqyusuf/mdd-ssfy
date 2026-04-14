"use client";

import { env } from "@/env.mjs";
import { useTRPC } from "@/trpc/client";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import {
	type ActivityTagFilterNode,
	type ActivityTagFilter as SharedActivityTagFilter,
	activityAnd,
	activityTag,
} from "@notifications/activity-tree";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { type ReactNode, useMemo } from "react";

export type ActivityTagFilter = SharedActivityTagFilter;

type ActivityNode = {
	id: number;
	createdAt: Date | string | null;
	subject: string | null;
	headline: string | null;
	description: string | null;
	note: string | null;
	senderContactName?: string | null;
	tags: Record<string, unknown>;
	children: ActivityNode[];
};

export interface ActivityHistoryProps {
	channel?: string;
	tags?: ActivityTagFilter[];
	filter?: ActivityTagFilterNode;
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

function activityHeadline(node: ActivityNode) {
	return node.subject || "Activity";
}

function activityDescription(node: ActivityNode) {
	return node.headline || node.description || null;
}

function activityAuthor(node: ActivityNode) {
	return node.senderContactName || "Unknown";
}

function activityAttachments(node: ActivityNode) {
	const attachment = node.tags?.attachment;
	if (!attachment) return [];
	return Array.isArray(attachment) ? attachment : [attachment];
}

function ActivityTreeItem({
	node,
	depth = 0,
	isLatest = false,
}: {
	node: ActivityNode;
	depth?: number;
	isLatest?: boolean;
}) {
	const attachments = activityAttachments(node);

	return (
		<div className={cn("relative pl-8", depth > 0 && "ml-4")}>
			{isLatest ? (
				<div className="absolute left-0 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border-4 border-card bg-green-500">
					<Icons.CheckCircle2 size={12} className="text-white" />
				</div>
			) : (
				<div className="absolute left-0 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border-4 border-card bg-muted">
					<div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
				</div>
			)}

			<p className="text-xs font-bold text-muted-foreground">
				{formatActivityDate(node.createdAt)}
			</p>
			<p className="text-sm font-semibold text-foreground">
				{activityHeadline(node)}
			</p>
			{activityDescription(node) ? (
				<p className="mt-1 text-sm text-muted-foreground">
					{activityDescription(node)}
				</p>
			) : null}
			<p className="mt-1 text-sm text-muted-foreground">
				By{" "}
				<span className="font-semibold text-foreground">
					{activityAuthor(node)}
				</span>
			</p>
			{node.note ? (
				<div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
					<p className="text-sm leading-6 text-foreground/90">{node.note}</p>
				</div>
			) : null}
			{attachments.length ? (
				<div className="mt-3 flex flex-wrap gap-2">
					{attachments.map((pathname) => (
						<a
							key={`${pathname}-${String(node.id)}`}
							href={`${env.NEXT_PUBLIC_VERCEL_BLOB_URL}/${pathname}`}
							target="_blank"
							rel="noreferrer"
							className="overflow-hidden rounded-lg border bg-muted/30"
						>
							<Image
								src={`${env.NEXT_PUBLIC_VERCEL_BLOB_URL}/${pathname}`}
								alt={pathname}
								width={72}
								height={72}
								className="h-[72px] w-[72px] object-cover"
							/>
						</a>
					))}
				</div>
			) : null}

			{node.children?.length ? (
				<div className="mt-4 space-y-6">
					{node.children.map((child) => (
						<ActivityTreeItem
							key={`${node.id}-${child.id}`}
							node={child}
							depth={depth + 1}
							isLatest={false}
						/>
					))}
				</div>
			) : null}
		</div>
	);
}

export function ActivityHistory({
	channel,
	tags = [],
	filter,
	contactId,
	pageSize = 40,
	maxDepth = 4,
	className,
	emptyText = "No activity yet",
	emptyNode,
}: ActivityHistoryProps) {
	const trpc = useTRPC();

	const activityFilter = useMemo(() => {
		const baseFilters: ActivityTagFilterNode[] = [
			...tags,
			...(channel ? [activityTag("channel", channel)] : []),
		];

		if (filter && baseFilters.length) {
			return activityAnd([filter, ...baseFilters]);
		}

		if (filter) return filter;
		if (!baseFilters.length) return undefined;
		if (baseFilters.length === 1) return baseFilters[0];
		return activityAnd(baseFilters);
	}, [channel, filter, tags]);

	const { data, isPending, isError } = useQuery(
		trpc.notes.activityTree.queryOptions({
			...(contactId ? { contactIds: [contactId] } : {}),
			...(activityFilter ? { filter: activityFilter } : {}),
			tagFilterMode: "all",
			includeChildren: true,
			pageSize,
			maxDepth,
		}),
	);

	if (isPending) {
		return (
			<div className={cn("space-y-6", className)}>
				<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
					Activity Timeline
				</h4>
				{["timeline-1", "timeline-2", "timeline-3"].map((key) => (
					<div
						key={key}
						className="h-16 animate-pulse rounded-lg bg-muted/40"
					/>
				))}
			</div>
		);
	}

	if (isError) {
		return (
			<div className={cn("py-6", className)}>
				<h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
					Activity Timeline
				</h4>
				<p className="text-center text-sm text-muted-foreground">
					Unable to load activity history
				</p>
			</div>
		);
	}

	const rows = (data?.data || []) as ActivityNode[];

	if (!rows.length) {
		if (emptyNode) return <>{emptyNode}</>;
		if (!emptyText) return null;

		return (
			<div className={cn("py-8", className)}>
				<h4 className="mb-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
					Activity Timeline
				</h4>
				<div className="flex flex-col items-center">
					<div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
						<Icons.Notifications className="size-4 text-muted-foreground" />
					</div>
					<p className="text-sm text-muted-foreground">{emptyText}</p>
				</div>
			</div>
		);
	}

	return (
		<div className={cn(className)}>
			<h4 className="mb-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
				Activity Timeline
			</h4>
			<div className="relative space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-border">
				{rows.map((item, index) => (
					<ActivityTreeItem key={item.id} node={item} isLatest={index === 0} />
				))}
			</div>
		</div>
	);
}
