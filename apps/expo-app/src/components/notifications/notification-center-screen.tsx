import { BackBtn } from "@/components/back-btn";
import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications } from "@/hooks/use-notifications";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { NotificationItem } from "./notification-item";

type NotificationActivity = RouterOutputs["notes"]["list"]["data"][number];

function EmptyState({ description }: { description: string }) {
	return (
		<View className="flex-1 items-center justify-center px-8">
			<View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-muted">
				<Icon name="Mail" className="text-muted-foreground" size={18} />
			</View>
			<Text className="text-center text-sm text-muted-foreground">
				{description}
			</Text>
		</View>
	);
}

function NotificationList({
	items,
	markMessageAsRead,
}: {
	items: NotificationActivity[];
	markMessageAsRead: (id: number) => void;
}) {
	if (!items.length) {
		return <EmptyState description="Nothing here yet." />;
	}

	return (
		<ScrollView
			className="flex-1"
			contentContainerClassName="pb-24"
			showsVerticalScrollIndicator={false}
		>
			<View className="divide-y divide-border">
				{items.map((item) => (
					<NotificationItem
						key={item.id}
						activity={item}
						onPress={markMessageAsRead}
					/>
				))}
			</View>
		</ScrollView>
	);
}

export function NotificationCenterScreen() {
	const [tab, setTab] = useState("inbox");
	const { isLoading, error, notifications, archived, markMessageAsRead } =
		useNotifications();

	return (
		<SafeArea>
			<View className="flex-1 bg-background">
				<View className="flex-row items-center justify-between border-b border-border px-4 py-3">
					<BackBtn />
					<Text className="text-base font-bold text-foreground">
						Notifications
					</Text>
					<Pressable
						className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
						accessibilityRole="button"
					>
						<Icon name="Settings" className="text-foreground" size={18} />
					</Pressable>
				</View>

				<Tabs value={tab} onValueChange={setTab} className="flex-1">
					<View className="border-b border-border px-4 py-3">
						<TabsList className="h-10">
							<TabsTrigger value="inbox" className="px-6">
								<Text>Inbox</Text>
							</TabsTrigger>
							<TabsTrigger value="archive" className="px-6">
								<Text>Archive</Text>
							</TabsTrigger>
						</TabsList>
					</View>

					<TabsContent value="inbox">
						{isLoading ? (
							<EmptyState description="Loading notifications..." />
						) : error ? (
							<EmptyState description="Unable to load notifications right now." />
						) : notifications.length ? (
							<>
								<NotificationList
									items={notifications}
									markMessageAsRead={markMessageAsRead}
								/>
								<View className="absolute bottom-0 left-0 right-0 border-t border-border bg-card px-4 py-2">
									<Pressable
										className="h-10 items-center justify-center rounded-full opacity-50"
										disabled
									>
										<Text className="text-sm font-medium text-foreground">
											Archive all
										</Text>
									</Pressable>
								</View>
							</>
						) : (
							<EmptyState description="No new notifications" />
						)}
					</TabsContent>

					<TabsContent value="archive">
						{isLoading ? (
							<EmptyState description="Loading notifications..." />
						) : error ? (
							<EmptyState description="Unable to load notifications right now." />
						) : archived.length ? (
							<NotificationList
								items={archived}
								markMessageAsRead={markMessageAsRead}
							/>
						) : (
							<EmptyState description="Nothing in the archive" />
						)}
					</TabsContent>
				</Tabs>
			</View>
		</SafeArea>
	);
}
