import { useEffect, useMemo, useRef, useState } from "react";
import {
  GestureResponderEvent,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { Icon } from "@/components/ui/icon";
import * as ImagePicker from "expo-image-picker";

type Props = {
  defaultNoteType?: "dispatch" | "pickup";
  defaultReceivedBy?: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    receivedBy?: string;
    note?: string;
    noteType?: "dispatch" | "pickup";
    receivedDate?: Date;
    signature?: string;
    signaturePath?: string;
    attachments?: {
      fileName: string;
      contentType?: string;
      base64: string;
      uri: string;
    }[];
  }) => Promise<void> | void;
};

export function DispatchCompleteForm({
  defaultNoteType = "dispatch",
  defaultReceivedBy,
  isSubmitting,
  onCancel,
  onSubmit,
}: Props) {
  const [receivedBy, setReceivedBy] = useState(defaultReceivedBy || "");
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState<"dispatch" | "pickup">(
    defaultNoteType,
  );
  const [signaturePath, setSignaturePath] = useState("");
  const [attachments, setAttachments] = useState<
    {
      fileName: string;
      contentType?: string;
      base64: string;
      uri: string;
    }[]
  >([]);
  const pathRef = useRef("");

  useEffect(() => {
    if (!receivedBy && defaultReceivedBy) {
      setReceivedBy(defaultReceivedBy);
    }
  }, [defaultReceivedBy, receivedBy]);

  useEffect(() => {
    setNoteType(defaultNoteType);
  }, [defaultNoteType]);

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

  const pickAttachments = async () => {
    if (isSubmitting) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      base64: true,
    });
    if (result.canceled) return;
    const next = result.assets
      .filter((asset) => !!asset.base64)
      .map((asset, index) => ({
        fileName:
          asset.fileName ||
          `dispatch-attachment-${Date.now()}-${index}.${asset.uri
            .split(".")
            .pop() || "jpg"}`,
        contentType: asset.mimeType || "image/jpeg",
        base64: asset.base64!,
        uri: asset.uri,
      }));
    setAttachments((prev) => [...prev, ...next]);
  };

  return (
    <View className="pb-4">
      <View className="mb-5">
        <Text className="text-xl font-bold text-foreground">Complete Dispatch</Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          Confirm recipient details and acknowledgement.
        </Text>
      </View>

      <View className="gap-4">
        <View>
          <Text className="mb-2 text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
            Recipient
          </Text>
          <View className="rounded-xl border border-input bg-background px-3 py-2.5">
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
        </View>

        <View>
          <Text className="mb-2 text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
            Completion Type
          </Text>
          <View className="flex-row gap-2">
            {(["dispatch", "pickup"] as const).map((option) => {
              const active = noteType === option;
              return (
                <Pressable
                  key={option}
                  disabled={isSubmitting}
                  onPress={() => setNoteType(option)}
                  className={`flex-1 rounded-xl border px-3 py-3 ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-input bg-background"
                  }`}
                >
                  <Text
                    className={`text-center text-sm font-semibold ${
                      active ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {option === "dispatch" ? "Dispatch" : "Pickup"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text className="mb-2 text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
            Note
          </Text>
          <View className="rounded-xl border border-input bg-background px-3 py-2.5">
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
        </View>

        <View className="rounded-xl border border-input bg-background p-3.5">
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

        <View className="rounded-xl border border-input bg-background p-3.5">
          <View className="mb-2 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Icon name="Image" className="size-14 text-muted-foreground" />
              <Text className="text-sm font-medium text-foreground">
                Attach Photos (Optional)
              </Text>
            </View>
            <Pressable
              disabled={isSubmitting}
              onPress={pickAttachments}
              className="rounded-full border border-border px-3 py-1 active:opacity-80 disabled:opacity-40"
            >
              <Text className="text-xs font-semibold text-foreground">
                Add Photos
              </Text>
            </Pressable>
          </View>

          {attachments.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2 pb-1"
            >
              {attachments.map((file) => (
                <View key={`${file.uri}-${file.fileName}`} className="relative">
                  <Image
                    source={{ uri: file.uri }}
                    style={{ width: 72, height: 72, borderRadius: 10 }}
                  />
                  <Pressable
                    disabled={isSubmitting}
                    onPress={() =>
                      setAttachments((prev) =>
                        prev.filter((item) => item.uri !== file.uri),
                      )
                    }
                    className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-destructive"
                  >
                    <Text className="text-[10px] font-bold text-destructive-foreground">
                      x
                    </Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text className="text-xs text-muted-foreground">
              No photos attached.
            </Text>
          )}
        </View>
      </View>

      <View className="mt-5 flex-row gap-3">
        <Pressable
          disabled={isSubmitting}
          onPress={onCancel}
          className="h-11 flex-1 items-center justify-center rounded-xl border border-border px-4 active:opacity-80 disabled:opacity-50"
        >
          <Text className="text-sm font-semibold text-foreground">Cancel</Text>
        </Pressable>
        <Pressable
          disabled={isSubmitting || !hasSignature}
          onPress={() =>
            onSubmit({
              receivedBy: receivedBy || undefined,
              note: note || undefined,
              noteType,
              receivedDate: new Date(),
              signature: signaturePath,
              signaturePath,
              attachments,
            })
          }
          className="h-11 flex-1 items-center justify-center rounded-xl bg-primary px-4 active:opacity-80 disabled:opacity-40"
        >
          <Text className="text-sm font-semibold text-primary-foreground">
            {isSubmitting ? "Submitting..." : "Complete Dispatch"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
