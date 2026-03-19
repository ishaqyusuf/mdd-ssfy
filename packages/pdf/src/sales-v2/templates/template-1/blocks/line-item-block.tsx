import { Text, View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";
import type { LineItemSection } from "@gnd/sales/print/types";

interface LineItemBlockProps {
  section: LineItemSection;
}

export function LineItemBlock({ section }: LineItemBlockProps) {
  const borderColor = "#9ca3af";
  return (
    <View
      style={{
        ...cn(`uppercase border-x border-t`),
        marginTop: 0,
        borderColor,
      }}
    >
      <View style={cn(`w-full`)}>
        <View
          style={{
            ...cn(`flex-row bg-slate-100`),
            borderColor: "#9ca3af",
          }}
        >
          {section.headers.map((h) => (
            <View
              key={h.title}
              style={{
                ...cn(`border uppercase`),
                borderColor: "#9ca3af",
                paddingHorizontal: 2,
                paddingVertical: 1,
                flex: 1,
              }}
            >
              <Text>{h.title}</Text>
            </View>
          ))}
        </View>

        <View style={cn(`flex-col`)}>
          {section.rows.map((row, ri) => (
            <View
              key={ri}
              style={{
                ...cn(`flex-row ${row.isGroupHeader ? "bg-slate-200" : ""}`),
                borderColor: "#9ca3af",
              }}
            >
              {row.cells.map((cell, ci) => (
                <View
                  key={ci}
                  style={{
                    ...cn(`border uppercase`),
                    borderColor: "#9ca3af",
                    flex: 1,
                  }}
                >
                  <Text
                    style={{
                      ...cn(
                        `${cell.bold ? "font-bold" : ""} ${cell.align === "right" ? "text-right" : cell.align === "center" ? "text-center" : ""} ${row.isGroupHeader ? "text-center uppercase" : ""}`,
                      ),
                      paddingHorizontal: 2,
                      paddingVertical: 1,
                    }}
                  >
                    {cell.value ?? ""}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
