import { Text, View } from "@react-pdf/renderer";

// ─── Design tokens ─────────────────────────────────────────
const BORDER = "#d1dae8";
const TEXT_MUTED = "#64748b";

interface SignatureBlockProps {
  label?: string;
}

export function SignatureBlock({
  label = "Customer Signature & Date",
}: SignatureBlockProps) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
      <View style={{ flexDirection: "row", gap: 24 }}>
        {/* Signature line */}
        <View style={{ flex: 2 }}>
          <View
            style={{
              height: 36,
              borderBottomWidth: 1,
              borderBottomColor: BORDER,
              borderStyle: "dashed",
              marginBottom: 4,
            }}
          />
          <Text style={{ fontSize: 7.5, color: TEXT_MUTED, fontStyle: "italic" }}>
            {label}
          </Text>
        </View>
        {/* Date line */}
        <View style={{ flex: 1 }}>
          <View
            style={{
              height: 36,
              borderBottomWidth: 1,
              borderBottomColor: BORDER,
              borderStyle: "dashed",
              marginBottom: 4,
            }}
          />
          <Text style={{ fontSize: 7.5, color: TEXT_MUTED, fontStyle: "italic" }}>
            Date
          </Text>
        </View>
      </View>
    </View>
  );
}
