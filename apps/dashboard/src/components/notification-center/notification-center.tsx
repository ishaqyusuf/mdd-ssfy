"use client";

import Link from "@/components/link";
import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { useJobParams } from "@/hooks/use-contractor-jobs-params";
import { useDocumentReviewParams } from "@/hooks/use-document-review-params";
import { useIdleQueryEnabled } from "@/hooks/use-idle-query-enabled";
import { useInboundView } from "@/hooks/use-inbound-filter-params";
import { useNotifications } from "@/hooks/use-notifications";
import { useSalesOverviewOpen } from "@/hooks/use-sales-overview-open";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { Button } from "@gnd/ui/button";
import { ButtonGroup } from "@gnd/ui/button-group";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { DropdownMenu, Popover, Tabs } from "@gnd/ui/namespace";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { TabsContent } from "@gnd/ui/tabs";
import {
    type TransformedNotification,
    createNotificationHandlers,
    runNotificationAction,
} from "@notifications/notification-center";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { usePathname, useRouter } from "next/navigation";
import {
    type ComponentProps,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ErrorFallback } from "../error-fallback";
import { EmptyState } from "./empty-state";
import { NotificationItem } from "./notification-item";
import { NotificationSettingsSheet } from "./notification-settings-sheet";

const SKELETON_ROW_KEYS = [
    "notification-skeleton-1",
    "notification-skeleton-2",
    "notification-skeleton-3",
    "notification-skeleton-4",
    "notification-skeleton-5",
];

const NOTIFICATION_TABS = [
    {
        value: "inbox",
        label: "Inbox",
        icon: Icons.Inbox,
    },
    {
        value: "archive",
        label: "Archive",
        icon: Icons.Archive,
    },
] as const;

function NotificationDrawerSurface({
    children,
    className,
}: ComponentProps<typeof Popover.Content>) {
    return (
        <section aria-label="Notifications" className={className}>
            {children}
        </section>
    );
}

type NotificationCenterProps = {
    presentation?: "header" | "menu-item";
    onNavigate?: () => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    triggerContainer?: Element | null;
};

