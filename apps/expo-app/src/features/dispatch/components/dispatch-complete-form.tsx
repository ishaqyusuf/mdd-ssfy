import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

type Props = {
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    receivedBy?: string;
    note?: string;
    receivedDate?: Date;
  }) => Promise<void> | void;
};

export function DispatchCompleteForm({ isSubmitting, onCancel, onSubmit }: Props) {
  const [receivedBy, setReceivedBy] = useState("");
  const [note, setNote] = useState("");

  return (
    <View className="mb-4 rounded-2xl border border-border bg-card p-4">
      <Text className="text-base font-semibold text-foreground">
        Complete Dispatch
      </Text>
      <Text className="mt-1 text-xs text-muted-foreground">
        Capture recipient and optional note before submission.
      </Text>

      <View className="mt-3 gap-2">
        <TextInput
          value={receivedBy}
          onChangeText={setReceivedBy}
          editable={!isSubmitting}
          placeholder="Received By"
          className="rounded-lg border border-border bg-background px-3 py-2 text-foreground"
        />
        <TextInput
          value={note}
          onChangeText={setNote}
          editable={!isSubmitting}
          placeholder="Note (optional)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-foreground"
        />
      </View>

      <View className="mt-3 flex-row gap-2">
        <Pressable
          disabled={isSubmitting}
          onPress={onCancel}
          className="flex-1 items-center rounded-full border border-border px-4 py-2 active:opacity-80 disabled:opacity-50"
        >
          <Text className="text-sm font-semibold text-foreground">Cancel</Text>
        </Pressable>
        <Pressable
          disabled={isSubmitting}
          onPress={() =>
            onSubmit({
              receivedBy: receivedBy || undefined,
              note: note || undefined,
              receivedDate: new Date(),
            })
          }
          className="flex-1 items-center rounded-full bg-green-600 px-4 py-2 active:opacity-80 disabled:opacity-50"
        >
          <Text className="text-sm font-semibold text-white">
            {isSubmitting ? "Submitting..." : "Submit"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
