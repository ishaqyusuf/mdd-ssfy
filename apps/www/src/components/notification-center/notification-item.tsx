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
export function NotificationItem({ setOpen, activity, onAction }: Props) {
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
                        activity.status === "unread" && "font-medium",
                    )}
                >
                    {activity.title}
                </p>
                <span className="text-xs text-[#606060]">
                    {activity.description}
                </span>
                {activity.notificationDate ? (
                    <p className="mt-1 text-[11px] text-[#8a8a8a]">
                        {activity.notificationDate}
                    </p>
                ) : null}
            </div>
        </>
    );

    const actionButton = activity.action && (
        <div>
            <Button
                size="sm"
                variant="secondary"
                className="rounded-full"
                onClick={(event) => {
                    event.stopPropagation();
                    onAction?.(activity);
                }}
                title={activity.action.label}
            >
                {activity.action.label}
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
            className="flex items-between space-x-4 flex-1 text-left"
            actionButton={actionButton}
        >
            {notificationContent}
        </NotificationLink>
    );
}

