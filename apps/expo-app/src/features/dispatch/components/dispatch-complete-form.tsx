import { useMemo, useRef, useState } from "react";
import {
  GestureResponderEvent,
  PanResponder,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { Icon } from "@/components/ui/icon";

type Props = {
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    receivedBy?: string;
    note?: string;
    receivedDate?: Date;
    signature?: string;
  }) => Promise<void> | void;
};

export function DispatchCompleteForm({ isSubmitting, onCancel, onSubmit }: Props) {
  const [receivedBy, setReceivedBy] = useState("");
  const [note, setNote] = useState("");
  const [signaturePath, setSignaturePath] = useState("");
  const pathRef = useRef("");

  const appendSignaturePoint = (evt: GestureResponderEvent) => {
    const { locationX, locationY } = evt.nativeEvent;
    if (!pathRef.current) {
      pathRef.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
    } else {
      pathRef.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
    }
    setSignaturePath(pathRef.current);
  };

  const clearSignature = () => {
    pathRef.current = "";
    setSignaturePath("");
  };

  const signaturePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: appendSignaturePoint,
        onPanResponderMove: appendSignaturePoint,
      }),
    [],
  );

  const hasSignature = signaturePath.trim().length > 0;

  return (
    <View className="mb-4 rounded-2xl border border-border bg-card p-4">
      <View className="mb-3 flex-row items-center gap-2">
        <View className="rounded-full bg-secondary p-2">
          <Icon name="CheckSquare" className="size-16 text-foreground" />
        </View>
        <View>
          <Text className="text-base font-semibold text-foreground">
            Complete Dispatch
          </Text>
          <Text className="mt-1 text-xs text-muted-foreground">
            Capture recipient and acknowledgement.
          </Text>
        </View>
      </View>

      <View className="mt-3 gap-2">
        <View className="rounded-xl border border-input bg-background px-3 py-2">
          <View className="flex-row items-center gap-2">
            <Icon name="User" className="size-14 text-muted-foreground" />
            <TextInput
              value={receivedBy}
              onChangeText={setReceivedBy}
              editable={!isSubmitting}
              placeholder="Received By"
              className="flex-1 text-foreground"
            />
          </View>
        </View>

        <View className="rounded-xl border border-input bg-background px-3 py-2">
          <View className="flex-row items-center gap-2">
            <Icon name="FilePenLine" className="size-14 text-muted-foreground" />
            <TextInput
              value={note}
              onChangeText={setNote}
              editable={!isSubmitting}
              placeholder="Note (optional)"
              className="flex-1 text-foreground"
            />
          </View>
        </View>

        <View className="rounded-xl border border-input bg-background p-3">
          <View className="mb-2 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Icon name="Pencil" className="size-14 text-muted-foreground" />
              <Text className="text-sm font-medium text-foreground">
                Signature
              </Text>
            </View>
            <Pressable
              disabled={isSubmitting || !hasSignature}
              onPress={clearSignature}
              className="rounded-full border border-border px-3 py-1 active:opacity-80 disabled:opacity-40"
            >
              <Text className="text-xs font-semibold text-foreground">Clear</Text>
            </Pressable>
          </View>
          <View
            {...signaturePanResponder.panHandlers}
            className="h-36 rounded-lg border border-dashed border-border bg-card"
          >
            <Svg className="h-full w-full">
              <Path
                d={signaturePath}
                stroke="#111827"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-xs text-muted-foreground">
              Sign inside the box.
            </Text>
            {!hasSignature && (
              <Text className="text-xs font-semibold text-destructive">
                Signature required
              </Text>
            )}
          </View>
        </View>
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
          disabled={isSubmitting || !hasSignature}
          onPress={() =>
            onSubmit({
              receivedBy: receivedBy || undefined,
              note: note || undefined,
              receivedDate: new Date(),
              signature: signaturePath,
            })
          }
          className="flex-1 items-center rounded-full bg-primary px-4 py-2 active:opacity-80 disabled:opacity-40"
        >
          <Text className="text-sm font-semibold text-primary-foreground">
            {isSubmitting ? "Submitting..." : "Submit"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
