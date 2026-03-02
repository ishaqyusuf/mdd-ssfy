import { DispatchOverviewItem, QtyMatrix } from "../types/dispatch.types";
import { hasQty } from "../lib/packing-payload";
import { totalQty } from "../lib/format-dispatch";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

type Props = {
  item: DispatchOverviewItem;
  disabled?: boolean;
  isSubmitting?: boolean;
  onSubmit: (input: { qty: QtyMatrix; note?: string }) => Promise<void> | void;
};

function toNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function DispatchPackingForm({
  item,
  disabled,
  isSubmitting,
  onSubmit,
}: Props) {
  const deliverableQty = item?.deliverableQty as QtyMatrix;
  const noHandle = useMemo(() => {
    const hasSingleQty = Number(deliverableQty?.qty || 0) > 0;
    return hasSingleQty;
  }, [deliverableQty]);

  const [qty, setQty] = useState("");
  const [lh, setLh] = useState("");
  const [rh, setRh] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!hasQty(deliverableQty)) return null;

  const maxQty = totalQty(deliverableQty);

  return (
    <View className="mt-3 gap-2 rounded-xl border border-border bg-muted/20 p-3">
      <Text className="text-xs font-semibold text-muted-foreground">
        Add Packing
      </Text>
      {noHandle ? (
        <TextInput
          keyboardType="numeric"
          value={qty}
          onChangeText={setQty}
          editable={!disabled && !isSubmitting}
          placeholder={`Qty (max ${maxQty})`}
          className="rounded-lg border border-border bg-background px-3 py-2 text-foreground"
        />
      ) : (
        <View className="flex-row gap-2">
          <TextInput
            keyboardType="numeric"
            value={lh}
            onChangeText={setLh}
            editable={!disabled && !isSubmitting}
            placeholder={`LH (max ${deliverableQty?.lh || 0})`}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground"
          />
          <TextInput
            keyboardType="numeric"
            value={rh}
            onChangeText={setRh}
            editable={!disabled && !isSubmitting}
            placeholder={`RH (max ${deliverableQty?.rh || 0})`}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground"
          />
        </View>
      )}
      <TextInput
        value={note}
        onChangeText={setNote}
        editable={!disabled && !isSubmitting}
        placeholder="Note (optional)"
        className="rounded-lg border border-border bg-background px-3 py-2 text-foreground"
      />
      {!!error && <Text className="text-xs text-red-600">{error}</Text>}
      <Pressable
        disabled={disabled || isSubmitting}
        onPress={async () => {
          const payload: QtyMatrix = noHandle
            ? { qty: toNumber(qty) }
            : { lh: toNumber(lh), rh: toNumber(rh) };
          if (
            Number(payload.qty || 0) <= 0 &&
            Number(payload.lh || 0) <= 0 &&
            Number(payload.rh || 0) <= 0
          ) {
            setError("Enter a valid quantity.");
            return;
          }
          if (noHandle && Number(payload.qty || 0) > Number(deliverableQty.qty || 0)) {
            setError("Quantity exceeds deliverable stock.");
            return;
          }
          if (!noHandle) {
            if (Number(payload.lh || 0) > Number(deliverableQty.lh || 0)) {
              setError("LH quantity exceeds deliverable stock.");
              return;
            }
            if (Number(payload.rh || 0) > Number(deliverableQty.rh || 0)) {
              setError("RH quantity exceeds deliverable stock.");
              return;
            }
          }
          setError(null);
          await onSubmit({ qty: payload, note: note || undefined });
          setQty("");
          setLh("");
          setRh("");
          setNote("");
        }}
        className="items-center rounded-full bg-primary px-4 py-2 active:opacity-80 disabled:opacity-50"
      >
        <Text className="text-sm font-semibold text-primary-foreground">
          {isSubmitting ? "Saving..." : "Add Packing"}
        </Text>
      </Pressable>
    </View>
  );
}
