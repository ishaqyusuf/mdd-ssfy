import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Pressable, TextInput, View } from "react-native";
import { formatMoney, parseCurrencyInput } from "../lib/format";
import { useInvoiceFormStore } from "../store/use-invoice-form-store";

export function CostsStep() {
  const extraCosts = useInvoiceFormStore((state) => state.extraCosts);
  const summary = useInvoiceFormStore((state) => state.summary);
  const actions = useInvoiceFormStore((state) => state.actions);
  const discount = extraCosts.find((cost) => cost.type === "Discount");
  const discountPercentage = extraCosts.find(
    (cost) => cost.type === "DiscountPercentage",
  );
  const delivery = extraCosts.find((cost) => cost.type === "Delivery");
  const labor = extraCosts.find((cost) => cost.type === "Labor");
  const customCosts = extraCosts
    .map((cost, index) => ({ cost, index }))
    .filter(({ cost }) =>
      cost.type === "CustomTaxxable" || cost.type === "CustomNonTaxxable" || cost.type === "EXT",
    );

  return (
    <View className="gap-4">
      <View className="rounded-2xl border border-border bg-card p-4">
        <Text className="text-base font-bold text-foreground">Costs and tax</Text>
      </View>

      <View className="gap-3">
        <View className="rounded-xl border border-border bg-card px-3 py-3">
          <Text className="text-xs font-bold text-muted-foreground">Tax rate</Text>
          <Text className="mt-1 text-sm font-bold text-foreground">
            {Number(summary.taxRate || 0)}%
          </Text>
        </View>
        <View className="gap-1.5">
          <Text className="text-xs font-bold text-muted-foreground">
            Flat discount
          </Text>
          <TextInput
            value={String(discount?.amount || 0)}
            keyboardType="decimal-pad"
            onChangeText={(value) => actions.updateExtraCost("Discount", parseCurrencyInput(value))}
            className="h-12 rounded-xl border border-border bg-card px-3 text-foreground"
          />
        </View>
        <View className="gap-1.5">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-xs font-bold text-muted-foreground">
              Discount percent
            </Text>
            {(summary.percentDiscountValue || 0) > 0 ? (
              <Text className="text-xs font-semibold text-muted-foreground">
                {formatMoney(summary.percentDiscountValue || 0)}
              </Text>
            ) : null}
          </View>
          <TextInput
            value={String(discountPercentage?.amount || 0)}
            keyboardType="decimal-pad"
            onChangeText={(value) =>
              actions.updateExtraCost(
                "DiscountPercentage",
                clampPercent(parseCurrencyInput(value)),
              )
            }
            className="h-12 rounded-xl border border-border bg-card px-3 text-foreground"
          />
        </View>
        <View className="gap-1.5">
          <Text className="text-xs font-bold text-muted-foreground">Delivery</Text>
          <TextInput
            value={String(delivery?.amount || 0)}
            keyboardType="decimal-pad"
            onChangeText={(value) => actions.updateExtraCost("Delivery", parseCurrencyInput(value))}
            className="h-12 rounded-xl border border-border bg-card px-3 text-foreground"
          />
        </View>
        <View className="gap-1.5">
          <Text className="text-xs font-bold text-muted-foreground">Labor</Text>
          <TextInput
            value={String(labor?.amount || 0)}
            keyboardType="decimal-pad"
            onChangeText={(value) => actions.updateExtraCost("Labor", parseCurrencyInput(value))}
            className="h-12 rounded-xl border border-border bg-card px-3 text-foreground"
          />
        </View>
        <View className="flex-row gap-2">
          <Button
            variant="outline"
            className="h-11 flex-1 rounded-xl"
            onPress={() => actions.addCustomCost(true)}
          >
            <Text>Taxable cost</Text>
          </Button>
          <Button
            variant="outline"
            className="h-11 flex-1 rounded-xl"
            onPress={() => actions.addCustomCost(false)}
          >
            <Text>Non-taxable</Text>
          </Button>
        </View>
        {customCosts.length > 0 ? (
          <View className="gap-2">
            {customCosts.map(({ cost, index }) => (
              <View
                key={`${cost.id || "custom"}-${index}`}
                className="rounded-xl border border-border bg-card px-3 py-3"
              >
                <View className="mb-2 flex-row items-start justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <Text className="mt-0.5 text-[11px] text-muted-foreground">
                      {cost.taxxable ? "Taxable add-on" : "Non-taxable add-on"}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => actions.removeExtraCostAtIndex(index)}
                    className="h-8 w-8 items-center justify-center rounded-full active:bg-muted"
                  >
                    <Icon name="Trash" className="text-red-600" size={15} />
                  </Pressable>
                </View>
                <View className="mb-2 gap-1.5">
                  <Text className="text-[11px] font-bold uppercase text-muted-foreground">
                    Label
                  </Text>
                  <TextInput
                    value={cost.label || ""}
                    onChangeText={(value) =>
                      actions.updateExtraCostLabelAtIndex(index, value)
                    }
                    placeholder="Custom add-on"
                    placeholderTextColor="#8A8A8A"
                    className="h-11 rounded-xl border border-border bg-background px-3 text-foreground"
                  />
                </View>
                <Text className="mb-1.5 text-[11px] font-bold uppercase text-muted-foreground">
                  Amount
                </Text>
                <TextInput
                  value={String(cost.amount || 0)}
                  keyboardType="decimal-pad"
                  onChangeText={(value) =>
                    actions.updateExtraCostAtIndex(index, parseCurrencyInput(value))
                  }
                  className="h-12 rounded-xl border border-border bg-background px-3 text-foreground"
                />
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View className="rounded-2xl border border-border bg-card p-4">
        <Text className="text-base font-bold text-foreground">Live totals</Text>
        <View className="mt-3 gap-2">
          <TotalRow label="Subtotal" value={summary.subTotal} />
          {hasAmount(summary.discount) ? (
            <TotalRow label="Discount" value={-(summary.discount || 0)} />
          ) : null}
          {(summary.discountPct || 0) > 0 ? (
            <TotalRow
              label={`Discount ${summary.discountPct}%`}
              value={-(summary.percentDiscountValue || 0)}
            />
          ) : null}
          {hasAmount(summary.delivery) ? (
            <TotalRow label="Delivery" value={summary.delivery || 0} />
          ) : null}
          {hasAmount(summary.labor) ? (
            <TotalRow label="Labor" value={summary.labor || 0} />
          ) : null}
          {hasAmount(summary.otherCosts) ? (
            <TotalRow label="Other costs" value={summary.otherCosts || 0} />
          ) : null}
          {hasAmount(summary.ccc) ? (
            <TotalRow label="CCC" value={summary.ccc || 0} />
          ) : null}
          <TotalRow label="Tax" value={summary.taxTotal} />
          <View className="my-1 h-px bg-border" />
          <TotalRow
            label="Grand total"
            value={summary.totalWithCcc ?? summary.grandTotal}
            strong
          />
        </View>
      </View>
    </View>
  );
}

function hasAmount(value?: number | null) {
  return Math.abs(Number(value || 0)) > 0;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function TotalRow({
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
      <Text className={strong ? "text-base font-bold" : "text-sm text-muted-foreground"}>
        {label}
      </Text>
      <Text className={strong ? "text-xl font-bold text-foreground" : "text-sm text-foreground"}>
        {formatMoney(value)}
      </Text>
    </View>
  );
}
