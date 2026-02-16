import { useNotificationChannelContext } from "@/contexts/notification-channel-context";
import { Button } from "@gnd/ui/button";
import { Shield, X } from "lucide-react";

interface Props {}
export function ChannelRoles(props: Props) {
    const { roles, selectedEvent } = useNotificationChannelContext();
    const handleRemoveUserFromEvent = (userId: number) => {
        // Implement the logic to remove the user from the event's subscribers
        // This might involve calling an API endpoint to update the notification channel's subscriber list
    };
    return (
        <>
            <div>
                <div className="flex justify-between items-center mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Subscriber Groups (Roles)
                    </p>
                    <div></div>
                    {/* <Button
                                                              variant="link"
                                                              size="sm"
                                                          >
                                                              + Manage Roles
                                                          </Button> */}
                </div>

                <div className="flex flex-wrap gap-2">
                    {roles?.map((role, rk) => {
                        const active = selectedEvent?.roles.includes(role.name);
                        return (
                            <Button
                                key={rk}
                                variant={active ? "default" : "outline"}
                                size="sm"
                                className="gap-2 rounded-full text-[11px]"
                            >
                                <Shield className="h-3 w-3" />
                                {role.name}
                                {active && <X className="h-3 w-3" />}
                            </Button>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

