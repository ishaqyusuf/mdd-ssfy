import { SafeArea } from "@/components/safe-area";
import { _trpc } from "@/components/static-trpc";
import { Icon, type IconKeys } from "@/components/ui/icon";
import { Pressable as AppPressable } from "@/components/ui/pressable";
import { useSalesDocumentOverview } from "@/features/sales/api/use-sales-order-overview";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { type Href, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	BackHandler,
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NewSalesFormType } from "../invoice-form/types";
import {
	type SalesDocumentOverviewAction,
	getSalesDocumentOverviewMoreActions,
} from "./sales-document-overview-actions";
import {
	type SalesDocumentOverviewItem,
	type SalesDocumentOverviewSale,
	buildSalesDocumentOverviewItems,
	getSalesDocumentOverviewAmounts,
	getSalesDocumentOverviewCopy,
	getSalesDocumentOverviewFinancialDetails,
	getSalesDocumentOverviewPrimaryAction,
	toSalesOverviewMoney,
} from "./sales-document-overview-model";
import { SalesDocumentOverviewMoreSheet } from "./sales-document-overview-more-sheet";

type OverviewAddress = {
	lines?: Array<string | null | undefined>;
	address?: string | null;
} | null;
type SalesOverviewData =
	| (NonNullable<RouterOutputs["sales"]["getSaleOverview"]> &
			SalesDocumentOverviewSale & {
				addressData?: {
					billing?: OverviewAddress;
					shipping?: OverviewAddress;
				} | null;
			})
	| null
	| undefined;
type DispatchOverviewData = RouterOutputs["dispatch"]["orderDispatchOverview"];

type Props = {
	orderNo: string;
};

export function SalesOrderDetailScreen({ orderNo }: Props) {
	return <SalesDocumentOverviewScreen documentNo={orderNo} type="order" />;
}

type SalesDocumentOverviewScreenProps = {
	documentNo: string;
	type: NewSalesFormType;
};

