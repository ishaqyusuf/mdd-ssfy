"use client";

import { env } from "@/env.mjs";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@gnd/ui/alert-dialog";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import {
	type ActivityTagFilterNode,
	type ActivityTagFilter as SharedActivityTagFilter,
	activityAnd,
	activityTag,
} from "@notifications/activity-tree";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { type ReactNode, useMemo, useState } from "react";

export type ActivityTagFilter = SharedActivityTagFilter;

type ActivityNode = {
	id: number;
	createdAt: Date | string | null;
	subject: string | null;
	headline: string | null;
	description: string | null;
	note: string | null;
	senderContactName?: string | null;
	senderProfileId?: number | null;
	deletedAt?: Date | string | null;
	tags: Record<string, unknown>;
	children: ActivityNode[];
};

export type ActivityHistoryNode = ActivityNode;

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
	data?: ActivityNode[];
	isPending?: boolean;
	isError?: boolean;
	title?: ReactNode;
	headerAction?: ReactNode;
	onOpenActivity?: (node: ActivityNode) => void;
	canManageManualNotes?: boolean;
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

function getAttachmentKind(pathname: string) {
	const extension = pathname.split(".").pop()?.toLowerCase();
	if (
		["png", "jpg", "jpeg", "gif", "webp", "heic", "heif", "avif"].includes(
			extension ?? "",
		)
	) {
		return "image";
	}
	if (extension === "pdf") return "pdf";
	return "file";
}

