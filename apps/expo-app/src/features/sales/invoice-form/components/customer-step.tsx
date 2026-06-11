import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useEffect, useState } from "react";
import { FlatList, Pressable, TextInput, View } from "react-native";
import { useInvoiceFormProfiles } from "../api/use-invoice-form-profiles";
import { useInvoiceFormCustomerSearch } from "../api/use-invoice-form-search";
import { useInvoiceFormStore } from "../store/use-invoice-form-store";
import type { InvoiceCustomer } from "../types";

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
    <Pressable
      onPress={onPress}
      className="border-b border-border/40 py-4 active:opacity-70"
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
            {customer.contact} - {customer.phone}
          </Text>
          <Text
            numberOfLines={1}
            className="mt-0.5 text-xs text-muted-foreground"
          >
            {customer.billingAddress}
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
    </Pressable>
  );
}

export function CustomerStep({
  onCustomerSelected,
}: {
  onCustomerSelected?: () => void;
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const type = useInvoiceFormStore((state) => state.type);
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
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ListHeaderComponent={
          <View className="gap-3 pb-2">
            <View className="h-12 flex-row items-center rounded-lg bg-muted/70 px-3">
              <Icon name="Search" className="text-muted-foreground" size={18} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search customer, phone, email"
                placeholderTextColor="#8A8A8A"
                className="ml-2 flex-1 text-foreground"
              />
            </View>
            <Text className="text-[11px] font-semibold uppercase text-muted-foreground">
              {hasSearchText ? "Search results" : "Recent customers"}
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
    </View>
  );
}

function CustomerListSkeleton() {
  return (
    <View>
      {Array.from({ length: 6 }).map((_, index) => (
        <View
          key={`customer-skeleton-${index}`}
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
