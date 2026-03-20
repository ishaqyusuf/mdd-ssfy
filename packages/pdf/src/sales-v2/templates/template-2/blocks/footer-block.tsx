import { Text, View } from "@react-pdf/renderer";
import type { FooterData } from "@gnd/sales/print/types";

// ─── Design tokens ─────────────────────────────────────────
const NAVY = "#1a2e4a";
const ACCENT = "#2563eb";
const LIGHT_BG = "#f0f4fa";
const BORDER = "#d1dae8";
const TEXT_MUTED = "#64748b";

const DEFAULT_FOOTER_NOTES = [
  "Note: Payments made with Cards will have an additional 3% charge to cover credit cards merchants fees.",
  "1) NO RETURN ON SPECIAL ORDER",
  "2) NO DAMAGED ORDER MAY BE EXCHANGE OR RETURN",
  "3) ONCE SIGN THERE IS NO RETURN OR EXCHANGE.",
];

interface FooterBlockProps {
  footer: FooterData;
}

export function FooterBlock({ footer }: FooterBlockProps) {
  const notes = footer.notes.length > 0 ? footer.notes : DEFAULT_FOOTER_NOTES;
  const [leadNote, ...restNotes] = notes;

  return (
    <View
      style={{
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: BORDER,
        marginTop: 4,
      }}
    >
      {/* Notes column */}
      <View
        style={{
          flex: 2,
          paddingRight: 12,
          paddingTop: 8,
          paddingLeft: 4,
        }}
      >
        {leadNote ? (
          <Text
            style={{
              fontSize: 7.5,
              color: "#dc2626",
              fontStyle: "italic",
              marginBottom: 4,
              lineHeight: 1.4,
            }}
          >
            {leadNote}
          </Text>
        ) : null}
        {restNotes.map((note, i) => (
          <Text
            key={i}
            style={{
              fontSize: 7.5,
              color: "#dc2626",
              marginBottom: 2,
              lineHeight: 1.3,
            }}
          >
            {note}
          </Text>
        ))}
      </View>

      {/* Totals column */}
      <View
        style={{
          width: 200,
          borderRadius: 4,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: BORDER,
        }}
      >
        {footer.lines.map((line, i) => {
          const isLast = i === footer.lines.length - 1;
          return (
            <View
              key={i}
              style={{
                flexDirection: "row",
                backgroundColor: isLast ? NAVY : i % 2 === 0 ? LIGHT_BG : "#ffffff",
                borderBottomWidth: isLast ? 0 : 1,
                borderBottomColor: BORDER,
              }}
            >
              <View
                style={{
                  flex: 1,
                  paddingVertical: isLast ? 6 : 4,
                  paddingHorizontal: 8,
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: isLast ? 9 : 8,
                    fontWeight: line.bold ? 700 : 400,
                    color: isLast ? "#ffffff" : TEXT_MUTED,
                  }}
                >
                  {line.label}
                </Text>
              </View>
              <View
                style={{
                  paddingVertical: isLast ? 6 : 4,
                  paddingHorizontal: 8,
                  alignItems: "flex-end",
                  justifyContent: "center",
                  minWidth: 80,
                }}
              >
                <Text
                  style={{
                    fontSize: isLast ? (line.large ? 12 : 10) : 8,
                    fontWeight: line.bold ? 700 : 400,
                    color: isLast ? "#ffffff" : ACCENT,
                    textAlign: "right",
                  }}
                >
                  {line.value}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
