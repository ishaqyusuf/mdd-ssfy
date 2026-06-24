import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { Pressable } from "@/components/ui/pressable";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import type { ResolvedPreviewDesignSystem } from "../design-systems/types";
import type { PreviewFilterState } from "../utils/preview-filtering";

export const PreviewBottomFilterSheet = React.forwardRef<
  BottomSheetModal,
  {
    system: ResolvedPreviewDesignSystem;
    filters: PreviewFilterState;
    toggleStatus: (status: string) => void;
    clearFilters: () => void;
  }
>(({ system, filters, toggleStatus, clearFilters }, ref) => {
  const dismiss = () => {
    if (typeof ref !== "function" && ref?.current) {
      ref.current.dismiss();
    }
  };

  return (
    <Modal ref={ref} snapPoints={["50%"]} index={0} enablePanDownToClose>
      <View style={{ flex: 1, padding: 24, backgroundColor: system.colors.surface }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: system.colors.text }}>Filters</Text>
          <Pressable onPress={() => dismiss()}>
            <Icon name="X" color={system.colors.muted} size={20} />
          </Pressable>
        </View>
        
        <ScrollView>
          <Text style={{ fontSize: 14, fontWeight: "600", color: system.colors.text, marginBottom: 12 }}>Status</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
            {["ready", "pending", "blocked", "complete"].map((status) => {
              const isActive = filters.statuses.has(status);
              return (
                <Pressable
                  key={status}
                  onPress={() => toggleStatus(status)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: isActive ? system.colors.primary : system.colors.border,
                    backgroundColor: isActive ? system.colors.primary : "transparent",
                  }}
                >
                  <Text style={{ color: isActive ? "#ffffff" : system.colors.text, fontSize: 13, textTransform: "capitalize" }}>
                    {status}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        
        <View style={{ flexDirection: "row", gap: 12, marginTop: "auto", marginBottom: 20 }}>
          <Pressable
            onPress={clearFilters}
            style={{ flex: 1, padding: 14, alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: system.colors.border }}
          >
            <Text style={{ color: system.colors.text, fontWeight: "600" }}>Reset</Text>
          </Pressable>
          <Pressable
            onPress={() => dismiss()}
            style={{ flex: 1, padding: 14, alignItems: "center", borderRadius: 8, backgroundColor: system.colors.primary }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "600" }}>Apply</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
});

PreviewBottomFilterSheet.displayName = "PreviewBottomFilterSheet";
