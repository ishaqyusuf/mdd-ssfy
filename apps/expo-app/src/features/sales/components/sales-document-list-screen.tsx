import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import type { FilterItem } from "@/features/sales/types/sales.types";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import {
	type SalesDocumentListItem,
	type SalesDocumentListType,
	getOrderOverviewRoute,
	getQuoteOverviewRoute,
} from "./sales-document-list";
import { SalesDocumentSearchFilterSheet } from "./sales-document-search-filter-sheet";
import { SalesInvoiceListCard2 } from "./sales-invoice-list-card-2";

type ListHookInput = {
	q?: string;
	filters?: Record<string, string | null | undefined>;
};

type ListHookResult = {
	data: unknown;
	isPending: boolean;
	isRefetching: boolean;
	refetch: () => unknown;
};

type FilterHookResult = {
	data?: unknown;
};

type SalesDocumentListScreenProps = {
	type: SalesDocumentListType;
	title: string;
	subtitle: string;
	searchPlaceholder: string;
	emptyTitle: string;
	emptyDescription: string;
	filtersEnabled?: boolean;
	useList: (input: ListHookInput) => ListHookResult;
	useFilters: () => FilterHookResult;
	onDocumentPress?: (item: SalesDocumentListItem) => void;
};

export function SalesDocumentListScreen({
	type,
	title,
	subtitle,
	searchPlaceholder,
	emptyTitle,
	emptyDescription,
	filtersEnabled = true,
	useList,
	useFilters,
	onDocumentPress,
}: SalesDocumentListScreenProps) {
	const router = useRouter();
	const [search, setSearch] = useState("");
	const [searchFilterOpen, setSearchFilterOpen] = useState(false);
	const [selectedFilters, setSelectedFilters] = useState<
		Record<string, string | null | undefined>
	>({});

	const { data: rawFilters } = useFilters();
	const filters = useMemo(
		() => (rawFilters || []) as FilterItem[],
		[rawFilters],
	);
	const selectableFilters = useMemo(
		() => filters.filter((filter) => filter.value !== "q"),
		[filters],
	);
	const { data, isPending, isRefetching, refetch } = useList({
		q: search,
		filters: selectedFilters,
	});
	const items = ((data as { data?: SalesDocumentListItem[] })?.data ||
		[]) as SalesDocumentListItem[];
	const activeFilterCount = useMemo(
		() =>
			Object.values(selectedFilters).filter(
				(value) => value != null && value !== "",
			).length,
		[selectedFilters],
	);
	const activeSearchFilterCount =
		activeFilterCount + (search.trim().length > 0 ? 1 : 0);
	const searchSheetTitle = filtersEnabled
		? "Search & filters"
		: "Search orders";

	const handleDefaultPress = (item: SalesDocumentListItem) => {
		const route =
			type === "quote"
				? getQuoteOverviewRoute(item)
				: getOrderOverviewRoute(item);
		if (route) router.push(route);
	};

	return (
		<SafeArea>
			<View className="flex-1 bg-background pt-4">
				<View className="px-4">
					<View className="mb-4 flex-row items-center gap-3">
						<Pressable
							onPress={() => router.back()}
							className="h-10 w-10 items-center justify-center rounded-full active:bg-muted"
						>
							<Icon name="ArrowLeft" className="text-foreground" size={20} />
						</Pressable>
						<View className="flex-1">
							<Text className="text-2xl font-bold text-foreground">
								{title}
							</Text>
							<Text className="text-sm text-muted-foreground">{subtitle}</Text>
						</View>
					</View>
				</View>

				{isPending ? (
					<View className="flex-1 items-center justify-center">
						<ActivityIndicator />
					</View>
				) : (
					<FlatList
						data={items}
						keyExtractor={(item) =>
							String(item.id || item.slug || item.orderId)
						}
						refreshing={isRefetching}
						onRefresh={() => refetch()}
						contentContainerStyle={{
							paddingHorizontal: 16,
							paddingBottom: 120,
						}}
						ListEmptyComponent={
							<View className="mt-8 items-center rounded-xl border border-dashed border-border p-8">
								<Text className="text-base font-semibold text-foreground">
									{emptyTitle}
								</Text>
								<Text className="mt-2 text-center text-sm text-muted-foreground">
									{emptyDescription}
								</Text>
							</View>
						}
						renderItem={({ item }) => {
							const route =
								type === "quote"
									? getQuoteOverviewRoute(item)
									: getOrderOverviewRoute(item);
							const disabled = !route;

							return (
								<SalesInvoiceListCard2
									type={type}
									item={item}
									disabled={disabled}
									onPress={() => {
										if (disabled) return;
										if (onDocumentPress) {
											onDocumentPress(item);
											return;
										}
										handleDefaultPress(item);
									}}
								/>
							);
						}}
					/>
				)}

				<View
					pointerEvents="box-none"
					className="absolute bottom-5 left-0 right-0 z-20 items-center px-4"
				>
					<Pressable
						haptic
						accessibilityRole="button"
						accessibilityLabel={searchSheetTitle}
						onPress={() => setSearchFilterOpen(true)}
						className="min-h-14 w-full max-w-[420px] flex-row items-center gap-3 rounded-full border border-border bg-card px-4 shadow-md active:opacity-90"
					>
						<View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
							<Icon
								name={filtersEnabled ? "SlidersHorizontal" : "Search"}
								className="text-primary"
								size={18}
							/>
						</View>
						<View className="min-w-0 flex-1">
							<Text
								numberOfLines={1}
								className="text-sm font-semibold text-foreground"
							>
								{searchSheetTitle}
							</Text>
							<Text numberOfLines={1} className="text-xs text-muted-foreground">
								{activeSearchFilterCount > 0
									? `${activeSearchFilterCount} active`
									: searchPlaceholder}
							</Text>
						</View>
						{activeSearchFilterCount > 0 ? (
							<View className="h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2">
								<Text className="text-xs font-bold text-primary-foreground">
									{activeSearchFilterCount}
								</Text>
							</View>
						) : null}
					</Pressable>
				</View>
			</View>

			<SalesDocumentSearchFilterSheet
				visible={searchFilterOpen}
				onClose={() => setSearchFilterOpen(false)}
				search={search}
				selectedFilters={selectedFilters}
				filters={selectableFilters}
				filtersEnabled={filtersEnabled}
				searchPlaceholder={searchPlaceholder}
				title={searchSheetTitle}
				onApply={(next) => {
					setSearch(next.search);
					setSelectedFilters(next.filters);
				}}
			/>
		</SafeArea>
	);
}
