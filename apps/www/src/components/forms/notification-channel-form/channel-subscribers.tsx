import { Icons } from "@gnd/ui/icons";
import { useNotificationChannelContext } from "@/contexts/notification-channel-context";
import { Button } from "@gnd/ui/button";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";

interface Props {}
export function ChannelSubscribers(props: Props) {
    const { users, subscribers } = useNotificationChannelContext();
    const handleRemoveUserFromEvent = (userId: number) => {
        // Implement the logic to remove the user from the event's subscribers
        // This might involve calling an API endpoint to update the notification channel's subscriber list
    };
    return (
        <>
            <div>
                <div className="flex justify-between items-center mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Individual Subscribers (Users)
                    </p>
                    {/* <Button
                                                    variant="link"
                                                    size="sm"
                                                >
                                                    + Add User
                                                </Button> */}
                    <div className="">
                        <ComboboxDropdown
                            // headless={headless}
                            listClassName="max-h-60 w-sm"
                            Trigger={
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                >
                                    <Icons.UserPlus className="h-3 w-3" />
                                    Add User
                                </Button>
                            }
                            placeholder="Select tags"
                            // selectedItem={data.find((tag) => tag.id === selectedId)}
                            searchPlaceholder="Search tags"
                            items={users.map((user) => ({
                                data: user,
                                id: String(user.id),
                                label: user.name,
                            }))}
                            onSelect={(item) => {
                                // onChange(item);
                            }}
                        />
                    </div>
                </div>

                {users?.length ? (
                    <div className="space-y-2">
                        {subscribers.map(({ id, name }) => (
                            <div
                                key={id}
                                className="flex items-center justify-between p-3 rounded-xl border bg-muted/30"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <Icons.User className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">
                                            {name}
                                        </p>
                                        <p className="text-[9px] uppercase font-bold text-muted-foreground">
                                            Manual Override
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                        handleRemoveUserFromEvent(id)
                                    }
                                >
                                    <Icons.Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 border border-dashed rounded-xl bg-muted/5 text-xs text-muted-foreground italic">
                        No individual users assigned.
                    </div>
                )}
            </div>
        </>
    );
}

