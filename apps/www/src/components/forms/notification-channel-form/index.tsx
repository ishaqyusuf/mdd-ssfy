"use client";

import {
    NotificationChannelProvider,
    useCreateNotificationChannelContext,
    useNotificationChannelContext,
} from "@/contexts/notification-channel-context";
import { useEmployeesList, useRolesList } from "@/hooks/use-data-list";
import { useNotificationChannelParams } from "@/hooks/use-notification-channel-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { Card } from "@gnd/ui/composite";
import { Icons } from "@gnd/ui/icons";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";

import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Info,
    Mail,
    MessageSquare,
    Plus,
    Search,
    Settings,
    Shield,
    Smartphone,
    Trash2,
    User,
    UserPlus,
    Users,
    X,
    BellRing,
} from "lucide-react";
import { ChannelSubscribers } from "./channel-subscribers";
import { ChannelRoles } from "./channel-roles";
import { DeliveryMethods } from "./delivery-methods";

export function NotificationChannelForm() {
    const ctx = useCreateNotificationChannelContext();
    return (
        <NotificationChannelProvider value={ctx}>
            <Content />
        </NotificationChannelProvider>
    );
}
export function Content() {
    const { openNotificationChannelId, setParams } =
        useNotificationChannelParams();
    const { selectedEvent } = useNotificationChannelContext();

    if (!openNotificationChannelId)
        return (
            <div className="hidden w-full md:ml-[calc(var(--container-sm))]  md:flex flex-1 flex-col items-center justify-center pt-[200px] p-12 text-center bg-muted/5 animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-card rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground/30 mb-6 group-hover:scale-110 transition-transform">
                    <BellRing size={48} />
                </div>
                <h3 className="text-2xl font-black text-foreground mb-2">
                    Manage System Alerts
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                    Select a notification event from the left sidebar to
                    configure delivery methods and assignment rules.
                </p>
            </div>
        );
    return (
        <div
            className={cn(
                !openNotificationChannelId && "hidden md:block",
                "md:ml-[calc(var(--container-sm))] w-full bg-green-100 md:h-[calc(100vh_-_var(--header-height)_-_35px)] md:overflow-autos",
            )}
        >
            <div className="h-screen">
                <Card className="flex-1 flex flex-col h-full animate-in slide-in-from-right md:slide-in-from-right-0 duration-300">
                    {/* Header */}
                    <Card.Header className="flex-row items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden -ml-2"
                                onClick={() => {
                                    setParams({
                                        openNotificationChannelId: null,
                                    });
                                }}
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>

                            <div>
                                <div className="flex items-center gap-2">
                                    <Card.Title className="text-lg md:text-xl font-black tracking-tight">
                                        {selectedEvent?.name}
                                    </Card.Title>
                                    <Badge
                                        variant="outline"
                                        className="hidden sm:inline-flex text-[10px]"
                                    >
                                        ID: {selectedEvent?.id}
                                    </Badge>
                                </div>
                                <Card.Description className="text-xs md:text-sm mt-0.5 line-clamp-1 md:line-clamp-none">
                                    {selectedEvent?.description}
                                </Card.Description>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="hidden md:flex"
                            onClick={() => {
                                setParams({
                                    openNotificationChannelId: null,
                                });
                            }}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </Card.Header>

                    {/* Body */}
                    <ScrollArea hideScrollbar className="flex-1">
                        <Card.Content className="space-y-8 p-4 md:p-8 pb-32 md:pb-[10vh]">
                            {/* Delivery Methods */}
                            <DeliveryMethods />

                            {/* Assignment Rules */}
                            <section className="space-y-4">
                                <h4 className="text-xs md:text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <Users className="h-4 w-4 text-primary" />
                                    Assignment Rules
                                </h4>

                                <Card>
                                    <Card.Content className="space-y-6">
                                        {/* Roles */}
                                        <ChannelRoles />
                                        {/* Users */}
                                        <ChannelSubscribers />
                                    </Card.Content>
                                </Card>
                            </section>

                            {/* Advanced */}
                            <Card className="bg-primary/5 border-primary/10">
                                <Card.Content className="flex gap-4">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <Info className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">
                                            Advanced Notification Logic
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Default system templates in use.
                                            Custom templates are available for{" "}
                                            <strong>Premium Admin</strong>{" "}
                                            accounts.
                                        </p>
                                    </div>
                                </Card.Content>
                            </Card>
                        </Card.Content>
                    </ScrollArea>

                    {/* Footer */}
                    <Card.Footer className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            // onClick={() => setSelectedEventId(null)}
                        >
                            Cancel
                        </Button>
                        <Button className="font-black">
                            Save
                            <ArrowRight className="ml-2 h-4 w-4 hidden md:inline" />
                        </Button>
                    </Card.Footer>
                </Card>
            </div>
        </div>
    );
}

