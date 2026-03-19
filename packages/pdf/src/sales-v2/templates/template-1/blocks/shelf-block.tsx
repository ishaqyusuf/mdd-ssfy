import { Image, Text, View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";
import type { ShelfSection } from "@gnd/sales/print/types";
import { resolveImageSrc, colWidth, sumColSpans } from "../../../shared/utils";
import { hexToRgba, colorsObject } from "@gnd/utils/colors";

interface ShelfBlockProps {
  section: ShelfSection;
  baseUrl?: string;
  showImages: boolean;
}

export function ShelfBlock({ section, baseUrl, showImages }: ShelfBlockProps) {
  const totalSpan = sumColSpans(section.headers);

  return (
    <View style={cn(`flex-col border-x border-t text-sm`)}>
      <Text
        style={{
          ...cn(`text-sm p-1 uppercase text-center bg-slate-200`),
          fontWeight: 700,
        }}
      >
        {section.title}
      </Text>

      <View style={cn(`flex-col border-t`)}>
        {/* Header */}
        <View style={cn(`flex-row`)}>
          {section.headers.map((h, i) => (
            <View
              key={i}
              style={{
                ...cn(
                  `p-1 font-semibold ${i === section.headers.length - 1 ? "" : "border-r uppercase"}`,
                ),
                width: colWidth(h.colSpan, totalSpan),
                backgroundColor: hexToRgba(colorsObject.black, 0.2),
              }}
            >
              <Text>{h.title}</Text>
            </View>
          ))}
        </View>

        {/* Rows */}
        {section.rows.map((row, ri) => (
          <View key={ri} style={cn(`flex-row border-t`)}>
            {row.cells.map((cell, ci) => {
              const align = cell.align || "left";
              const alignClass =
                align === "right"
                  ? "text-right"
                  : align === "center"
                    ? "text-center"
                    : "text-left";
              const imageSrc =
                showImages && cell.image
                  ? resolveImageSrc(cell.image, baseUrl)
                  : null;

              return (
                <View
                  key={ci}
                  style={{
                    ...cn(
                      `p-1 ${alignClass} ${ci === row.cells.length - 1 ? "" : "border-r uppercase"}`,
                    ),
                    width: colWidth(cell.colSpan, totalSpan),
                  }}
                >
                  <View style={cn(`flex-col`)}>
                    {imageSrc && (
                      <Image
                        src={imageSrc}
                        style={{
                          width: 40,
                          height: 40,
                          objectFit: "contain",
                          marginBottom: 2,
                        }}
                      />
                    )}
                    <Text style={cell.bold ? { fontWeight: 700 } : undefined}>
                      {cell.value ?? ""}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
