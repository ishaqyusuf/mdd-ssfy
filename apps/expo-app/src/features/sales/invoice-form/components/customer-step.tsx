import { Icon } from "@/components/ui/icon";
import { Pressable as HapticPressable } from "@/components/ui/pressable";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useEffect, useState } from "react";
import { FlatList, TextInput, View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useInvoiceFormProfiles } from "../api/use-invoice-form-profiles";
import { useInvoiceFormCustomerSearch } from "../api/use-invoice-form-search";
import { useInvoiceFormStore } from "../store/use-invoice-form-store";
import type { InvoiceCustomer, NewSalesFormType } from "../types";
import {
  getCustomerAddressLine,
  getCustomerContactLine,
} from "./customer-display";

const CUSTOMER_LIST_SKELETON_KEYS = [
  "customer-skeleton-0",
  "customer-skeleton-1",
  "customer-skeleton-2",
  "customer-skeleton-3",
  "customer-skeleton-4",
  "customer-skeleton-5",
];

function CustomerRow({
  customer,
  selected,
  onPress,
}: {
  customer: InvoiceCustomer;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <HapticPressable
      haptic
      onPress={onPress}
      className="border-b border-border/40 py-4 active:opacity-90"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Icon name="Building2" className="text-muted-foreground" size={18} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-semibold text-foreground">
            {customer.name}
          </Text>
          <Text
            numberOfLines={1}
            className="mt-0.5 text-xs text-muted-foreground"
          >
            {getCustomerContactLine(customer)}
          </Text>
          <Text
            numberOfLines={1}
            className="mt-0.5 text-xs text-muted-foreground"
          >
            {getCustomerAddressLine(customer)}
          </Text>
        </View>
        {selected ? (
          <Icon name="Check" className="text-primary" size={20} />
        ) : (
          <Icon
            name="ChevronRight"
            className="text-muted-foreground"
            size={17}
          />
        )}
      </View>
    </HapticPressable>
  );
}

export function CustomerStep({
  onCustomerSelected,
  searchPlacement = "header",
  type: routeType,
}: {
  onCustomerSelected?: () => void;
  searchPlacement?: "header" | "bottom";
  type?: NewSalesFormType;
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const storeType = useInvoiceFormStore((state) => state.type);
  const type = routeType || storeType;
  const { customers, hasSearchText, isLoadingCustomers, isSearchingCustomers } =
    useInvoiceFormCustomerSearch({
      type,
      query: debouncedQuery,
    });
  const { getProfileCoefficient, isLoadingProfiles } = useInvoiceFormProfiles();
  const customer = useInvoiceFormStore((state) => state.customer);
  const currentProfileId = useInvoiceFormStore(
    (state) => state.meta.customerProfileId,
  );
  const actions = useInvoiceFormStore((state) => state.actions);
  const previousProfileCoefficient = getProfileCoefficient(currentProfileId);
  const loadingCustomers =
    isLoadingCustomers || isLoadingProfiles || isSearchingCustomers;
  const isBottomSearch = searchPlacement === "bottom";
  const handleSelectCustomer = (item: InvoiceCustomer) => {
    actions.selectCustomer(item, {
      previousProfileCoefficient,
      nextProfileCoefficient: getProfileCoefficient(item.profileId),
    });
    onCustomerSelected?.();
  };

  return (
    <View className="flex-1">
      <FlatList
        data={loadingCustomers ? [] : customers}
        keyExtractor={(item) => String(item.id)}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: isBottomSearch ? 104 : 24,
        }}
        ListHeaderComponent={
          <View className="gap-3 pb-2">
            {isBottomSearch ? null : (
              <CustomerSearchInput query={query} onQueryChange={setQuery} />
            )}
            <Text className="text-[11px] font-semibold uppercase text-muted-foreground">
              {hasSearchText
                ? "Search results"
                : type === "quote"
                  ? "Recent quote customers"
                  : "Recent sales customers"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          loadingCustomers ? (
            <CustomerListSkeleton />
          ) : (
            <View className="py-12">
              <Text className="text-center text-sm font-bold text-foreground">
                No customers found
              </Text>
              <Text className="mt-1 text-center text-xs text-muted-foreground">
                Try a business name, contact, phone, email, or address.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <CustomerRow
            customer={item}
            selected={customer?.id === item.id}
            onPress={() => handleSelectCustomer(item)}
          />
        )}
      />
      {isBottomSearch ? (
        <KeyboardStickyView
          offset={{ closed: 0, opened: 0 }}
          pointerEvents="box-none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
          }}
        >
          <View className="bg-background px-4 pb-5 pt-2">
            <CustomerSearchInput query={query} onQueryChange={setQuery} />
          </View>
        </KeyboardStickyView>
      ) : null}
    </View>
  );
}

function CustomerSearchInput({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (query: string) => void;
}) {
  return (
    <View className="h-12 flex-row items-center rounded-lg bg-muted/70 px-3">
      <Icon name="Search" className="text-muted-foreground" size={18} />
      <TextInput
        value={query}
        onChangeText={onQueryChange}
        placeholder="Search customer, phone, email"
        placeholderTextColor="#8A8A8A"
        className="ml-2 flex-1 text-foreground"
      />
    </View>
  );
}

function CustomerListSkeleton() {
  return (
    <View>
      {CUSTOMER_LIST_SKELETON_KEYS.map((key) => (
        <View
          key={key}
          className="flex-row items-center gap-3 border-b border-border/40 py-4"
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <View className="min-w-0 flex-1">
            <Skeleton className="h-4 w-2/3 rounded-md" />
            <Skeleton className="mt-2 h-3 w-1/2 rounded-md" />
            <Skeleton className="mt-2 h-3 w-5/6 rounded-md" />
          </View>
          <Skeleton className="h-4 w-4 rounded-full" />
        </View>
      ))}
    </View>
  );
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, value]);

  return debounced;
}
