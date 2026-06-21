import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { getWorkflowLineDisplayTotal } from "@gnd/sales/sales-form-core";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useInvoiceFormProfiles } from "../api/use-invoice-form-profiles";
import { formatDate, formatMoney } from "../lib/format";
import { useInvoiceFormStore } from "../store/use-invoice-form-store";
import type { InvoiceInventoryStatus } from "../types";
import {
  getCustomerAddressLine,
  getCustomerContactLine,
} from "./customer-display";
import { getLineItemDisplayTitle } from "./line-item-display";

const inventoryStatusOptions: Array<{
  label: string;
  value: InvoiceInventoryStatus;
}> = [
  { label: "Available", value: "AVAILABLE" },
  { label: "Ordered", value: "ORDERED" },
  { label: "Pending", value: "PENDING ORDER" },
];

function ReviewCard({
  title,
  children,
  onEdit,
}: {
  title: string;
  children: ReactNode;
  onEdit?: () => void;
}) {
  return (
    <View className="rounded-2xl border border-border bg-card p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-bold text-foreground">{title}</Text>
        {onEdit ? (
          <Pressable
            onPress={onEdit}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-muted"
          >
            <Icon name="Pencil" className="text-muted-foreground" size={16} />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function ReviewStep() {
  const customer = useInvoiceFormStore((state) => state.customer);
  const type = useInvoiceFormStore((state) => state.type);
  const meta = useInvoiceFormStore((state) => state.meta);
  const customerProfileId = useInvoiceFormStore(
    (state) => state.meta.customerProfileId,
  );
  const inventoryStatus = useInvoiceFormStore((state) => state.inventoryStatus);
  const lineItems = useInvoiceFormStore((state) => state.lineItems);
  const summary = useInvoiceFormStore((state) => state.summary);
  const setStep = useInvoiceFormStore((state) => state.actions.setStep);
  const setInventoryStatus = useInvoiceFormStore(
    (state) => state.actions.setInventoryStatus,
  );
  const { getProfileCoefficient } = useInvoiceFormProfiles();
  const customerProfileCoefficient = getProfileCoefficient(customerProfileId) || 1;
  const isQuote = type === "quote";

  return (
    <View className="gap-4">
      <ReviewCard title="Customer" onEdit={() => setStep("customer")}>
        <Text className="font-bold text-foreground">{customer?.name || "No customer"}</Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          {getCustomerContactLine(customer)}
        </Text>
        <Text className="mt-3 text-xs font-bold uppercase text-muted-foreground">Billing</Text>
        <Text className="text-sm text-foreground">
          {getCustomerAddressLine(customer)}
        </Text>
        <Text className="mt-2 text-xs font-bold uppercase text-muted-foreground">Shipping</Text>
        <Text className="text-sm text-foreground">
          {customer?.shippingAddress || getCustomerAddressLine(customer)}
        </Text>
      </ReviewCard>

      <ReviewCard
        title={isQuote ? "Quote details" : "Invoice details"}
        onEdit={() => setStep("details")}
      >
        <View className="flex-row flex-wrap gap-2">
          <Chip label={`Date ${formatDate(meta.createdAt)}`} />
          <Chip
            label={
              isQuote
                ? `Good until ${formatDate(meta.goodUntil)}`
                : `Due ${formatDate(meta.paymentDueDate)}`
            }
          />
          {!isQuote && meta.prodDueDate ? (
            <Chip label={`Prod ${formatDate(meta.prodDueDate)}`} />
          ) : null}
          <Chip label={meta.paymentTerm || "No terms"} />
          <Chip label={`Delivery ${meta.deliveryOption || "None"}`} />
          <Chip label={`Payment ${meta.paymentMethod || "None"}`} />
          <Chip label={`Tax ${meta.taxCode || "Exempt"}`} />
          <Chip label={meta.po || "No PO"} />
        </View>
      </ReviewCard>

      <ReviewCard title="Items" onEdit={() => setStep("items")}>
        <Text className="mb-2 text-sm font-semibold text-foreground">
          {lineItems.length} line items - {formatMoney(summary.subTotal)}
        </Text>
        {lineItems.slice(0, 2).map((item) => (
          <View key={item.uid} className="flex-row justify-between py-1">
            <Text className="flex-1 text-sm text-muted-foreground" numberOfLines={1}>
              {getLineItemDisplayTitle(item)} x {item.qty}
            </Text>
            <Text className="text-sm font-semibold text-foreground">
              {formatMoney(
                getWorkflowLineDisplayTotal(item, customerProfileCoefficient),
              )}
            </Text>
          </View>
        ))}
        {lineItems.length > 2 ? (
          <Text className="mt-1 text-xs font-semibold text-primary">
            +{lineItems.length - 2} more
          </Text>
        ) : null}
      </ReviewCard>

      <ReviewCard title="Inventory status">
        <View className="flex-row gap-2">
          {inventoryStatusOptions.map((option) => {
            const selected = inventoryStatus === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setInventoryStatus(option.value)}
                className={`h-10 flex-1 items-center justify-center rounded-xl border px-2 ${
                  selected
                    ? "border-primary bg-primary"
                    : "border-border bg-background"
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
        </View>
      </ReviewCard>

      <View className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <Text className="text-base font-bold text-foreground">Totals</Text>
        <View className="mt-3 gap-2">
          <TotalLine label="Subtotal" value={summary.subTotal} />
          {hasAmount(summary.discount) ? (
            <TotalLine label="Discount" value={-(summary.discount || 0)} />
          ) : null}
          {(summary.discountPct || 0) > 0 ? (
            <TotalLine
              label={`Discount ${summary.discountPct}%`}
              value={-(summary.percentDiscountValue || 0)}
            />
          ) : null}
          {hasAmount(summary.delivery) ? (
            <TotalLine label="Delivery" value={summary.delivery || 0} />
          ) : null}
          {hasAmount(summary.labor) ? (
            <TotalLine label="Labor" value={summary.labor || 0} />
          ) : null}
          {hasAmount(summary.otherCosts) ? (
            <TotalLine label="Other costs" value={summary.otherCosts || 0} />
          ) : null}
          {hasAmount(summary.ccc) ? (
            <TotalLine label="CCC" value={summary.ccc || 0} />
          ) : null}
          <TotalLine label="Tax" value={summary.taxTotal} />
          <View className="my-1 h-px bg-primary/20" />
          <TotalLine label="Total" value={summary.grandTotal} strong />
        </View>
      </View>

      <View className="flex-row gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
        <Icon name="Info" className="text-amber-700" size={18} />
        <Text className="flex-1 text-xs text-amber-800">
          PDF will be generated after submission. You can still edit this draft before
          sending.
        </Text>
      </View>
    </View>
  );
}

function hasAmount(value?: number | null) {
  return Math.abs(Number(value || 0)) > 0;
}

function Chip({ label }: { label: string }) {
  return (
    <View className="rounded-full bg-muted px-3 py-1">
      <Text className="text-xs font-semibold text-foreground">{label}</Text>
    </View>
  );
}

function TotalLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className={strong ? "text-lg font-bold text-foreground" : "text-sm text-foreground"}>
        {label}
      </Text>
      <Text className={strong ? "text-2xl font-bold text-foreground" : "text-sm font-semibold"}>
        {formatMoney(value)}
      </Text>
    </View>
  );
}
