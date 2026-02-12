interface Props {
    id: number;
    setOpen: (open: boolean) => void;
    activity: any;
    markMessageAsRead?: (id: number) => void;
}
export function NotificationItem({}: Props) {
    return (
        <div className="px-4 py-2 hover:bg-muted rounded-md cursor-pointer">
            <p className="text-sm font-medium">Notification title</p>
            <p className="text-xs text-[#606060]">Notification description</p>
        </div>
    );
}

