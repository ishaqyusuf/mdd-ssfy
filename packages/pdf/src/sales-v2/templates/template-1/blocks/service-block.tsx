import { Text, View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";
import type { ServiceSection } from "@gnd/sales/print/types";
import { colWidth, sumColSpans } from "../../../shared/utils";
import { hexToRgba, colorsObject } from "@gnd/utils/colors";

interface ServiceBlockProps {
  section: ServiceSection;
}

export function ServiceBlock({ section }: ServiceBlockProps) {
  const totalSpan = sumColSpans(section.headers);

  return (
    <View style={cn(`flex-col border-x text-sm`)}>
      <Text wrap={false} style={cn(`text-sm p-1 uppercase text-left`)}>
        {section.title}
      </Text>

      {section.rows.length > 0 && (
        <View style={cn(`flex-col`)}>
          <View style={cn(`flex border-t`)}>
            {section.headers.map((h, i) => (
              <View
                key={i}
                style={{
                  ...cn(`p-1 font-semibold uppercase ${i === section.headers.length - 1 ? "" : "border-r"}`),
                  width: colWidth(h.colSpan, totalSpan),
                  backgroundColor: hexToRgba(colorsObject.black, 0.2),
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
              style={cn(`flex border-b font-medium text-xs`)}
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
                      ...cn(`p-1 ${alignClass} ${cell.bold ? "font-bold" : ""} ${ci === row.cells.length - 1 ? "" : "border-r uppercase"}`),
                      width: colWidth(cell.colSpan, totalSpan),
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