export function SalesDocumentOverviewScreen({
	documentNo,
	type,
}: SalesDocumentOverviewScreenProps) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const queryClient = useQueryClient();
	const copySaleMutation = useMutation(_trpc.sales.copySale.mutationOptions());
	const goSalesHome = useCallback(() => {
		router.dismissAll();
		router.replace("/(sales)" as Href);
	}, [router]);

	useFocusEffect(
		useCallback(() => {
			const subscription = BackHandler.addEventListener(
				"hardwareBackPress",
				() => {
					goSalesHome();
					return true;
				},
			);

			return () => subscription.remove();
		}, [goSalesHome]),
	);

	const { sale, dispatch } = useSalesDocumentOverview(documentNo, type);

	const saleData = sale.data as SalesOverviewData;
	const dispatchData = dispatch.data as DispatchOverviewData | null | undefined;

	const deliveryItems = dispatchData?.deliveries || [];
	const overviewItems = buildSalesDocumentOverviewItems({
		sale: saleData,
		dispatch: dispatchData,
	});
	const [showAllItems, setShowAllItems] = useState(false);
	const [moreSheetOpen, setMoreSheetOpen] = useState(false);
	const visibleItems = showAllItems ? overviewItems : overviewItems.slice(0, 5);
	const hiddenItemCount = Math.max(
		0,
		overviewItems.length - visibleItems.length,
	);
	const amounts = getSalesDocumentOverviewAmounts(saleData);
	const copy = getSalesDocumentOverviewCopy(type, saleData, documentNo);
	const financialDetails = getSalesDocumentOverviewFinancialDetails(
		saleData,
		type,
	);
	const primaryAction = getSalesDocumentOverviewPrimaryAction(type, saleData);
	const moreActions = getSalesDocumentOverviewMoreActions({
		type,
		sale: saleData,
	});
	const hasFooterActions = !!primaryAction || moreActions.length > 0;
	const refreshing = sale.isRefetching || dispatch.isRefetching;
	const refreshOverview = () => {
		sale.refetch();
		if (type === "order") dispatch.refetch();
	};
	const invalidateSalesDocumentQueries = async () => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: _trpc.sales.mobileDashboardOverview.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: _trpc.sales.getOrders.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: _trpc.sales.quotes.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: _trpc.sales.getSaleOverview.queryKey(),
			}),
		]);
	};
	const openPrimaryAction = () => {
		if (!primaryAction) return;

		if (primaryAction.kind === "edit-quote") {
			router.push({
				pathname: "/(sales)/invoices/[slug]",
				params: { slug: primaryAction.slug, type: "quote" },
			} as Href);
			return;
		}

		router.push({
			pathname: "/(sales)/orders/[orderNo]/delivery/create",
			params: { orderNo: documentNo },
		} as Href);
	};
	const copyDocument = async (as: NewSalesFormType) => {
		const slug = saleData?.slug?.trim();
		if (!slug) return;

		try {
			const result = await copySaleMutation.mutateAsync({
				salesUid: slug,
				as,
				type,
			});
			await invalidateSalesDocumentQueries();

			if (result.error) {
				Alert.alert("Unable to copy", String(result.error));
				return;
			}

			if (result.slug) {
				router.push({
					pathname: "/(sales)/invoices/[slug]",
					params: { slug: result.slug, type: as },
				} as Href);
				return;
			}

			Alert.alert(
				as === "quote" ? "Quote copied" : "Order copied",
				"The copied document was created.",
			);
		} catch {
			Alert.alert("Unable to copy", "Please try again.");
		}
	};

	const handleMoreAction = (action: SalesDocumentOverviewAction) => {
		setMoreSheetOpen(false);
		if (action.id === "edit-document") {
			router.push(action.route as Href);
		}
	};

	if (sale.isPending || dispatch.isPending) {
		return (
			<SafeArea>
				<View className="flex-1 items-center justify-center bg-background">
					<ActivityIndicator />
				</View>
			</SafeArea>
		);
	}

	if (sale.isError) {
		return (
			<OverviewUnavailableState
				title={`${copy.documentLabel} unavailable`}
				message="We couldn't load the live sales overview data for this document."
				actionLabel="Try again"
				onAction={() => sale.refetch()}
			/>
		);
	}

	if (!saleData) {
		return (
			<OverviewUnavailableState
				title={`${copy.documentLabel} not found`}
				message={`${copy.documentLabel} #${documentNo} was not found in the sales database.`}
				actionLabel="Go home"
				onAction={goSalesHome}
			/>
		);
	}

	const tone = statusTone(copy.statusLabel);

	return (
		<SafeArea>
			<View className="flex-1 bg-muted/30">
				<View className="border-b border-border bg-card px-4 pb-4 pt-4">
					<View className="flex-row items-center gap-3">
						<Pressable
							onPress={goSalesHome}
							className="h-9 w-9 items-center justify-center rounded-md active:bg-muted"
						>
							<Icon name="ArrowLeft" className="text-foreground" size={18} />
						</Pressable>
						<View className="flex-1">
							<Text className="text-xs font-bold uppercase tracking-widest text-foreground">
								{copy.title}
							</Text>
							<Text className="mt-0.5 text-[11px] font-medium text-muted-foreground">
								{copy.subtitle}
							</Text>
						</View>
						<View className={`rounded-md px-2 py-1 ${tone.chip}`}>
							<Text className={`text-[10px] font-bold uppercase ${tone.text}`}>
								{copy.statusLabel}
							</Text>
						</View>
					</View>
				</View>

				<ScrollView
					style={{ flex: 1 }}
					contentContainerStyle={{
						paddingHorizontal: 16,
						paddingTop: 16,
						paddingBottom: hasFooterActions ? 112 + insets.bottom : 28,
					}}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={refreshOverview}
						/>
					}
					showsVerticalScrollIndicator={false}
					nestedScrollEnabled
					scrollEnabled
					bounces
					alwaysBounceVertical
					scrollEventThrottle={16}
				>
					<View className="gap-4">
						<OverviewCard className="border border-border bg-card">
							<View className="border-b border-border bg-muted/20 px-4 py-3">
								<View className="flex-row items-center justify-between gap-3">
									<Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
										Customer:{" "}
										<Text className="text-foreground">
											{saleData?.displayName || "Customer"}
										</Text>
									</Text>
									<Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
										{amounts.paidPct.toFixed(0)}% Paid
									</Text>
								</View>
							</View>
							<View className="flex-row divide-x divide-border">
								<MetricPill
									label={copy.totalLabel}
									value={toSalesOverviewMoney(amounts.total)}
								/>
								<MetricPill
									label="Paid"
									value={toSalesOverviewMoney(amounts.paid)}
									valueClassName="text-emerald-700 dark:text-emerald-300"
								/>
								<MetricPill
									label={copy.openAmountLabel}
									value={toSalesOverviewMoney(amounts.due)}
									valueClassName="text-red-600 dark:text-red-300"
								/>
							</View>
						</OverviewCard>

						<FinancialOverviewCard
							balanceLabel={copy.balanceLabel}
							ledgerRows={financialDetails.ledgerRows}
							paymentMethod={financialDetails.paymentMethod}
							progressStats={financialDetails.progressStats}
							due={amounts.due}
							paidPct={amounts.paidPct}
						/>

						<ContactOverviewCard
							name={saleData?.displayName || "-"}
							phone={saleData?.customerPhone || "Not provided"}
							email={saleData?.email || "Not provided"}
							billingAddress={
								saleData?.addressData?.billing || {
									address: saleData?.address || "No billing address set",
								}
							}
						/>

						<Section title="Items" icon="LayoutGrid" contentClassName="p-0">
							{visibleItems.length ? (
								<View>
									{visibleItems.map((item) => (
										<OverviewItemRow key={item.key} item={item} />
									))}
									{hiddenItemCount > 0 ? (
										<Pressable
											onPress={() => setShowAllItems(true)}
											className="border-t border-border/70 px-4 py-3 active:opacity-70"
										>
											<Text className="text-[11px] font-bold uppercase tracking-wider text-primary">
												View {hiddenItemCount} more item
												{hiddenItemCount === 1 ? "" : "s"}
											</Text>
										</Pressable>
									) : null}
								</View>
							) : (
								<Text className="px-4 py-4 text-xs text-muted-foreground">
									{copy.emptyItemsLabel}
								</Text>
							)}
						</Section>

						{copy.showOrderLogistics ? (
							<Section title="Activities" icon="Clock">
								{deliveryItems.length ? (
									<View className="gap-2">
										{deliveryItems.slice(0, 8).map((delivery) => (
											<View
												key={delivery.id}
												className="rounded-2xl border border-border/60 bg-background px-3 py-3"
											>
												<View className="flex-row items-center justify-between">
													<Text className="text-sm font-semibold text-foreground">
														Delivery #{delivery.id}
													</Text>
													<Text className="text-xs uppercase text-muted-foreground">
														{delivery.status || "queue"}
													</Text>
												</View>
												<Text className="mt-1 text-xs text-muted-foreground">
													{delivery.dueDate
														? new Date(delivery.dueDate).toDateString()
														: "No due date"}
												</Text>
											</View>
										))}
									</View>
								) : (
									<Text className="text-xs text-muted-foreground">
										{copy.emptyActivitiesLabel}
									</Text>
								)}
							</Section>
						) : null}

						{copy.showOrderLogistics ? (
							<Section title="Deliveries" icon="Truck">
								{deliveryItems.length ? (
									<View>
										{deliveryItems.map((delivery) => (
											<Pressable
												key={delivery.id}
												onPress={() =>
													router.push({
														pathname:
															"/(sales)/orders/[orderNo]/delivery/[dispatchId]",
														params: {
															orderNo: documentNo,
															dispatchId: String(delivery.id),
														},
													} as Href)
												}
												className="border-b border-border/70 py-3 active:opacity-80"
											>
												<View className="flex-row items-center justify-between">
													<Text className="text-[13px] font-semibold text-foreground">
														Delivery #{delivery.id}
													</Text>
													<Icon
														name="ChevronRight"
														className="text-muted-foreground"
														size={15}
													/>
												</View>
												<Text className="mt-1 text-xs text-muted-foreground">
													{delivery.status || "queue"}
													{delivery?.driver?.name
														? ` • ${delivery.driver.name}`
														: ""}
												</Text>
											</Pressable>
										))}
									</View>
								) : (
									<Text className="text-xs text-muted-foreground">
										{copy.emptyDeliveriesLabel}
									</Text>
								)}
							</Section>
						) : null}
					</View>
				</ScrollView>

				{hasFooterActions ? (
					<View
						pointerEvents="box-none"
						style={{
							position: "absolute",
							left: 0,
							right: 0,
							bottom: Math.max(insets.bottom, 0),
						}}
					>
						<View className="border-t border-border bg-card/95 px-4 py-4">
							<View className="flex-row items-center gap-3">
								{primaryAction ? (
									<Pressable
										onPress={openPrimaryAction}
										className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-primary active:opacity-85"
									>
										<Icon
											name={
												primaryAction.kind === "edit-quote" ? "Pencil" : "Truck"
											}
											className="text-primary-foreground"
											size={16}
										/>
										<Text className="text-[13px] font-bold uppercase tracking-widest text-primary-foreground">
											{primaryAction.label}
										</Text>
									</Pressable>
								) : null}
								{moreActions.length > 0 ? (
									<AppPressable
										haptic
										accessibilityRole="button"
										accessibilityLabel="More sales document options"
										onPress={() => setMoreSheetOpen(true)}
										className="h-12 w-12 items-center justify-center rounded-lg border border-border bg-background active:opacity-80"
									>
										<Icon
											name="more"
											className="text-muted-foreground"
											size={21}
										/>
									</AppPressable>
								) : null}
							</View>
						</View>
					</View>
				) : null}
				<SalesDocumentOverviewMoreSheet
					visible={moreSheetOpen}
					actions={moreActions}
					onClose={() => setMoreSheetOpen(false)}
					onSelect={handleMoreAction}
					onCopy={copyDocument}
				/>
			</View>
		</SafeArea>
	);
}

