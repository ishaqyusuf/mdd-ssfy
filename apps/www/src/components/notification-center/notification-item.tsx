import ConfirmBtn from "@/components/confirm-button";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import type { TransformedNotification } from "@notifications/notification-center";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getNotificationIcon } from "./notification-icons";
import { NotificationLink } from "./notification-link";

interface Props {
	setOpen: (open: boolean) => void;
	activity: TransformedNotification;
	onAction?: (notification: TransformedNotification) => void;
	onArchive?: (notificationId: string | number) => void;
	isUpdating?: boolean;
}

function resolveNotificationDate(activity: TransformedNotification) {
	if (activity.notificationDate) return activity.notificationDate;
	if (!activity.createdAt) return "No date";
	const value =
		activity.createdAt instanceof Date
			? activity.createdAt
			: new Date(activity.createdAt);
	if (Number.isNaN(value.getTime())) return "No date";

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(value);
}

export function NotificationItem({
	setOpen,
	activity,
	onAction,
	onArchive,
	isUpdating,
}: Props) {
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const notificationDate = resolveNotificationDate(activity);
	const isSuperAdmin = auth.roleTitle?.toLowerCase() === "super admin";
	const deleteMutation = useMutation(
		trpc.notes.deleteNotification.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.notes.list.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.notes.activityTree.pathKey(),
					}),
				]);
				toast.success("Notification deleted");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to delete notification");
			},
		}),
	);

	const notificationContent = (
		<div className="flex flex-1 items-start gap-4">
			<div className="shrink-0">
				<div className="h-9 w-9 flex items-center justify-center border rounded-full">
					{getNotificationIcon(activity.type)}
				</div>
			</div>
			<div className="min-w-0 flex-1">
				<p
					className={cn(
						"text-sm",
						activity.status === "unread" && "font-medium",
					)}
				>
					{activity.title}
				</p>
				<span className="text-xs text-[#606060]">{activity.description}</span>
				{activity.note ? (
					<p className="mt-1 text-xs text-slate-600 line-clamp-2">
						{activity.note}
					</p>
				) : null}
				{activity.documents?.length ? (
					<div className="mt-2 flex flex-wrap gap-2">
						{activity.documents.map((document) =>
							document?.url ? (
								<a
									key={document.id}
									href={document.url}
									target="_blank"
									rel="noreferrer"
									onClick={(event) => event.stopPropagation()}
									className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
								>
									{document.title}
								</a>
							) : (
								<span
									key={document.id}
									className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700"
								>
									{document.title}
								</span>
							),
						)}
					</div>
				) : null}
				<p className="mt-1 text-[11px] text-[#8a8a8a]">{notificationDate}</p>
			</div>
		</div>
	);

	const actionButton = activity.action && (
		<div>
			<Button
				size="icon"
				variant="ghost"
				className="rounded-full"
				onClick={(event) => {
					event.stopPropagation();
					onAction?.(activity);
				}}
				title={activity.action.label}
				aria-label={activity.action.label}
			>
				<Icons.ArrowOutward className="size-4" />
			</Button>
		</div>
	);

	const archiveButton = onArchive ? (
		<div>
			<Button
				size="icon"
				variant="secondary"
				className="rounded-full bg-transparent"
				disabled={isUpdating}
				onClick={(event) => {
					event.stopPropagation();
					onArchive(activity.id);
				}}
				title="Archive notification"
				aria-label="Archive notification"
			>
				<Icons.Archive className="size-4" />
			</Button>
		</div>
	) : null;

	const deleteButton = isSuperAdmin ? (
		<div>
			<ConfirmBtn
				trash
				size="icon"
				isDeleting={deleteMutation.isPending}
				onClick={async (event) => {
					event.stopPropagation();
					await deleteMutation.mutateAsync({
						activityId: Number(activity.id),
					});
				}}
				aria-label="Delete notification"
				title="Delete notification"
			/>
		</div>
	) : null;

	return (
		<NotificationLink
			onNavigate={() => {
				setOpen(false);
				onAction?.(activity);
			}}
			isClickable={activity.isClickable}
			className="flex flex-1 items-start gap-4 text-left"
			actionButton={
				actionButton || archiveButton || deleteButton ? (
					<div className="flex items-center gap-1">
						{archiveButton}
						{deleteButton}
						{actionButton}
					</div>
				) : undefined
			}
		>
			{notificationContent}
		</NotificationLink>
	);
}
