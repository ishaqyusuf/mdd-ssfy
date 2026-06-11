import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import type { InvoiceFormStep } from "../types";

export function InvoiceFormFooter({
  step,
  canGoBack,
  isSaving,
  validationError,
  onBack,
  onSaveDraft,
  onContinue,
  onSaveFinal,
  finalActionLabel = "Create Invoice",
}: {
  step: InvoiceFormStep;
  canGoBack: boolean;
  isSaving: boolean;
  validationError?: string | null;
  onBack: () => void;
  onSaveDraft: () => void;
  onContinue: () => void;
  onSaveFinal: () => void;
  finalActionLabel?: string;
}) {
  const isReview = step === "review";

  return (
    <View className="bg-background px-4 pb-4 pt-2">
      {validationError ? (
        <View className="mb-3 bg-red-50 px-3 py-2">
          <Text className="text-xs font-semibold text-red-700">
            {validationError}
          </Text>
        </View>
      ) : null}
      <View className="flex-row items-center gap-2">
        {canGoBack ? (
          <Button variant="ghost" className="h-11 px-3" onPress={onBack}>
            <Text>Back</Text>
          </Button>
        ) : null}
        <Button
          variant="ghost"
          className="h-11 flex-1 px-3"
          disabled={isSaving}
          onPress={onSaveDraft}
        >
          <Icon name="FileText" className="text-foreground" size={16} />
          <Text>{isSaving ? "Saving..." : "Save Draft"}</Text>
        </Button>
        <Button
          className="h-11 flex-1 rounded-lg px-3"
          disabled={isSaving}
          onPress={isReview ? onSaveFinal : onContinue}
        >
          <Text>{isReview ? finalActionLabel : "Continue"}</Text>
          <Icon
            name={isReview ? "ReceiptText" : "ArrowRight"}
            className="text-primary-foreground"
            size={16}
          />
        </Button>
      </View>
    </View>
  );
}