function money(value?: number | null) {
	return toSalesOverviewMoney(value);
}

function addressLines(address?: OverviewAddress) {
	return (address?.lines ?? []).filter((line): line is string => !!line);
}

function statusTone(status?: string | null) {
	const value = String(status || "").toLowerCase();
	if (value.includes("completed") || value === "paid") {
		return {
			chip: "border border-emerald-200 bg-emerald-50",
			text: "text-emerald-700 dark:text-emerald-300",
			dot: "bg-emerald-500",
		};
	}
	if (
		value.includes("progress") ||
		value.includes("part") ||
		value === "open"
	) {
		return {
			chip: "border border-amber-200 bg-amber-50",
			text: "text-amber-700 dark:text-amber-300",
			dot: "bg-amber-500",
		};
	}
	return {
		chip: "border border-primary/20 bg-primary/10",
		text: "text-primary",
		dot: "bg-primary",
	};
}

function OverviewCard({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<View
			className={`overflow-hidden rounded-lg bg-card ${className || "p-4"}`}
		>
			{children}
		</View>
	);
}

function OverviewUnavailableState({
	title,
	message,
	actionLabel,
	onAction,
}: {
	title: string;
	message: string;
	actionLabel: string;
	onAction: () => void;
}) {
	return (
		<SafeArea>
			<View className="flex-1 items-center justify-center bg-muted/30 px-6">
				<View className="w-full max-w-[360px] items-center rounded-lg border border-border/70 bg-card px-5 py-6">
					<View className="mb-4 h-10 w-10 items-center justify-center rounded-full bg-muted">
						<Icon
							name="AlertCircle"
							className="text-muted-foreground"
							size={18}
						/>
					</View>
					<Text className="text-center text-base font-bold text-foreground">
						{title}
					</Text>
					<Text className="mt-2 text-center text-sm text-muted-foreground">
						{message}
					</Text>
					<Pressable
						onPress={onAction}
						className="mt-5 h-11 w-full items-center justify-center rounded-lg bg-primary active:opacity-85"
					>
						<Text className="text-xs font-bold uppercase tracking-widest text-primary-foreground">
							{actionLabel}
						</Text>
					</Pressable>
				</View>
			</View>
		</SafeArea>
	);
}

