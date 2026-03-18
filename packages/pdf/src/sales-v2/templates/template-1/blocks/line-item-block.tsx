import { Text, View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";
import type { LineItemSection } from "@gnd/sales/print/types";

interface LineItemBlockProps {
  section: LineItemSection;
}

export function LineItemBlock({ section }: LineItemBlockProps) {
  return (
    <View style={cn(`uppercase`)}>
      <View style={cn(`w-full`)}>
        {/* Header row */}
        <View style={cn(`flex bg-slate-100`)}>
          {section.headers.map((h) => (
            <View key={h.title} style={{ ...cn(`border p-1`), flex: 1 }}>
              <Text>{h.title}</Text>
            </View>
          ))}
        </View>

        {/* Data rows */}
        <View style={cn(`flex-col`)}>
          {section.rows.map((row, ri) => (
            <View
              key={ri}
              style={cn(`flex ${row.isGroupHeader ? "bg-slate-200" : ""}`)}
            >
              {row.cells.map((cell, ci) => (
                <View key={ci} style={{ ...cn(`border uppercase`), flex: 1 }}>
                  <Text
                    style={cn(
                      `p-1 ${cell.bold ? "font-bold" : ""} ${cell.align === "right" ? "text-right" : cell.align === "center" ? "text-center" : ""} ${row.isGroupHeader ? "text-center uppercase" : ""}`,
                    )}
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
