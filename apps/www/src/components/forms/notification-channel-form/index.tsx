"use client";

import { useEmployeesList, useRolesList } from "@/hooks/use-data-list";
import { useNotificationChannelParams } from "@/hooks/use-notification-channel-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
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

export function NotificationChannelForm() {
    const { openNotificationChannelId, setParams } =
        useNotificationChannelParams();
    const users = useEmployeesList(!!openNotificationChannelId);
    const roles = useRolesList(!!openNotificationChannelId);
    const { data: selectedEvent } = useQuery(
        useTRPC().notes.getNotificationChannel.queryOptions(
            {
                id: openNotificationChannelId!,
            },
            {
                enabled: !!openNotificationChannelId,
            },
        ),
    );
    const subscribers =
        selectedEvent?.subscriberIds?.map(
            (s) =>
                users?.find((u) => u.id === s) ?? {
                    name: "Unknown User",
                    id: s,
                },
        ) ?? [];

    const handleRemoveUserFromEvent = (userId: number) => {
        // Implement the logic to remove the user from the event's subscribers
        // This might involve calling an API endpoint to update the notification channel's subscriber list
    };
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
                            <section className="space-y-4">
                                <h4 className="text-xs md:text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <Settings className="h-4 w-4 text-primary" />
                                    Delivery Methods
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[
                                        {
                                            id: "email",
                                            icon: Mail,
                                            label: "Email",
                                            desc: "Send to primary work email",
                                            active: selectedEvent?.emailSupport,
                                        },
                                        {
                                            id: "sms",
                                            icon: MessageSquare,
                                            label: "SMS/Text",
                                            desc: "Mobile carrier direct text",
                                            active: selectedEvent?.textSupport,
                                        },
                                        {
                                            id: "push",
                                            icon: Smartphone,
                                            label: "In-App / Push",
                                            desc: "Dashboard & Mobile alerts",
                                            active: selectedEvent?.inAppSupport,
                                        },
                                    ].map((item) => {
                                        const active = item.active;

                                        return (
                                            <Button
                                                key={item.id}
                                                variant="outline"
                                                className={`h-auto p-4 items-start gap-3 justify-start rounded-xl ${
                                                    active
                                                        ? "border-primary bg-primary/5"
                                                        : ""
                                                }`}
                                                onClick={() => {
                                                    //   toggleChannel(
                                                    //       selectedEvent?.id,
                                                    //       item.id as any,
                                                    //   );
                                                }}
                                            >
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
                                                        {active && (
                                                            <CheckCircle2 className="h-4 w-4 text-primary" />
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                                        {item.desc}
                                                    </p>
                                                </div>
                                            </Button>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Assignment Rules */}
                            <section className="space-y-4">
                                <h4 className="text-xs md:text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <Users className="h-4 w-4 text-primary" />
                                    Assignment Rules
                                </h4>

                                <Card>
                                    <Card.Content className="space-y-6">
                                        {/* Roles */}
                                        <div>
                                            <div className="flex justify-between items-center mb-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                    Subscriber Groups (Roles)
                                                </p>
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                >
                                                    + Manage Roles
                                                </Button>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {roles?.map((role, rk) => {
                                                    const active =
                                                        selectedEvent?.roles.includes(
                                                            role.name,
                                                        );
                                                    return (
                                                        <Button
                                                            key={rk}
                                                            variant={
                                                                active
                                                                    ? "default"
                                                                    : "outline"
                                                            }
                                                            size="sm"
                                                            className="gap-2 rounded-full text-[11px]"
                                                        >
                                                            <Shield className="h-3 w-3" />
                                                            {role.name}
                                                            {active && (
                                                                <X className="h-3 w-3" />
                                                            )}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Users */}
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
                                                Individual Subscribers (Users)
                                            </p>

                                            {users?.length ? (
                                                <div className="space-y-2">
                                                    {subscribers.map(
                                                        ({ id, name }) => (
                                                            <div
                                                                key={id}
                                                                className="flex items-center justify-between p-3 rounded-xl border bg-muted/30"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                                        <User className="h-4 w-4" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-bold">
                                                                            {
                                                                                name
                                                                            }
                                                                        </p>
                                                                        <p className="text-[9px] uppercase font-bold text-muted-foreground">
                                                                            Manual
                                                                            Override
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() =>
                                                                        handleRemoveUserFromEvent(
                                                                            id,
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 border border-dashed rounded-xl bg-muted/5 text-xs text-muted-foreground italic">
                                                    No individual users
                                                    assigned.
                                                </div>
                                            )}
                                        </div>
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

