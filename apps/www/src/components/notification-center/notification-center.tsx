"use client";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Popover, Tabs } from "@gnd/ui/namespace";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { TabsContent } from "@gnd/ui/tabs";
import {
	type TransformedNotification,
	createNotificationHandlers,
	runNotificationAction,
} from "@notifications/notification-center";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ErrorFallback } from "../error-fallback";
import { EmptyState } from "./empty-state";
import { NotificationItem } from "./notification-item";

export function NotificationCenter() {
	const [isOpen, setOpen] = useState(false);
	const router = useRouter();
	const { hasUnseenNotifications, notifications, archived, isLoading } =
		useNotifications();
	const unreadNotifications = notifications; // Main notifications (unread/read)
	const archivedNotifications = archived; // Archived notifications
	useEffect(() => {
		if (isOpen && hasUnseenNotifications) {
			//  markAllMessagesAsSeen();
		}
	}, [hasUnseenNotifications, isOpen]);

	const handlers = createNotificationHandlers<{ close: () => void }>({
		job_task_configure_request: (data, _notification, context) => {
			context.close();
			const params = new URLSearchParams({
				view: "template-edit",
				editCommunityModelInstallCostId: String(
					data.communityModelInstallCostId,
				),
				selectedBuilderTaskId: String(data.builderTaskId),
			});
			router.push(`/community/template-schema?${params.toString()}`);
			toast.info(
				`Open task configuration for ${data.modelName} (${data.projectName})`,
			);
		},
		dispatch_packing_delay: (data, _notification, context) => {
			context.close();
			router.push("/sales-book/dispatch");
			toast.success(
				`Approved pending packing for ${data.itemName}. Dispatch #${data.dispatchId}.`,
			);
		},
	});

	const onAction = async (notification: TransformedNotification) => {
		await runNotificationAction(notification, handlers, {
			close: () => setOpen(false),
		});
	};

	return (
		<Popover>
			<Popover.Trigger asChild>
				<Button
					variant="outline"
					size="icon"
					className="rounded-full w-8 h-8 flex items-center relative"
				>
					{hasUnseenNotifications && (
						<div className="w-1.5 h-1.5 bg-destructive rounded-full absolute top-0 right-0" />
					)}
					<Icons.Notifications />
				</Button>
			</Popover.Trigger>
			<Popover.Content
				className="h-[535px] w-screen md:w-[400px] p-0 overflow-hidden relative"
				align="end"
				sideOffset={10}
			>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Tabs defaultValue="inbox">
						<Tabs.List className="w-full justify-between bg-transparent border-b-[1px] rounded-none py-6">
							<div className="flex">
								<Tabs.Trigger value="inbox" className="font-normal">
									Inbox
								</Tabs.Trigger>
								<Tabs.Trigger value="archive" className="font-normal">
									Archive
								</Tabs.Trigger>
							</div>
							<Link
								// href="/settings/notifications"
								href=""
								onClick={() => setOpen(false)}
							>
								<Button
									variant="ghost"
									size="icon"
									className="items-center justify-center transition-colors h-9 w-9 rounded-full bg-ransparent hover:bg-accent mr-2"
								>
									<Icons.Settings size={16} />
								</Button>
							</Link>
						</Tabs.List>

						<Tabs.Content value="inbox" className="relative mt-0">
							{!isLoading && !unreadNotifications.length && (
								<EmptyState description="No new notifications" />
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
												/>
											);
										})}
									</div>
								</ScrollArea>
							)}

							{!isLoading && unreadNotifications.length > 0 && (
								<div className="h-12 w-full absolute bottom-0 flex items-center justify-center border-t-[1px]">
									<Button
										variant="secondary"
										className="bg-transparent"
										// onClick={markAllMessagesAsRead}
									>
										Archive all
									</Button>
								</div>
							)}
						</Tabs.Content>

						<TabsContent value="archive" className="mt-0">
							{!isLoading && !archivedNotifications.length && (
								<EmptyState description="Nothing in the archive" />
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
												/>
											);
										})}
									</div>
								</ScrollArea>
							)}
						</TabsContent>
					</Tabs>
				</ErrorBoundary>
			</Popover.Content>
		</Popover>
	);
}
