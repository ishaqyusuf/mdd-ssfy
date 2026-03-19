import { Text, View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";
import type { ServiceSection } from "@gnd/sales/print/types";
import { colWidth, sumColSpans } from "../../../shared/utils";
import { hexToRgba, colorsObject } from "@gnd/utils/colors";

interface ServiceBlockProps {
  section: ServiceSection;
}
const BORDER_COLOR = "#9ca3af";

export function ServiceBlock({ section }: ServiceBlockProps) {
  const totalSpan = sumColSpans(section.headers);

  return (
    <View style={{ ...cn(`flex-col border-x border-t text-sm`), borderColor: BORDER_COLOR }}>
      <Text
        wrap={false}
        style={{
          ...cn(`text-sm p-1 uppercase text-left bg-slate-100`),
          fontWeight: 700,
          letterSpacing: 0.3,
        }}
      >
        {section.title}
      </Text>

      {section.rows.length > 0 && (
        <View style={cn(`flex-col`)}>
          <View style={{ ...cn(`flex-row border-t`), borderColor: BORDER_COLOR }}>
            {section.headers.map((h, i) => (
              <View
                key={i}
                style={{
                  ...cn(
                    `p-1 font-semibold uppercase ${i === section.headers.length - 1 ? "" : "border-r"}`,
                  ),
                  width: colWidth(h.colSpan, totalSpan),
                  backgroundColor: hexToRgba(colorsObject.black, 0.2),
                  borderColor: BORDER_COLOR,
                }}
              >
                <Text>{h.title}</Text>
              </View>
            ))}
          </View>

          {section.rows.map((row, ri) => (
            <View
              wrap={false}
              key={ri}
              style={{ ...cn(`flex-row border-b font-medium text-xs`), borderColor: BORDER_COLOR }}
            >
              {row.cells.map((cell, ci) => {
                const align = cell.align || "left";
                const alignClass =
                  align === "right"
                    ? "text-right"
                    : align === "center"
                      ? "text-center"
                      : "text-left";

                return (
                  <View
                    key={ci}
                    style={{
                      ...cn(
                        `p-1 ${alignClass} ${cell.bold ? "font-bold" : ""} ${ci === row.cells.length - 1 ? "" : "border-r uppercase"}`,
                      ),
                      width: colWidth(cell.colSpan, totalSpan),
                      borderColor: BORDER_COLOR,
                    }}
                  >
                    <Text>{cell.value ?? ""}</Text>
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
