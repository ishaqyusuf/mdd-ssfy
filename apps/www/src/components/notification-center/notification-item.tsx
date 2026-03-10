import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import type { TransformedNotification } from "@notifications/notification-center";
import { NotificationLink } from "./notification-link";

interface Props {
    setOpen: (open: boolean) => void;
    activity: TransformedNotification;
    onAction?: (notification: TransformedNotification) => void;
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

export function NotificationItem({ setOpen, activity, onAction }: Props) {
    const notificationDate = resolveNotificationDate(activity);

    const notificationContent = (
        <div className="flex flex-1 items-start gap-4">
            <div className="shrink-0">
                <div className="h-9 w-9 flex items-center justify-center border rounded-full">
                    <Icons.Notifications className="size-4" />
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
                <span className="text-xs text-[#606060]">
                    {activity.description}
                </span>
                <p className="mt-1 text-[11px] text-[#8a8a8a]">
                    {notificationDate}
                </p>
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

    return (
        <NotificationLink
            onNavigate={() => {
                setOpen(false);
                onAction?.(activity);
            }}
            isClickable={activity.isClickable}
            className="flex flex-1 items-start gap-4 text-left"
            actionButton={actionButton}
        >
            {notificationContent}
        </NotificationLink>
    );
}
