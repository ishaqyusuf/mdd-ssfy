import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
  buildSalesFormProfileSelectOptions,
  resolveSalesFormProfilePaymentTerm,
  type SalesFormSelectOption,
} from "@gnd/sales/sales-form-core";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
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
      className={`rounded-2xl border p-3 active:opacity-80 ${
        selected ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-muted">
          <Icon name="Building2" className="text-foreground" size={19} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-bold text-foreground">{customer.name}</Text>
          <Text numberOfLines={1} className="mt-0.5 text-xs text-muted-foreground">
            {customer.contact} - {customer.phone}
          </Text>
          <Text numberOfLines={1} className="mt-0.5 text-xs text-muted-foreground">
            {customer.billingAddress}
          </Text>
        </View>
        {selected ? (
          <Icon name="CheckCircle2" className="text-primary" size={20} />
        ) : (
          <Icon name="ChevronRight" className="text-muted-foreground" size={18} />
        )}
      </View>
    </Pressable>
  );
}

function ProfileOptionRow({
  value,
  options,
  onChange,
}: {
  value: string;
  options: SalesFormSelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-bold uppercase text-muted-foreground">
        Sales profile
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              className={`h-10 justify-center rounded-full border px-3 ${
                selected ? "border-primary bg-primary" : "border-border bg-card"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  selected ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function CustomerStep() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const type = useInvoiceFormStore((state) => state.type);
  const {
    customers,
    hasSearchText,
    isLoadingCustomers,
    isSearchingCustomers,
  } = useInvoiceFormCustomerSearch({
    type,
    query: debouncedQuery,
  });
  const { profiles, getProfileCoefficient, isLoadingProfiles } =
    useInvoiceFormProfiles();
  const profileOptions = useMemo(
    () => buildSalesFormProfileSelectOptions(profiles),
    [profiles],
  );
  const customer = useInvoiceFormStore((state) => state.customer);
  const currentProfileId = useInvoiceFormStore(
    (state) => state.meta.customerProfileId,
  );
  const paymentTerm = useInvoiceFormStore((state) => state.meta.paymentTerm);
  const actions = useInvoiceFormStore((state) => state.actions);
  const previousProfileCoefficient = getProfileCoefficient(currentProfileId);
  const profileValue = currentProfileId ? String(currentProfileId) : "none";

  const handleProfileChange = (value: string) => {
    if (value === "none") {
      actions.applyCustomerProfileMeta(
        { customerProfileId: null },
        {
          previousProfileCoefficient,
          nextProfileCoefficient: null,
        },
      );
      return;
    }

    const nextProfileId = Number(value);
    const profile = profiles.find(
      (entry) => Number(entry.id) === Number(nextProfileId),
    );
    const profileMeta = profile?.meta || {};
    actions.applyCustomerProfileMeta(
      {
        customerProfileId: nextProfileId,
        paymentTerm: resolveSalesFormProfilePaymentTerm(profileMeta, paymentTerm),
      },
      {
        previousProfileCoefficient,
        nextProfileCoefficient: getProfileCoefficient(nextProfileId),
      },
    );
  };

  return (
    <View className="gap-4">
      <View className="rounded-2xl border border-border bg-card p-3">
        <View className="h-12 flex-row items-center rounded-xl border border-border bg-background px-3">
          <Icon name="Search" className="text-muted-foreground" size={18} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search customer, phone, email"
            placeholderTextColor="#8A8A8A"
            className="ml-2 flex-1 text-foreground"
          />
          <Icon name="SlidersHorizontal" className="text-muted-foreground" size={18} />
        </View>
      </View>

      <View>
        <Text className="mb-2 text-xs font-bold uppercase text-muted-foreground">
          {hasSearchText ? "Search results" : "Recent customers"}
        </Text>
        {isLoadingCustomers || isLoadingProfiles ? (
          <View className="items-center rounded-2xl border border-border bg-card p-6">
            <ActivityIndicator />
            <Text className="mt-2 text-xs text-muted-foreground">
              {hasSearchText ? "Searching customers..." : "Loading customers..."}
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {isSearchingCustomers ? (
              <Text className="text-xs font-semibold text-muted-foreground">
                Updating results...
              </Text>
            ) : null}
            {customers.length ? (
              customers.map((item) => (
                <CustomerRow
                  key={item.id}
                  customer={item}
                  selected={customer?.id === item.id}
                  onPress={() =>
                    actions.selectCustomer(item, {
                      previousProfileCoefficient,
                      nextProfileCoefficient: getProfileCoefficient(item.profileId),
                    })
                  }
                />
              ))
            ) : (
              <View className="rounded-2xl border border-dashed border-border bg-card p-6">
                <Text className="text-center text-sm font-bold text-foreground">
                  No customers found
                </Text>
                <Text className="mt-1 text-center text-xs text-muted-foreground">
                  Try a business name, contact, phone, email, or address.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {customer ? (
        <View className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-foreground">{customer.name}</Text>
            <Text className="rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
              Selected
            </Text>
          </View>
          <Text className="mt-2 text-sm text-foreground">{customer.contact}</Text>
          <Text className="text-xs text-muted-foreground">{customer.email}</Text>
          <View className="mt-3 gap-2">
            <ProfileOptionRow
              value={profileValue}
              options={profileOptions}
              onChange={handleProfileChange}
            />
            <View className="rounded-xl bg-card p-3">
              <Text className="text-[11px] font-bold uppercase text-muted-foreground">
                Billing
              </Text>
              <Text className="mt-1 text-sm text-foreground">{customer.billingAddress}</Text>
            </View>
            <View className="rounded-xl bg-card p-3">
              <Text className="text-[11px] font-bold uppercase text-muted-foreground">
                Shipping
              </Text>
              <Text className="mt-1 text-sm text-foreground">{customer.shippingAddress}</Text>
            </View>
          </View>
        </View>
      ) : null}
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
