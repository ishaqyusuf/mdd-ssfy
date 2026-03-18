import { Image, Text, View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";
import type { MouldingSection, RowCell } from "@gnd/sales/print/types";
import { resolveImageSrc, colWidth, sumColSpans } from "../../../shared/utils";
import { hexToRgba, colorsObject } from "@gnd/utils/colors";

interface MouldingBlockProps {
  section: MouldingSection;
  baseUrl?: string;
  showImages: boolean;
}

export function MouldingBlock({
  section,
  baseUrl,
  showImages,
}: MouldingBlockProps) {
  const totalSpan = sumColSpans(section.headers);

  return (
    <View style={cn(`flex-col border-x text-sm`)}>
      <Text wrap={false} style={cn(`text-sm p-1 uppercase text-left`)}>
        {section.title}
      </Text>

      {section.rows.length > 0 && (
        <View style={cn(`flex-col`)}>
          {/* Header */}
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

          {/* Rows */}
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
                const imageSrc =
                  showImages && cell.image
                    ? resolveImageSrc(cell.image, baseUrl)
                    : null;

                return (
                  <View
                    key={ci}
                    style={{
                      ...cn(`p-1 ${alignClass} ${cell.bold ? "font-bold" : ""} ${ci === row.cells.length - 1 ? "" : "border-r uppercase"}`),
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
                      <Text>{cell.value ?? ""}</Text>
                    </View>
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
