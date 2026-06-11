import { Text } from "@/components/ui/text";
import {
  buildSalesFormTaxSelectOptions,
  salesFormDeliveryOptions,
  salesFormPaymentMethods,
  salesFormPaymentTerms,
  type SalesFormSelectOption,
} from "@gnd/sales/sales-form-core";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { useInvoiceFormTaxProfiles } from "../api/use-invoice-form-tax-profiles";
import { useInvoiceFormStore } from "../store/use-invoice-form-store";
import type { NewSalesFormMeta } from "../types";

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value?: string | null;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-bold text-muted-foreground">{label}</Text>
      <TextInput
        value={value || ""}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor="#8A8A8A"
        className={`rounded-xl border border-border bg-card px-3 text-foreground ${
          multiline ? "min-h-24 py-3" : "h-12"
        }`}
      />
    </View>
  );
}

function OptionRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string | null;
  options: Array<string | SalesFormSelectOption>;
  onChange: (value: string) => void;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-bold text-muted-foreground">{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {options.map((option) => {
          const optionValue = typeof option === "string" ? option : option.value;
          const optionLabel = typeof option === "string" ? option : option.label;
          const selected = optionValue === value;
          return (
            <Pressable
              key={optionValue}
              onPress={() => onChange(optionValue)}
              className={`h-10 justify-center rounded-full border px-3 ${
                selected ? "border-primary bg-primary" : "border-border bg-card"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  selected ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {optionLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function DetailsStep() {
  const type = useInvoiceFormStore((state) => state.type);
  const meta = useInvoiceFormStore((state) => state.meta);
  const updateMeta = useInvoiceFormStore((state) => state.actions.updateMeta);
  const { taxProfiles } = useInvoiceFormTaxProfiles();
  const taxOptions = buildSalesFormTaxSelectOptions(taxProfiles);
  const isQuote = type === "quote";
  const patch = (key: keyof NewSalesFormMeta) => (value: string) =>
    updateMeta({ [key]: value });
  const setTaxCode = (value: string) =>
    updateMeta({ taxCode: value === "none" ? null : value });
  const setPaymentMethod = (value: string) =>
    updateMeta({ paymentMethod: value === "None" ? null : value });

  return (
    <View className="gap-4">
      <View className="rounded-2xl border border-border bg-card p-4">
        <Text className="text-base font-bold text-foreground">
          {isQuote ? "Quote details" : "Invoice details"}
        </Text>
      </View>

      <View className="gap-3">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="Invoice date" value={meta.createdAt} onChangeText={patch("createdAt")} />
          </View>
          <View className="flex-1">
            <Field
              label={isQuote ? "Good until" : "Due date"}
              value={isQuote ? meta.goodUntil : meta.paymentDueDate}
              onChangeText={isQuote ? patch("goodUntil") : patch("paymentDueDate")}
            />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <OptionRow
              label="Terms"
              value={meta.paymentTerm}
              options={salesFormPaymentTerms}
              onChange={patch("paymentTerm")}
            />
          </View>
          <View className="flex-1">
            <Field label="PO" value={meta.po} onChangeText={patch("po")} />
          </View>
        </View>
        {isQuote ? null : (
          <Field
            label="Production due"
            value={meta.prodDueDate}
            onChangeText={patch("prodDueDate")}
          />
        )}
        <OptionRow
          label="Delivery option"
          value={meta.deliveryOption}
          options={salesFormDeliveryOptions}
          onChange={patch("deliveryOption")}
        />
        <OptionRow
          label="Payment method"
          value={meta.paymentMethod || "None"}
          options={salesFormPaymentMethods}
          onChange={setPaymentMethod}
        />
        <OptionRow
          label="Tax code"
          value={meta.taxCode || "none"}
          options={taxOptions}
          onChange={setTaxCode}
        />
        <Field
          label="Notes"
          value={meta.notes}
          onChangeText={patch("notes")}
          multiline
          placeholder="Internal notes or invoice memo"
        />
      </View>
    </View>
  );
}