function Section({
	title,
	icon,
	children,
	contentClassName = "p-4",
}: {
	title: string;
	icon: IconKeys;
	children: React.ReactNode;
	contentClassName?: string;
}) {
	return (
		<View className="overflow-hidden rounded-lg border border-border/70 bg-card">
			<View className="flex-row items-center gap-2 border-b border-border/70 bg-muted/10 px-4 py-3">
				<Icon name={icon} className="text-muted-foreground" size={14} />
				<Text className="text-[10px] font-bold uppercase tracking-widest text-foreground">
					{title}
				</Text>
			</View>
			<View className={contentClassName}>{children}</View>
		</View>
	);
}

function MetricPill({
	label,
	value,
	valueClassName,
}: {
	label: string;
	value: string;
	valueClassName?: string;
}) {
	return (
		<View className="flex-1 px-4 py-4">
			<Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
				{label}
			</Text>
			<Text
				className={`text-base font-bold text-foreground ${valueClassName || ""}`}
			>
				{value}
			</Text>
		</View>
	);
}

function AmountRow({
	label,
	value,
	divider = true,
	labelUppercase = false,
	mutedValue = false,
	edgeToEdge = false,
	valueClassName,
}: {
	label: string;
	value: string;
	divider?: boolean;
	labelUppercase?: boolean;
	mutedValue?: boolean;
	edgeToEdge?: boolean;
	valueClassName?: string;
}) {
	return (
		<View
			className={`flex-row items-center justify-between gap-4 py-2.5 ${
				edgeToEdge ? "px-4" : ""
			} ${divider ? "border-b border-border/70 last:border-b-0" : ""}`}
		>
			<Text
				className={
					labelUppercase
						? "text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
						: "text-sm text-muted-foreground"
				}
			>
				{label}
			</Text>
			<Text
				className={`text-sm font-medium ${
					mutedValue ? "italic text-muted-foreground" : "text-foreground"
				} ${valueClassName || ""}`}
			>
				{value}
			</Text>
		</View>
	);
}

