import { Alert, Pressable, Text } from "react-native";

type Props = {
  disabled?: boolean;
  onConfirm: () => void;
};

export function DispatchClearPackingDialog({ disabled, onConfirm }: Props) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        Alert.alert(
          "Clear Packing",
          "Remove all packed entries for this dispatch?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Clear",
              style: "destructive",
              onPress: onConfirm,
            },
          ],
        );
      }}
      className="rounded-full border border-orange-400 px-3 py-2 active:opacity-80 disabled:opacity-50"
    >
      <Text className="text-xs font-semibold text-orange-700">Clear Packing</Text>
    </Pressable>
  );
}
