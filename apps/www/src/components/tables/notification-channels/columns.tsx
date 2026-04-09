import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { cells } from "@gnd/ui/custom/data-table/cells";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useNotificationChannelFilterParams } from "@/hooks/use-notification-channel-filter-params";
import { useNotificationChannelParams } from "@/hooks/use-notification-channel-params";
import { getColorFromName, hexToRgba } from "@gnd/utils/colors";

export type Item =
    RouterOutputs["notes"]["getNotificationChannels"]["data"][number];
interface ItemProps {
    item: Item;
}
type Column = ColumnDef<Item>;
const column1: Column = {
    header: "Channels",
    accessorKey: "header",
    meta: {},
    cell: ({ row: { original: event } }) => <ListItem item={event} />,
};

export function ListItem({ item: event }: ItemProps) {
    const { setParams, openNotificationChannelId } =
        useNotificationChannelParams();
    return (
        <div
            key={event.id}
            onClick={() =>
                setParams({
                    openNotificationChannelId: event.id,
                })
            }
            className={cn(
                `w-full text-left cursor-pointer transition-all group`,
                openNotificationChannelId == event.id
                    ? "bg-primary/5 shadow-sm"
                    : "hover:bg-muted/30",
                "leading-tight border-b gap-2 p-4",
            )}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {event.title}
                        </span>
                        <span
                            style={{
                                backgroundColor: hexToRgba(
                                    getColorFromName(event.priority),
                                    0.1,
                                ),
                                color: getColorFromName(event.priority),
                            }}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider`}
                        >
                            {event.priority}
                        </span>
                    </div>
                    <span className="line-clamp-2 w-[260px] text-xs whitespace-break-spaces">
                        {event.description}
                    </span>
                </div>
                <div className="flex gap-1 shrink-0 ml-4">
                    <div
                        className={cn(
                            "p-1 rounded",
                            event.emailSupport
                                ? "text-primary bg-primary/10"
                                : "text-muted-foreground/30",
                        )}
                    >
                        <Icons.Mail className="size-4" />
                    </div>
                    <div
                        className={cn(
                            "p-1 rounded",
                            event.whatsappSupport
                                ? "text-primary bg-primary/10"
                                : "text-muted-foreground/30",
                        )}
                    >
                        <Icons.WhatsApp className="size-4" />
                    </div>
                    <div
                        className={cn(
                            "p-1 rounded",
                            event.inAppSupport
                                ? "text-primary bg-primary/10"
                                : "text-muted-foreground/30",
                        )}
                    >
                        <Icons.Smartphone className="size-4" />
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap gap-1">
                <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-bold uppercase tracking-tighter">
                    {event.category}
                </span>
                {event.deletable ? (
                    <span className="text-[9px] bg-amber-500/10 px-1.5 py-0.5 rounded text-amber-700 font-bold uppercase tracking-tighter">
                        Deletable
                    </span>
                ) : null}
                {/* {event.assignments.roles.map((role) => (
                        <span
                            key={role}
                            className="text-[9px] bg-primary/5 px-1.5 py-0.5 rounded text-primary font-bold"
                        >
                            {role}
                        </span>
                    ))} */}
            </div>
        </div>
    );
}
export const columns: Column[] = [column1];

function Actions({ item }: ItemProps) {
    const isMobile = useIsMobile();
    return (
        <div className="relative flex justify-end z-10">
            <Menu
                triggerSize={isMobile ? "default" : "xs"}
                Trigger={
                    <Button
                        className={cn(isMobile || "size-4 p-0")}
                        variant="ghost"
                    >
                        <Icons.MoreHoriz className="" />
                    </Button>
                }
            >
                <Menu.Item SubMenu={<></>}>Mark as</Menu.Item>
            </Menu>
        </div>
    );
}
export const mobileColumn: ColumnDef<Item>[] = [
    {
        header: "",
        accessorKey: "row",
        meta: {
            className: "flex-1 p-0",
            // preventDefault: true,
        },
        cell: ({ row: { original: item } }) => {
            return <ItemCard item={item} />;
        },
    },
];
function ItemCard({ item }: ItemProps) {
    // design a mobile version of the columns here
    const { setParams } = useNotificationChannelParams();
    return <></>;
}