function OverviewItemRow({ item }: { item: SalesDocumentOverviewItem }) {
	return (
		<View className="flex-row items-start gap-4 border-b border-border/70 px-4 py-3 last:border-b-0">
			{item.image ? (
				<Image
					source={{ uri: item.image }}
					style={{ width: 44, height: 44, borderRadius: 6 }}
					contentFit="cover"
				/>
			) : null}
			<View className="flex-1">
				<Text className="text-[13px] font-bold leading-snug text-foreground">
					{item.title}
				</Text>
				<Text className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
					{item.subtitle}
				</Text>
			</View>
			<View className="rounded border border-border/70 bg-muted/30 px-1.5 py-0.5">
				<Text className="text-[11px] font-bold text-muted-foreground">
					x{item.quantity}
				</Text>
			</View>
		</View>
	);
}

function FinancialOverviewCard({
	balanceLabel,
	due,
	ledgerRows,
	paymentMethod,
	progressStats,
	paidPct,
}: {
	balanceLabel: string;
	due: number;
	ledgerRows: Array<{
		key: string;
		label: string;
		value: number;
		tone: "neutral" | "positive" | "warning";
		bold: boolean;
	}>;
	paymentMethod: string;
	progressStats: Array<{
		key: string;
		label: string;
		value: number;
		tone: "neutral" | "positive" | "warning";
	}>;
	paidPct: number;
}) {
	return (
		<Section title="Financial" icon="Wallet">
			<View className="mb-5 flex-row items-baseline justify-between gap-3">
				<View>
					<Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						{balanceLabel}
					</Text>
					<Text className="text-2xl font-extrabold text-foreground">
						{money(due)}
					</Text>
				</View>
				<Text className="text-[10px] font-bold uppercase text-primary">
					{paidPct.toFixed(0)}% settled
				</Text>
			</View>

			{progressStats.length ? (
				<View className="mb-4 gap-2">
					{progressStats.map((stat) => (
						<View
							key={stat.key}
							className="flex-row items-center justify-between rounded-md bg-muted/30 px-3 py-2"
						>
							<Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
								{stat.label}
							</Text>
							<Text
								className={`text-sm font-bold ${financialToneValueClass(
									stat.tone,
								)}`}
							>
								{money(stat.value)}
							</Text>
						</View>
					))}
				</View>
			) : null}

			<View className="border-t border-border/70 pt-3">
				<AmountRow
					label="Payment method"
					value={paymentMethod}
					divider={ledgerRows.length > 0}
				/>
				{ledgerRows.map((row, index) => (
					<AmountRow
						key={row.key}
						label={row.label}
						value={money(row.value)}
						divider={index < ledgerRows.length - 1}
						valueClassName={`${financialToneValueClass(row.tone)} ${
							row.bold ? "font-bold" : ""
						}`}
					/>
				))}
			</View>
		</Section>
	);
}

function financialToneValueClass(tone: "neutral" | "positive" | "warning") {
	if (tone === "positive") return "text-emerald-700 dark:text-emerald-300";
	if (tone === "warning") return "text-amber-700 dark:text-amber-300";
	return "text-foreground";
}

function ContactOverviewCard({
	name,
	phone,
	email,
	billingAddress,
}: {
	name: string;
	phone: string;
	email: string;
	billingAddress?: OverviewAddress;
}) {
	const billingLines = addressLines(billingAddress);

	return (
		<Section title="Customer Contact" icon="User" contentClassName="p-0">
			<View>
				<AmountRow label="Primary" value={name} labelUppercase edgeToEdge />
				<AmountRow
					label="Phone"
					value={phone}
					labelUppercase
					mutedValue={phone === "Not provided"}
					edgeToEdge
				/>
				<AmountRow
					label="Email"
					value={email}
					labelUppercase
					mutedValue={email === "Not provided"}
					edgeToEdge
				/>
				<View className="flex-row items-start justify-between gap-4 border-b border-border/70 px-4 py-2.5 last:border-b-0">
					<Text className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
						Address
					</Text>
					<View className="max-w-[62%] items-end">
						{billingLines.length ? (
							billingLines.map((line) => (
								<Text
									key={line}
									className="text-right text-sm font-medium text-foreground"
								>
									{line}
								</Text>
							))
						) : (
							<Text className="text-right text-sm font-medium text-foreground">
								{billingAddress?.address || "No billing address"}
							</Text>
						)}
					</View>
				</View>
			</View>
		</Section>
	);
}