export function NotificationCenter({
    presentation = "header",
    onNavigate,
    open: controlledOpen,
    onOpenChange,
    triggerContainer,
}: NotificationCenterProps = {}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("inbox");
    const [selectedFilter, setSelectedFilter] = useState<{
        type: string;
        title: string;
    } | null>(null);
    const notificationTriggerRef = useRef<HTMLButtonElement>(null);
    const notificationBackRef = useRef<HTMLButtonElement>(null);
    const isOpen = controlledOpen ?? internalOpen;
    const isMenuItem = presentation === "menu-item";

    function setOpen(nextOpen: boolean) {
        if (controlledOpen === undefined) {
            setInternalOpen(nextOpen);
        }
        onOpenChange?.(nextOpen);
    }
    const router = useRouter();
    const pathname = usePathname();
    const idleQueryEnabled = useIdleQueryEnabled(1500);
    const {
        hasUnseenNotifications,
        notifications,
        archived,
        isLoading,
        unreadCount,
        markMessageAsRead,
        markAllMessagesAsRead,
        markAllMessagesAsSeen,
        isUpdating,
        inbox,
        archive,
    } = useNotifications({
        enabled: isOpen || idleQueryEnabled,
        includeArchive: isOpen && activeTab === "archive",
        type: selectedFilter?.type,
    });
    const unreadNotifications = notifications; // Main notifications (unread/read)
    const archivedNotifications = archived; // Archived notifications
    const activeTypeSummary =
        activeTab === "archive" ? archive.typeSummary : inbox.typeSummary;
    const activeTypeCount = useMemo(
        () => activeTypeSummary.reduce((total, item) => total + item.count, 0),
        [activeTypeSummary],
    );
    const selectedType = selectedFilter?.type ?? null;
    const selectedTypeLabel =
        selectedFilter?.title ??
        (selectedType
            ? activeTypeSummary.find((item) => item.type === selectedType)
                  ?.title
            : null);
    const inboxEmptyDescription = selectedTypeLabel
        ? `No ${selectedTypeLabel.toLowerCase()} notifications`
        : "No new notifications";
    const archiveEmptyDescription = selectedTypeLabel
        ? `No archived ${selectedTypeLabel.toLowerCase()} notifications`
        : "Nothing in the archive";
    useEffect(() => {
        if (isOpen && hasUnseenNotifications && !isUpdating) {
            markAllMessagesAsSeen();
        }
    }, [hasUnseenNotifications, isOpen, isUpdating, markAllMessagesAsSeen]);
    useEffect(() => {
        if (isMenuItem && isOpen) {
            notificationBackRef.current?.focus();
        }
    }, [isMenuItem, isOpen]);
    const { setParams: setCommunityInstallCostParams } =
        useCommunityInstallCostParams();
    const { setParams: setJobParams } = useJobParams();
    const { setParams: setDocumentReviewParams } = useDocumentReviewParams();
    const { setParams: setInboundViewParams } = useInboundView();
    const salesOverview = useSalesOverviewOpen();
    const legacySalesOverview = useSalesOverviewQuery();
    const handlers = createNotificationHandlers<{ close: () => void }>({
        inventory_inbound_activity: (data, _notification, context) => {
            context.close();
            setInboundViewParams({
                viewInboundId: Number(data.inboundId),
                payload: null,
            });
        },
        job_submitted: (data, _notification, context) => {
            context.close();
            setJobParams({ openJobId: Number(data.jobId) });
        },
        quote_accepted: (data, _notification, context) => {
            context.close();
            legacySalesOverview.open2(String(data.orderNo), "sales");
        },
        dealer_sales_request: (data, _notification, context) => {
            context.close();
            router.push(`/sales-rep?tab=requests&requestId=${data.requestId}`);
        },
        sales_checkout_success: (data, _notification, context) => {
            const firstOrderNo = data.orderNos[0];
            if (!firstOrderNo) return;

            context.close();
            salesOverview.openOrder(String(firstOrderNo));
        },
        sales_payment_recorded: (data, _notification, context) => {
            context.close();
            salesOverview.openOrder(String(data.orderNo));
        },
        sales_marked_as_production_completed: (
            data,
            _notification,
            context,
        ) => {
            context.close();
            salesOverview.openOrder(String(data.orderNo ?? data.salesId));
        },
        sales_production_all_completed: (data, _notification, context) => {
            context.close();
            salesOverview.openOrder(String(data.orderNo ?? data.salesId));
        },
        sales_dispatch_assigned: (data, _notification, context) => {
            context.close();
            if (data.orderNo) {
                salesOverview.openDispatch(
                    String(data.orderNo),
                    String(data.dispatchId),
                );
                return;
            }
            router.push(
                `/sales-book/dispatch?q=${encodeURIComponent(String(data.dispatchId))}`,
            );
        },
        job_task_configure_request: (data, _notification, context) => {
            context.close();
            const useSidebarView = pathname.includes(
                "/community/community-template/",
            );
            setCommunityInstallCostParams({
                mode: "v2",
                view: useSidebarView ? "template-edit" : "template-list",
                editCommunityModelInstallCostId: Number(data.modelId),
                selectedBuilderTaskId: Number(data.builderTaskId),
                requestBuilderTaskId: Number(data.builderTaskId),
                jobId: Number(data.jobId),
                contractorId: Number(data.contractorId),
            });
            // router.push(`/community/template-schema?${params.toString()}`);
            // toast.info(
            // 	`Open task configuration for ${data.modelName} (${data.projectName})`,
            // );
        },
        employee_document_review: (data, _notification, context) => {
            context.close();
            setDocumentReviewParams({
                openDocumentReviewId: Number(data.documentId),
            });
        },
        employee_access_revoked: (data, _notification, context) => {
            context.close();
            router.push(`/hrm/employees/v2/${Number(data.userId)}`);
        },
        community_documents: (data, _notification, context) => {
            context.close();
            router.push(
                `/community/projects/${encodeURIComponent(data.projectSlug)}`,
            );
        },
        community_unit_production_started: (data, _notification, context) => {
            context.close();
            router.push(
                `/community/unit-productions?ids=${encodeURIComponent(String(data.taskId))}&openUnitProductionId=${encodeURIComponent(String(data.taskId))}`,
            );
        },
        community_unit_production_stopped: (data, _notification, context) => {
            context.close();
            router.push(
                `/community/unit-productions?ids=${encodeURIComponent(String(data.taskId))}&openUnitProductionId=${encodeURIComponent(String(data.taskId))}`,
            );
        },
        community_unit_production_completed: (data, _notification, context) => {
            context.close();
            router.push(
                `/community/unit-productions?ids=${encodeURIComponent(String(data.taskId))}&openUnitProductionId=${encodeURIComponent(String(data.taskId))}`,
            );
        },
        community_unit_production_batch_updated: (
            data,
            _notification,
            context,
        ) => {
            context.close();
            const ids = Array.isArray(data.taskId) ? data.taskId.join(",") : "";
            if (!ids) return;
            router.push(
                `/community/unit-productions?ids=${encodeURIComponent(ids)}`,
            );
        },
        dispatch_packing_delay: (data, _notification, context) => {
            context.close();
            if (pathname.includes("/driver")) {
                router.push(`/sales-book/dispatch-task/${data.dispatchId}`);
            } else {
                legacySalesOverview.openPackingReview(
                    data.orderNo,
                    Number(data.dispatchId),
                );
            }
            const message =
                data.reviewStatus === "APPROVED"
                    ? `Packing approved for ${data.itemName}.`
                    : data.reviewStatus === "REJECTED"
                      ? `Packing was rejected for ${data.itemName}.`
                      : `Review guarded packing for ${data.itemName}.`;
            toast[data.reviewStatus === "REJECTED" ? "error" : "success"](
                message,
            );
        },
        sales_production_submission_material_review: (
            data,
            _notification,
            context,
        ) => {
            context.close();
            const search = data.orderNo
                ? `&q=${encodeURIComponent(String(data.orderNo))}`
                : "";
            router.push(`/sales-book/productions?tab=reviews${search}`);
        },
        sales_dispatch_duplicate_alert: (data, _notification, context) => {
            context.close();
            router.push(
                `/sales-book/dispatch?q=${encodeURIComponent(String(data.dispatchId))}`,
            );
            toast.info(
                `Duplicate dispatch alert opened for #${data.dispatchId}.`,
            );
        },
        sales_handoff_action_escalation: (data, _notification, context) => {
            context.close();
            if (data.actionType === "PRODUCTION") {
                legacySalesOverview.openProduction(
                    data.orderId,
                    data.targetControlUid,
                );
                return;
            }
            legacySalesOverview.openMaterial(data.orderId);
        },
    });

    const closeForAction = () => {
        setOpen(false);
        if (isMenuItem) onNavigate?.();
    };
    const returnToAccountMenu = () => {
        setOpen(false);
        requestAnimationFrame(() => notificationTriggerRef.current?.focus());
    };
    const onAction = async (notification: TransformedNotification) => {
        let didClose = false;
        await runNotificationAction(notification, handlers, {
            close: () => {
                didClose = true;
                closeForAction();
            },
        });
        if (isMenuItem && !didClose) closeForAction();
    };
    const unreadBadge =
        unreadCount > 9 ? "9+" : unreadCount > 0 ? String(unreadCount) : null;
    const NotificationSurface = isMenuItem
        ? NotificationDrawerSurface
        : Popover.Content;
    const notificationTrigger = (
        <Popover.Trigger asChild>
            <Button
                ref={notificationTriggerRef}
                variant={isMenuItem ? "ghost" : "outline"}
                size={isMenuItem ? "sm" : "icon"}
                className={cn(
                    "relative flex items-center",
                    isMenuItem
                        ? "h-11 w-full justify-start gap-3 rounded-lg px-3 text-sm font-medium"
                        : "h-8 w-8 rounded-full",
                )}
                aria-label="Notifications"
                aria-hidden={isMenuItem && isOpen ? true : undefined}
                tabIndex={isMenuItem && isOpen ? -1 : undefined}
            >
                <Icons.Bell className="size-4 shrink-0" />
                {isMenuItem ? (
                    <span className="flex-1 text-left">Notifications</span>
                ) : null}
                {unreadBadge ? (
                    <span
                        className={cn(
                            "flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-primary-foreground",
                            isMenuItem
                                ? "ml-auto h-5"
                                : "-right-1 -top-1 absolute h-4",
                        )}
                    >
                        {unreadBadge}
                    </span>
                ) : null}
            </Button>
        </Popover.Trigger>
    );

    return (
        <Popover open={isOpen} onOpenChange={setOpen}>
            {isMenuItem
                ? triggerContainer
                    ? createPortal(notificationTrigger, triggerContainer)
                    : null
                : notificationTrigger}
            <NotificationSurface
                className={cn(
                    "overflow-hidden bg-background p-0",
                    isMenuItem
                        ? "flex min-h-0 w-full flex-1 flex-col rounded-t-2xl border-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-14 shadow-none"
                        : "relative h-[535px] w-screen md:w-[400px]",
                    isMenuItem && !isOpen && "hidden",
                )}
                align="end"
                sideOffset={10}
            >
                {isMenuItem ? <h2 className="sr-only">Notifications</h2> : null}
                <ErrorBoundary errorComponent={ErrorFallback}>
                    <Tabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                        className={cn(
                            isMenuItem && "flex min-h-0 flex-1 flex-col",
                        )}
                    >
                        <div className="sticky top-0 z-10 flex w-full shrink-0 items-center justify-between gap-2 border-b bg-background px-2 py-2">
                            {isMenuItem ? (
                                <Button
                                    ref={notificationBackRef}
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-11 shrink-0 rounded-full"
                                    aria-label="Back to account and navigation"
                                    onClick={returnToAccountMenu}
                                >
                                    <Icons.ChevronLeft className="size-5" />
                                </Button>
                            ) : null}
                            <ButtonGroup className="shrink-0" role="tablist">
                                {NOTIFICATION_TABS.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.value;

                                    return (
                                        <Button
                                            key={tab.value}
                                            type="button"
                                            size="sm"
                                            variant={
                                                isActive ? "default" : "outline"
                                            }
                                            role="tab"
                                            aria-selected={isActive}
                                            className={cn(
                                                "h-8 px-2.5 text-xs uppercase",
                                                isActive
                                                    ? "bg-foreground text-background hover:bg-foreground/90"
                                                    : "text-muted-foreground",
                                            )}
                                            onClick={() =>
                                                setActiveTab(tab.value)
                                            }
                                        >
                                            <Icon data-icon="inline-start" />
                                            <span>{tab.label}</span>
                                        </Button>
                                    );
                                })}
                            </ButtonGroup>
                            <div className="flex min-w-0 items-center gap-1">
                                <DropdownMenu.Root>
                                    <DropdownMenu.Trigger asChild>
                                        <Button
                                            variant="ghost"
                                            size={
                                                isMenuItem
                                                    ? "icon"
                                                    : selectedTypeLabel
                                                      ? "sm"
                                                      : "icon"
                                            }
                                            className={cn(
                                                "h-8 rounded-full",
                                                isMenuItem
                                                    ? "w-8 px-0"
                                                    : "max-w-[155px] px-2",
                                            )}
                                            aria-label="Filter notifications"
                                        >
                                            <Icons.Filter size={16} />
                                            {selectedTypeLabel &&
                                            !isMenuItem ? (
                                                <span className="ml-1 truncate text-xs font-normal">
                                                    {selectedTypeLabel}
                                                </span>
                                            ) : null}
                                        </Button>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Content
                                        align="end"
                                        className="w-64"
                                    >
                                        <DropdownMenu.Label>
                                            Filter notifications
                                        </DropdownMenu.Label>
                                        <DropdownMenu.Item
                                            onSelect={() =>
                                                setSelectedFilter(null)
                                            }
                                            className="flex items-center justify-between gap-3"
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                {!selectedType ? (
                                                    <Icons.Check
                                                        size={14}
                                                        className="shrink-0"
                                                    />
                                                ) : (
                                                    <span className="size-3.5 shrink-0" />
                                                )}
                                                <span className="truncate">
                                                    All
                                                </span>
                                            </span>
                                            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                                                {activeTypeCount}
                                            </span>
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Separator />
                                        {activeTypeSummary.length ? (
                                            activeTypeSummary.map((item) => (
                                                <DropdownMenu.Item
                                                    key={item.type}
                                                    onSelect={() =>
                                                        setSelectedFilter({
                                                            type: item.type,
                                                            title: item.title,
                                                        })
                                                    }
                                                    className="flex items-center justify-between gap-3"
                                                >
                                                    <span className="flex min-w-0 items-center gap-2">
                                                        {selectedType ===
                                                        item.type ? (
                                                            <Icons.Check
                                                                size={14}
                                                                className="shrink-0"
                                                            />
                                                        ) : (
                                                            <span className="size-3.5 shrink-0" />
                                                        )}
                                                        <span className="truncate">
                                                            {item.title}
                                                        </span>
                                                    </span>
                                                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                                                        {item.count}
                                                    </span>
                                                </DropdownMenu.Item>
                                            ))
                                        ) : (
                                            <DropdownMenu.Item disabled>
                                                No filters yet
                                            </DropdownMenu.Item>
                                        )}
                                    </DropdownMenu.Content>
                                </DropdownMenu.Root>
                                {isMenuItem ? (
                                    <Button
                                        asChild
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 rounded-full"
                                    >
                                        <Link
                                            href="/settings/notification-channels/v2"
                                            aria-label="Notification settings"
                                            onClick={closeForAction}
                                        >
                                            <Icons.Settings className="size-4" />
                                        </Link>
                                    </Button>
                                ) : (
                                    <NotificationSettingsSheet />
                                )}
                            </div>
                        </div>

                        <Tabs.Content
                            value="inbox"
                            className={cn(
                                "relative mt-0",
                                isMenuItem &&
                                    "min-h-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col",
                            )}
                        >
                            {isLoading && !unreadNotifications.length && (
                                <div className="divide-y">
                                    {SKELETON_ROW_KEYS.map((key) => (
                                        <div
                                            key={key}
                                            className="flex items-start gap-4 px-3 py-3"
                                        >
                                            <div className="h-9 w-9 rounded-full bg-accent" />
                                            <div className="min-w-0 flex-1 space-y-2">
                                                <div className="h-3 w-2/3 rounded bg-accent" />
                                                <div className="h-3 w-full rounded bg-accent" />
                                                <div className="h-2 w-24 rounded bg-accent" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!isLoading && !unreadNotifications.length && (
                                <EmptyState
                                    description={inboxEmptyDescription}
                                />
                            )}

                            {!isLoading && unreadNotifications.length > 0 && (
                                <ScrollArea
                                    className={cn(
                                        "pb-12",
                                        isMenuItem
                                            ? "min-h-0 flex-1"
                                            : "h-[485px]",
                                    )}
                                >
                                    <div className="divide-y">
                                        {unreadNotifications.map(
                                            (notification) => {
                                                return (
                                                    <NotificationItem
                                                        key={notification.id}
                                                        setOpen={setOpen}
                                                        activity={notification}
                                                        onAction={onAction}
                                                        onArchive={
                                                            markMessageAsRead
                                                        }
                                                        isUpdating={isUpdating}
                                                    />
                                                );
                                            },
                                        )}
                                    </div>
                                    {inbox.hasNextPage ? (
                                        <div className="flex justify-center border-t p-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                disabled={
                                                    inbox.isFetchingNextPage
                                                }
                                                onClick={() =>
                                                    inbox.fetchNextPage()
                                                }
                                            >
                                                {inbox.isFetchingNextPage
                                                    ? "Loading..."
                                                    : "Load more"}
                                            </Button>
                                        </div>
                                    ) : null}
                                </ScrollArea>
                            )}

                            {!isLoading && unreadNotifications.length > 0 && (
                                <div className="h-12 w-full absolute bottom-0 flex items-center justify-center border-t-[1px]">
                                    <Button
                                        variant="secondary"
                                        className="bg-transparent"
                                        disabled={isUpdating}
                                        onClick={markAllMessagesAsRead}
                                    >
                                        Archive all
                                    </Button>
                                </div>
                            )}
                        </Tabs.Content>

                        <TabsContent
                            value="archive"
                            className={cn(
                                "mt-0",
                                isMenuItem &&
                                    "min-h-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col",
                            )}
                        >
                            {isLoading && !archivedNotifications.length && (
                                <div className="divide-y">
                                    {SKELETON_ROW_KEYS.map((key) => (
                                        <div
                                            key={key}
                                            className="flex items-start gap-4 px-3 py-3"
                                        >
                                            <div className="h-9 w-9 rounded-full bg-accent" />
                                            <div className="min-w-0 flex-1 space-y-2">
                                                <div className="h-3 w-2/3 rounded bg-accent" />
                                                <div className="h-3 w-full rounded bg-accent" />
                                                <div className="h-2 w-24 rounded bg-accent" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!isLoading && !archivedNotifications.length && (
                                <EmptyState
                                    description={archiveEmptyDescription}
                                />
                            )}

                            {!isLoading && archivedNotifications.length > 0 && (
                                <ScrollArea
                                    className={cn(
                                        isMenuItem
                                            ? "min-h-0 flex-1"
                                            : "h-[490px]",
                                    )}
                                >
                                    <div className="divide-y">
                                        {archivedNotifications.map(
                                            (notification) => {
                                                return (
                                                    <NotificationItem
                                                        key={notification.id}
                                                        setOpen={setOpen}
                                                        activity={notification}
                                                        onAction={onAction}
                                                        isUpdating={isUpdating}
                                                    />
                                                );
                                            },
                                        )}
                                    </div>
                                    {archive.hasNextPage ? (
                                        <div className="flex justify-center border-t p-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                disabled={
                                                    archive.isFetchingNextPage
                                                }
                                                onClick={() =>
                                                    archive.fetchNextPage()
                                                }
                                            >
                                                {archive.isFetchingNextPage
                                                    ? "Loading..."
                                                    : "Load more"}
                                            </Button>
                                        </div>
                                    ) : null}
                                </ScrollArea>
                            )}
                        </TabsContent>
                    </Tabs>
                </ErrorBoundary>
            </NotificationSurface>
        </Popover>
    );
}
