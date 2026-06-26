import { GeneralHomeHeader } from "@/components/home/general-home-header";
import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { useSalesDashboardOverview } from "@/features/sales/api/use-sales-dashboard-overview";
import { useAuthContext } from "@/hooks/use-auth";
import { useRouter } from "expo-router";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { NewSalesTypeSheet } from "./new-sales-type-sheet";
import { toRecentSalesDocumentItem } from "./sales-dashboard-recent-sales";
import { SalesDashboardSkeleton } from "./sales-dashboard-skeleton";
import { SalesInvoiceListCard2 } from "./sales-invoice-list-card-2";

export function SalesDashboardScreen() {
	const router = useRouter();
	const auth = useAuthContext();
	const { data, isPending, refetch, isRefetching } =
		useSalesDashboardOverview();

	return (
		<SafeArea>
			<View className="flex-1 bg-background">
				<GeneralHomeHeader className="px-4 pb-3" showNotificationDot={false} />

				<View className="flex-1">
					<View className="mb-3 mt-1 px-4 pb-1 pt-1">
						<Text className="text-2xl font-bold text-foreground">
							Sales Dashboard
						</Text>
						<Text className="text-sm text-muted-foreground">
							Orders and fulfillment overview.
						</Text>
					</View>
					{isPending ? (
						<SalesDashboardSkeleton />
					) : (
						<ScrollView
							contentContainerStyle={{
								paddingTop: 4,
								paddingBottom: 36,
								paddingHorizontal: 16,
							}}
							refreshControl={
								<RefreshControl
									refreshing={isRefetching}
									onRefresh={() => refetch()}
								/>
							}
						>
							<View className="mb-5 flex-row flex-wrap gap-3">
								<StatCard label="Orders" value={data?.orders?.total || 0} />
								<StatCard
									label="Delivery In Progress"
									value={data?.delivery?.inProgress || 0}
								/>
								<StatCard
									label="Production In Progress"
									value={data?.production?.inProgress || 0}
								/>
								<StatCard
									label="Production Completed"
									value={data?.production?.completed || 0}
								/>
							</View>

							<View className="gap-3">
								<NewSalesTypeSheet />

								<Pressable
									onPress={() => router.push("/(sales)/orders")}
									className="rounded-2xl border border-border bg-card p-4 active:opacity-80"
								>
									<View className="flex-row items-center justify-between">
										<View className="flex-row items-center gap-3">
											<View className="rounded-full bg-primary/10 p-2">
												<Icon
													name="ClipboardList"
													className="text-primary"
													size={18}
												/>
											</View>
											<View>
												<Text className="text-base font-semibold text-foreground">
													Orders
												</Text>
												<Text className="text-xs text-muted-foreground">
													Search and manage deliveries
												</Text>
											</View>
										</View>
										<Icon
											name="ChevronRight"
											className="text-muted-foreground"
											size={20}
										/>
									</View>
								</Pressable>

								<Pressable
									onPress={() => router.push("/(sales)/quotes")}
									className="rounded-2xl border border-border bg-card p-4 active:opacity-80"
								>
									<View className="flex-row items-center justify-between">
										<View className="flex-row items-center gap-3">
											<View className="rounded-full bg-primary/10 p-2">
												<Icon
													name="FileText"
													className="text-primary"
													size={18}
												/>
											</View>
											<View>
												<Text className="text-base font-semibold text-foreground">
													Quotes
												</Text>
												<Text className="text-xs text-muted-foreground">
													Search and edit customer quotes
												</Text>
											</View>
										</View>
										<Icon
											name="ChevronRight"
											className="text-muted-foreground"
											size={20}
										/>
									</View>
								</Pressable>
							</View>
							<View className="mt-6">
								<View className="mb-3 flex-row items-center justify-between">
									<Text className="text-base font-bold text-foreground">
										Recent Sales
									</Text>
									<Text className="text-xs font-medium text-muted-foreground">
										Last 10 records
									</Text>
								</View>

								{(data?.recentSales || []).length ? (
									<View className="gap-2">
										{(data?.recentSales || []).map((sale) => {
											const item = toRecentSalesDocumentItem(sale);

											return (
												<SalesInvoiceListCard2
													type="order"
													key={String(sale.id)}
													item={item}
													onPress={() =>
														router.push({
															pathname: "/(sales)/orders/[orderNo]",
															params: { orderNo: sale.orderId },
														})
													}
												/>
											);
										})}
									</View>
								) : (
									<View className="rounded-2xl border border-dashed border-border p-4">
										<Text className="text-sm text-muted-foreground">
											No recent sales found.
										</Text>
									</View>
								)}
							</View>
						</ScrollView>
					)}
				</View>
			</View>
			{auth.isAdmin ? (
				<View className="absolute bottom-8 right-5">
					<Pressable
						onPress={() => router.push("/(sales)/dispatch/new")}
						className="h-14 w-14 items-center justify-center rounded-full bg-primary shadow-md active:opacity-85"
					>
						<Icon name="Plus" className="text-primary-foreground" size={24} />
					</Pressable>
				</View>
			) : null}
		</SafeArea>
	);
}

function StatCard({ label, value }: { label: string; value: number }) {
	return (
		<View className="min-h-[96px] min-w-[47%] flex-1 rounded-2xl border border-border bg-card p-4">
			<Text className="text-xs font-medium text-muted-foreground">{label}</Text>
			<Text className="mt-1.5 text-3xl font-bold text-foreground">{value}</Text>
		</View>
	);
}
