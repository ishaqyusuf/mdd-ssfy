import { RouterOutputs } from "@api/trpc/routers/_app";

interface Props {
    id: number;
    setOpen: (open: boolean) => void;
    activity: RouterOutputs["notes"]["list"]["data"][number];
    markMessageAsRead?: (id: number) => void;
}
export function NotificationItem({ activity }: Props) {
    return (
        <div className="px-4 py-2 hover:bg-muted rounded-md cursor-pointer">
            <p className="text-sm font-medium">
                {activity.subject || "Notification Subject"}
            </p>
            <p className="text-xs text-[#606060]">
                {activity.headline || "Notification headline or preview text"}
            </p>
        </div>
    );
}

