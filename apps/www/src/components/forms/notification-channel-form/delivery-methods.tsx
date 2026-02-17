import { useNotificationChannelContext } from "@/contexts/notification-channel-context";
import {
    invalidateInfiniteQueries,
    invalidateQueries,
    invalidateQuery,
} from "@/hooks/use-invalidate-query";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@gnd/ui/icons";
import { SubmitButton } from "@gnd/ui/submit-button";
import { useMutation } from "@tanstack/react-query";
import {
    CheckCircle2,
    Mail,
    MessageSquare,
    Settings,
    Smartphone,
} from "lucide-react";
import { useState } from "react";

export function DeliveryMethods() {
    const { selectedEvent } = useNotificationChannelContext();
    type Event = keyof typeof selectedEvent;
    type MethodKeys = Extract<
        Event,
        "emailSupport" | "textSupport" | "inAppSupport"
    >;
    const [updatingMethodKey, setUpdatingMethodKey] = useState(null);
    const { mutate: updateChannel, isPending: isUpdating } = useMutation(
        useTRPC().notes.updateNotificationChannel.mutationOptions({
            onSuccess() {
                // Invalidate or refetch queries related to the notification channel to reflect the changes in the UI
                invalidateInfiniteQueries("notes.getNotificationChannels");
                invalidateQuery("notes.getNotificationChannel", {
                    id: selectedEvent!.id,
                });
            },
        }),
    );
    const toggleChannel = (k: MethodKeys) => {
        setUpdatingMethodKey(k);
        updateChannel({
            id: selectedEvent!.id,
            [k]: !selectedEvent![k],
        } as any);
    };
    const deliveryMethods: {
        id: MethodKeys;
        label: string;
        desc: string;
        icon: React.ElementType;
        disabled?: boolean;
    }[] = [
        {
            id: "emailSupport",
            icon: Mail,
            label: "Email",
            desc: "Send to primary work email",
            // active: selectedEvent?.emailSupport,
        },
        // {
        //     id: "sms",
        //     icon: MessageSquare,
        //     label: "SMS/Text",
        //     desc: "Mobile carrier direct text",
        //     active: selectedEvent?.textSupport,
        // },
        {
            id: "inAppSupport",
            icon: Smartphone,
            label: "In-App / Push",
            desc: "Dashboard & Mobile alerts",
            // active: selectedEvent?.inAppSupport,
        },
        {
            id: "textSupport",
            icon: Icons.WhatsApp,
            label: "WhatsApp",
            desc: "Send notifications to WhatsApp",
            // active: selectedEvent?.textSupport,
            disabled: true,
        },
    ];
    return (
        <section className="space-y-4">
            <h4 className="text-xs md:text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Delivery Methods
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {deliveryMethods.map((item) => {
                    const active = selectedEvent
                        ? selectedEvent[item.id]
                        : false;

                    return (
                        <SubmitButton
                            type="button"
                            isSubmitting={
                                updatingMethodKey === item.id && isUpdating
                            }
                            key={item.id}
                            variant="outline"
                            className={`h-auto p-4  items-start gap-3 justify-start rounded-xl ${
                                active ? "border-primary bg-primary/5" : ""
                            }`}
                            disabled={item.disabled}
                            onClick={() => {
                                toggleChannel(item.id as any);
                            }}
                        >
                            <div className="items-start flex-1 gap-3 justify-start flex">
                                <div
                                    className={`p-2 rounded-lg ${
                                        active
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                    }`}
                                >
                                    <item.icon className="h-5 w-5" />
                                </div>

                                <div className="flex-1 text-left min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold truncate">
                                            {item.label}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                        {item.desc}
                                    </p>
                                </div>
                                {/* <div className="flex-1"></div> */}
                                <div className="flex justify-end">
                                    {active && (
                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                    )}
                                </div>
                            </div>
                        </SubmitButton>
                    );
                })}
            </div>
        </section>
    );
}

