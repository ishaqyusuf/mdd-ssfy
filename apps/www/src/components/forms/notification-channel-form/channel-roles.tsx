import { useNotificationChannelContext } from "@/contexts/notification-channel-context";
import {
    invalidateInfiniteQueries,
    invalidateQuery,
} from "@/hooks/use-invalidate-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { SubmitButton } from "@gnd/ui/submit-button";
import { useMutation } from "@tanstack/react-query";
import { Shield, X } from "lucide-react";
import { useState } from "react";

interface Props {}
export function ChannelRoles(props: Props) {
    const { roles, selectedEvent } = useNotificationChannelContext();
    const handleRemoveUserFromEvent = (userId: number) => {
        // Implement the logic to remove the user from the event's subscribers
        // This might involve calling an API endpoint to update the notification channel's subscriber list
    };
    const [updatingRoleId, setUpdatingRoleId] = useState<number | null>(null);
    const { mutate: removeRoleFromChannel, isPending: isRemoving } =
        useMutation(
            useTRPC().notes.removeNotificationChannelRole.mutationOptions({
                onSuccess() {
                    // Invalidate or refetch queries related to the notification channel to reflect the changes in the UI
                    invalidateInfiniteQueries("notes.getNotificationChannels");
                    invalidateQuery("notes.getNotificationChannel", {
                        id: selectedEvent!.id,
                    });
                },
            }),
        );
    const { mutate: addRoleToChannel, isPending: isAdding } = useMutation(
        useTRPC().notes.addNotificationChannelRole.mutationOptions({
            onSuccess() {
                // Invalidate or refetch queries related to the notification channel to reflect the changes in the UI
                invalidateInfiniteQueries("notes.getNotificationChannels");
                invalidateQuery("notes.getNotificationChannel", {
                    id: selectedEvent!.id,
                });
            },
        }),
    );
    const isPending = isRemoving || isAdding;
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
                            <SubmitButton
                                key={rk}
                                isSubmitting={
                                    isPending && updatingRoleId === role.id
                                }
                                type="button"
                                onClick={(e) => {
                                    setUpdatingRoleId(role.id);
                                    if (active)
                                        removeRoleFromChannel({
                                            notificationChannelId:
                                                selectedEvent!.id,
                                            roleId: role.id,
                                        });
                                    else
                                        addRoleToChannel({
                                            notificationChannelId:
                                                selectedEvent!.id,
                                            roleId: role.id,
                                        });
                                }}
                                variant={active ? "default" : "outline"}
                                size="sm"
                                className="rounded-full text-[11px]"
                            >
                                <div className="flex gap-2">
                                    <Shield className="h-3 w-3" />
                                    {role.name}
                                    {active && <X className="h-3 w-3" />}
                                </div>
                            </SubmitButton>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

