import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { NotificationLink } from "./notification-link";

interface Props {
	id: number;
	setOpen: (open: boolean) => void;
	activity: RouterOutputs["notes"]["list"]["data"][number];
	markMessageAsRead?: (id: number) => void;
}
export function NotificationItem({
	id,
	setOpen,
	activity,
	markMessageAsRead,
}: Props) {
	const notificationContent = (
		<>
			<div>
				<div className="h-9 w-9 flex items-center justify-center border rounded-full">
					<Icons.Notifications className="size-4" />
				</div>
			</div>
			<div>
				<p
					className={cn(
						"text-sm",
						activity.receipt?.status === "unread" && "font-medium",
					)}
				>
					{activity.subject || "Notification Subject"}
				</p>
				<span className="text-xs text-[#606060]">
					{activity.headline || "Notification headline or preview text"}
				</span>
			</div>
		</>
	);

	const actionButton = markMessageAsRead && (
		<div>
			<Button
				size="icon"
				variant="secondary"
				className="rounded-full bg-transparent hover:bg-[#F6F6F3]"
				onClick={() => markMessageAsRead(id)}
				title="Archive notification"
			>
				<Icons.Notifications className="size-4" />
			</Button>
		</div>
	);

	return (
		<NotificationLink
			onNavigate={() => setOpen(false)}
			className="flex items-between space-x-4 flex-1 text-left"
			actionButton={actionButton}
		>
			{notificationContent}
		</NotificationLink>
	);
}
