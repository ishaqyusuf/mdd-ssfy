import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import type { FilterItem } from "@/features/sales/types/sales.types";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Text,
	TextInput,
	View,
} from "react-native";
import { OrdersFilterModal } from "./orders-filter-modal";
import {
	type SalesDocumentListItem,
	type SalesDocumentListType,
	getQuoteEditRoute,
} from "./sales-document-list";
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
	const [filterOpen, setFilterOpen] = useState(false);
	const [selectedFilters, setSelectedFilters] = useState<
		Record<string, string | null | undefined>
	>({});

	const { data: rawFilters } = useFilters();
	const filters = useMemo(
		() => (rawFilters || []) as FilterItem[],
		[rawFilters],
	);
	const { data, isPending, isRefetching, refetch } = useList({
		q: search,
		filters: selectedFilters,
	});
	const items = ((data as { data?: SalesDocumentListItem[] })?.data ||
		[]) as SalesDocumentListItem[];

	const handleDefaultPress = (item: SalesDocumentListItem) => {
		if (type === "quote") {
			const route = getQuoteEditRoute(item);
			if (route) router.push(route);
			return;
		}

		router.push({
			pathname: "/(sales)/orders/[orderNo]",
			params: { orderNo: item.orderId },
		});
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

					<View className="mb-4 flex-row items-center gap-2">
						<View className="h-12 flex-1 flex-row items-center rounded-xl border border-border bg-card px-3">
							<Icon name="Search" className="text-muted-foreground" size={18} />
							<TextInput
								value={search}
								onChangeText={setSearch}
								placeholder={searchPlaceholder}
								placeholderTextColor="#8A8A8A"
								className="ml-2 flex-1 text-foreground"
							/>
						</View>
						{filtersEnabled ? (
							<Pressable
								onPress={() => setFilterOpen(true)}
								className="h-12 w-12 items-center justify-center rounded-xl border border-border bg-card active:opacity-80"
							>
								<Icon
									name="SlidersHorizontal"
									className="text-foreground"
									size={18}
								/>
							</Pressable>
						) : null}
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
						contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
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
							const quoteRoute =
								type === "quote" ? getQuoteEditRoute(item) : null;
							const disabled = type === "quote" && !quoteRoute;

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
			</View>

			{filtersEnabled ? (
				<OrdersFilterModal
					open={filterOpen}
					onClose={() => setFilterOpen(false)}
					filters={filters.filter((filter) => filter.value !== "q")}
					selected={selectedFilters}
					onApply={(next) => setSelectedFilters(next)}
				/>
			) : null}
		</SafeArea>
	);
}
