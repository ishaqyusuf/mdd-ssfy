"use client";

import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { useJobParams } from "@/hooks/use-contractor-jobs-params";
import { useDocumentReviewParams } from "@/hooks/use-document-review-params";
import { useIdleQueryEnabled } from "@/hooks/use-idle-query-enabled";
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
import { useEffect, useMemo, useState } from "react";
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

export function NotificationCenter() {
	const [isOpen, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState("inbox");
	const [selectedFilter, setSelectedFilter] = useState<{
		type: string;
		title: string;
	} | null>(null);
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
			? activeTypeSummary.find((item) => item.type === selectedType)?.title
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
	const { setParams: setCommunityInstallCostParams } =
		useCommunityInstallCostParams();
	const { setParams: setJobParams } = useJobParams();
	const { setParams: setDocumentReviewParams } = useDocumentReviewParams();
	const salesOverview = useSalesOverviewOpen();
	const legacySalesOverview = useSalesOverviewQuery();
	const handlers = createNotificationHandlers<{ close: () => void }>({
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
		sales_marked_as_production_completed: (data, _notification, context) => {
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
		community_unit_production_batch_updated: (data, _notification, context) => {
			context.close();
			const ids = Array.isArray(data.taskId) ? data.taskId.join(",") : "";
			if (!ids) return;
			router.push(`/community/unit-productions?ids=${encodeURIComponent(ids)}`);
		},
		dispatch_packing_delay: (data, _notification, context) => {
			context.close();
			router.push("/sales-book/dispatch");
			toast.success(
				`Approved pending packing for ${data.itemName}. Dispatch #${data.dispatchId}.`,
			);
		},
		sales_dispatch_duplicate_alert: (data, _notification, context) => {
			context.close();
			router.push(
				`/sales-book/dispatch?q=${encodeURIComponent(String(data.dispatchId))}`,
			);
			toast.info(`Duplicate dispatch alert opened for #${data.dispatchId}.`);
		},
	});

	const onAction = async (notification: TransformedNotification) => {
		await runNotificationAction(notification, handlers, {
			close: () => setOpen(false),
		});
	};
	const unreadBadge =
		unreadCount > 9 ? "9+" : unreadCount > 0 ? String(unreadCount) : null;

	return (
		<Popover open={isOpen} onOpenChange={setOpen}>
			<Popover.Trigger asChild>
				<Button
					variant="outline"
					size="icon"
					className="rounded-full w-8 h-8 flex items-center relative"
					aria-label="Notifications"
				>
					{unreadBadge && (
						<span className="-right-1 -top-1 absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground leading-none">
							{unreadBadge}
						</span>
					)}
					<Icons.Bell />
				</Button>
			</Popover.Trigger>
			<Popover.Content
				className="h-[535px] w-screen md:w-[400px] p-0 overflow-hidden relative"
				align="end"
				sideOffset={10}
			>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Tabs value={activeTab} onValueChange={setActiveTab}>
						<div className="flex w-full items-center justify-between gap-2 border-b bg-background px-2 py-2">
							<ButtonGroup className="shrink-0" role="tablist">
								{NOTIFICATION_TABS.map((tab) => {
									const Icon = tab.icon;
									const isActive = activeTab === tab.value;

									return (
										<Button
											key={tab.value}
											type="button"
											size="sm"
											variant={isActive ? "default" : "outline"}
											role="tab"
											aria-selected={isActive}
											className={cn(
												"h-8 px-2.5 text-xs uppercase",
												isActive
													? "bg-foreground text-background hover:bg-foreground/90"
													: "text-muted-foreground",
											)}
											onClick={() => setActiveTab(tab.value)}
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
											size={selectedTypeLabel ? "sm" : "icon"}
											className="h-8 max-w-[155px] rounded-full px-2"
											aria-label="Filter notifications"
										>
											<Icons.Filter size={16} />
											{selectedTypeLabel ? (
												<span className="ml-1 truncate text-xs font-normal">
													{selectedTypeLabel}
												</span>
											) : null}
										</Button>
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end" className="w-64">
										<DropdownMenu.Label>Filter notifications</DropdownMenu.Label>
										<DropdownMenu.Item
											onSelect={() => setSelectedFilter(null)}
											className="flex items-center justify-between gap-3"
										>
											<span className="flex min-w-0 items-center gap-2">
												{!selectedType ? (
													<Icons.Check size={14} className="shrink-0" />
												) : (
													<span className="size-3.5 shrink-0" />
												)}
												<span className="truncate">All</span>
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
														{selectedType === item.type ? (
															<Icons.Check size={14} className="shrink-0" />
														) : (
															<span className="size-3.5 shrink-0" />
														)}
														<span className="truncate">{item.title}</span>
													</span>
													<span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
														{item.count}
													</span>
												</DropdownMenu.Item>
											))
										) : (
											<DropdownMenu.Item disabled>No filters yet</DropdownMenu.Item>
										)}
									</DropdownMenu.Content>
								</DropdownMenu.Root>
								<NotificationSettingsSheet />
							</div>
						</div>

						<Tabs.Content value="inbox" className="relative mt-0">
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
								<EmptyState description={inboxEmptyDescription} />
							)}

							{!isLoading && unreadNotifications.length > 0 && (
								<ScrollArea className="pb-12 h-[485px]">
									<div className="divide-y">
										{unreadNotifications.map((notification) => {
											return (
												<NotificationItem
													key={notification.id}
													setOpen={setOpen}
													activity={notification}
													onAction={onAction}
													onArchive={markMessageAsRead}
													isUpdating={isUpdating}
												/>
											);
										})}
									</div>
									{inbox.hasNextPage ? (
										<div className="flex justify-center border-t p-2">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												disabled={inbox.isFetchingNextPage}
												onClick={() => inbox.fetchNextPage()}
											>
												{inbox.isFetchingNextPage ? "Loading..." : "Load more"}
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

						<TabsContent value="archive" className="mt-0">
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
								<EmptyState description={archiveEmptyDescription} />
							)}

							{!isLoading && archivedNotifications.length > 0 && (
								<ScrollArea className="h-[490px]">
									<div className="divide-y">
										{archivedNotifications.map((notification) => {
											return (
												<NotificationItem
													key={notification.id}
													setOpen={setOpen}
													activity={notification}
													onAction={onAction}
													isUpdating={isUpdating}
												/>
											);
										})}
									</div>
									{archive.hasNextPage ? (
										<div className="flex justify-center border-t p-2">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												disabled={archive.isFetchingNextPage}
												onClick={() => archive.fetchNextPage()}
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
			</Popover.Content>
		</Popover>
	);
}