function ActivityTreeItem({
	node,
	depth = 0,
	isLatest = false,
	onOpenActivity,
	onEditNote,
	onDeleteNote,
	canManageNote,
}: {
	node: ActivityNode;
	depth?: number;
	isLatest?: boolean;
	onOpenActivity?: (node: ActivityNode) => void;
	onEditNote?: (node: ActivityNode) => void;
	onDeleteNote?: (node: ActivityNode) => void;
	canManageNote?: (node: ActivityNode) => boolean;
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
			<div className="flex items-start justify-between gap-3">
				<p className="text-sm font-semibold text-foreground">
					{activityHeadline(node)}
				</p>
				{onOpenActivity && node.tags?.type === "inventory_inbound_activity" ? (
					<button
						type="button"
						className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						onClick={() => onOpenActivity(node)}
					>
						Open inbound
						<Icons.ExternalLink className="size-3.5" />
					</button>
				) : null}
				{canManageNote?.(node) ? (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="size-8"
								aria-label="Manage note"
							>
								<Icons.MoreHorizontal className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onSelect={() => onEditNote?.(node)}>
								<Icons.Edit className="mr-2 size-4" />
								Edit note
							</DropdownMenuItem>
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onSelect={() => onDeleteNote?.(node)}
							>
								<Icons.Trash className="mr-2 size-4" />
								Delete note
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}
			</div>
			{node.deletedAt ? (
				<Badge
					variant="outline"
					className="mt-2 border-destructive/30 text-destructive"
				>
					Deleted · audit only
				</Badge>
			) : null}
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
					<p
						className={cn(
							"text-sm leading-6 text-foreground/90",
							node.deletedAt && "line-through opacity-70",
						)}
					>
						{node.note}
					</p>
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
							{getAttachmentKind(pathname) === "image" ? (
								<Image
									src={`${env.NEXT_PUBLIC_VERCEL_BLOB_URL}/${pathname}`}
									alt={pathname}
									width={72}
									height={72}
									className="h-[72px] w-[72px] object-cover"
								/>
							) : (
								<div className="flex h-[72px] w-[180px] items-center gap-2 px-3">
									<Icons.FileText className="size-5 shrink-0 text-muted-foreground" />
									<div className="min-w-0">
										<p className="truncate text-xs font-medium text-foreground">
											{pathname.split("/").pop()}
										</p>
										<p className="text-[11px] uppercase tracking-wide text-muted-foreground">
											{getAttachmentKind(pathname) === "pdf" ? "PDF" : "File"}
										</p>
									</div>
								</div>
							)}
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
							onOpenActivity={onOpenActivity}
							onEditNote={onEditNote}
							onDeleteNote={onDeleteNote}
							canManageNote={canManageNote}
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
	data,
	isPending: isPendingOverride,
	isError: isErrorOverride,
	title = "Activity Timeline",
	headerAction,
	onOpenActivity,
	canManageManualNotes = true,
}: ActivityHistoryProps) {
	const trpc = useTRPC();
	const auth = useAuth();
	const queryClient = useQueryClient();
	const [editingNode, setEditingNode] = useState<ActivityNode | null>(null);
	const [deletingNode, setDeletingNode] = useState<ActivityNode | null>(null);
	const [draftNote, setDraftNote] = useState("");
	const invalidateActivity = () =>
		queryClient.invalidateQueries({
			queryKey: trpc.notes.activityTree.pathKey(),
		});
	const updateNote = useMutation(
		trpc.notes.updateManualActivityNote.mutationOptions({
			onSuccess: async () => {
				await invalidateActivity();
				setEditingNode(null);
				toast({
					title: "Activity note updated",
					description:
						"The previous version was retained in its audit history.",
					variant: "success",
				});
			},
			onError: (error) =>
				toast({
					title: "Unable to update note",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	const deleteNote = useMutation(
		trpc.notes.deleteManualActivityNote.mutationOptions({
			onSuccess: async () => {
				await invalidateActivity();
				setDeletingNode(null);
				toast({
					title: "Activity note deleted",
					description: "The note remains available to Super Admin for audit.",
					variant: "success",
				});
			},
			onError: (error) =>
				toast({
					title: "Unable to delete note",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	const canManageNote = (node: ActivityNode) => {
		if (!canManageManualNotes || node.deletedAt || !node.note) return false;
		if (node.tags?.type === "activity_note_revision") return false;
		const channel = node.tags?.channel ?? node.tags?.type;
		if (channel !== "sales_info" && channel !== "inventory_inbound")
			return false;
		return (
			auth.roleTitle === "Super Admin" ||
			String(node.senderProfileId ?? "") === String(auth.id ?? "")
		);
	};

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

	const query = useQuery(
		trpc.notes.activityTree.queryOptions({
			...(contactId ? { contactIds: [contactId] } : {}),
			...(activityFilter ? { filter: activityFilter } : {}),
			tagFilterMode: "all",
			includeChildren: true,
			pageSize,
			maxDepth,
			includeDeleted: auth.roleTitle === "Super Admin",
		}),
	);
	const rows = data ?? ((query.data?.data || []) as ActivityNode[]);
	const isPending = isPendingOverride ?? (!data && query.isPending);
	const isError = isErrorOverride ?? (!data && query.isError);

	const header = (
		<div className="mb-6 flex items-center justify-between gap-3">
			<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
				{title}
			</h4>
			{headerAction}
		</div>
	);

	if (isPending) {
		return (
			<div className={cn("space-y-6", className)}>
				{header}
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
				<div className="mb-4">{header}</div>
				<p className="text-center text-sm text-muted-foreground">
					Unable to load activity history
				</p>
			</div>
		);
	}

	if (!rows.length) {
		if (emptyNode) return <>{emptyNode}</>;
		if (!emptyText) return null;

		return (
			<div className={cn("py-8", className)}>
				{header}
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
			{header}
			<div className="relative space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-border">
				{rows.map((item, index) => (
					<ActivityTreeItem
						key={item.id}
						node={item}
						isLatest={index === 0}
						onOpenActivity={onOpenActivity}
						onEditNote={(node) => {
							setEditingNode(node);
							setDraftNote(node.note ?? "");
						}}
						onDeleteNote={setDeletingNode}
						canManageNote={canManageNote}
					/>
				))}
			</div>
			<Dialog
				open={!!editingNode}
				onOpenChange={(open) => !open && setEditingNode(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit activity note</DialogTitle>
						<DialogDescription>
							The current text will become a visible previous version in the
							audit history.
						</DialogDescription>
					</DialogHeader>
					<Textarea
						value={draftNote}
						onChange={(event) => setDraftNote(event.target.value)}
						maxLength={5000}
						rows={6}
					/>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setEditingNode(null)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={!draftNote.trim() || updateNote.isPending}
							onClick={() =>
								editingNode &&
								updateNote.mutate({
									activityId: editingNode.id,
									note: draftNote.trim(),
								})
							}
						>
							Save changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<AlertDialog
				open={!!deletingNode}
				onOpenChange={(open) => !open && setDeletingNode(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this activity note?</AlertDialogTitle>
						<AlertDialogDescription>
							The note will disappear for normal users. Super Admin will retain
							the original note and its deletion snapshot for audit.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							disabled={deleteNote.isPending}
							onClick={() =>
								deletingNode &&
								deleteNote.mutate({ activityId: deletingNode.id })
							}
						>
							Delete note
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
