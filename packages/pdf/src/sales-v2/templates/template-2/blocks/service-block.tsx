/** @jsxImportSource react */
import { Text, View } from "@react-pdf/renderer";
import type { ServiceSection } from "@gnd/sales/print/types";
import {
  colWidth,
  colWidthWithRemainder,
  sumColSpans,
} from "../../../shared/utils";

// ─── Design tokens ─────────────────────────────────────────
const NAVY = "#1a2e4a";
const BORDER = "#d1dae8";
const ROW_ALT = "#f8fafc";

interface ServiceBlockProps {
  section: ServiceSection;
}

export function ServiceBlock({ section }: ServiceBlockProps) {
  const totalSpan = sumColSpans(section.headers);
  const descriptionIndex = section.headers.findIndex(
    (header) => header.key === "description",
  );

  return (
    <View
      style={{
        flexDirection: "column",
        borderRadius: 4,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: BORDER,
        marginBottom: 2,
      }}
    >
      {/* Section title */}
      <View style={{ backgroundColor: NAVY, paddingVertical: 4, paddingHorizontal: 8 }}>
        <Text
          wrap={false}
          style={{
            fontSize: 8.5,
            fontWeight: 700,
            color: "#ffffff",
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {String(section.title || "").toUpperCase()}
        </Text>
      </View>

      {section.rows.length > 0 && (
        <View style={{ flexDirection: "column" }}>
          {/* Column headers */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#e2e8f0",
              borderBottomWidth: 1,
              borderBottomColor: BORDER,
            }}
          >
            {section.headers.map((h, i) => (
              <View
                key={i}
                style={{
                  width:
                    i === descriptionIndex
                      ? colWidthWithRemainder(h.colSpan, totalSpan)
                      : colWidth(h.colSpan, totalSpan),
                  paddingVertical: 4,
                  paddingHorizontal: 5,
                  borderRightWidth: i < section.headers.length - 1 ? 1 : 0,
                  borderRightColor: BORDER,
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 7.5,
                    fontWeight: 700,
                    color: "#334155",
                    textTransform: "uppercase",
                  }}
                >
                  {h.title}
                </Text>
              </View>
            ))}
          </View>

          {section.rows.map((row, ri) => (
            <View
              wrap={false}
              key={ri}
              style={{
                flexDirection: "row",
                backgroundColor: ri % 2 === 0 ? "#ffffff" : ROW_ALT,
                borderBottomWidth: ri < section.rows.length - 1 ? 1 : 0,
                borderBottomColor: BORDER,
              }}
            >
              {row.cells.map((cell, ci) => {
                const align = cell.align || "left";
                const textAlign =
                  align === "right"
                    ? "right"
                    : align === "center"
                      ? "center"
                      : "left";

                return (
                  <View
                    key={ci}
                    style={{
                      width:
                        ci === descriptionIndex
                          ? colWidthWithRemainder(cell.colSpan, totalSpan)
                          : colWidth(cell.colSpan, totalSpan),
                      paddingVertical: 3,
                      paddingHorizontal: 5,
                      borderRightWidth: ci < row.cells.length - 1 ? 1 : 0,
                      borderRightColor: BORDER,
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 7.5,
                        fontWeight: cell.bold ? 700 : 400,
                        color: "#1e293b",
                        textAlign,
                      }}
                    >
                      {cell.value ?? ""}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
