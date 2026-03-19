import { Image, Text, View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";
import type { DoorSection, RowCell } from "@gnd/sales/print/types";
import { resolveImageSrc, colWidth, sumColSpans } from "../../../shared/utils";
import { hexToRgba, colorsObject } from "@gnd/utils/colors";

interface DoorBlockProps {
  section: DoorSection;
  baseUrl?: string;
  showImages: boolean;
}

export function DoorBlock({ section, baseUrl, showImages }: DoorBlockProps) {
  const totalSpan = sumColSpans(section.headers);

  return (
    <View style={cn(`flex-col border-x text-sm`)}>
      {/* Section title */}
      <Text wrap={false} style={cn(`text-sm p-1 uppercase text-left`)}>
        {section.title}
      </Text>

      {/* Detail configs (2-column grid) */}
      {section.details.length > 0 && (
        <View style={cn(`flex-row text-xs uppercase flex-wrap`)}>
          {section.details.map((detail, i) => (
            <View
              wrap={false}
              key={i}
              style={cn(
                `col-span-2 border-b w-1/2 flex-row ${i % 2 === 1 ? "border-l" : ""}`,
              )}
            >
              <View style={cn(`col-span-3 p-1 w-1/3 border-r font-bold`)}>
                <Text>{detail.label}</Text>
              </View>
              <View style={cn(`p-1 w-2/3 font-medium`)}>
                <Text>{detail.value}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Table header + rows */}
      {section.rows.length > 0 && (
        <View style={cn(`flex-col`)}>
          {/* Header row */}
          <View style={cn(`flex-row border-t`)}>
            {section.headers.map((h, i) => (
              <View
                key={i}
                style={{
                  ...cn(
                    `p-1 font-semibold uppercase ${i === section.headers.length - 1 ? "" : "border-r"}`,
                  ),
                  width: colWidth(h.colSpan, totalSpan),
                  backgroundColor: hexToRgba(colorsObject.black, 0.2),
                }}
              >
                <Text>{h.title}</Text>
              </View>
            ))}
          </View>

          {/* Data rows */}
          {section.rows.map((row, ri) => (
            <View
              wrap={false}
              key={ri}
              style={cn(`flex-row border-b font-medium text-xs`)}
            >
              {row.cells.map((cell, ci) => (
                <CellView
                  key={ci}
                  cell={cell}
                  isLast={ci === row.cells.length - 1}
                  width={colWidth(cell.colSpan, totalSpan)}
                  baseUrl={baseUrl}
                  showImages={showImages}
                />
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function CellView({
  cell,
  isLast,
  width,
  baseUrl,
  showImages,
}: {
  cell: RowCell;
  isLast: boolean;
  width: string;
  baseUrl?: string;
  showImages: boolean;
}) {
  const align = cell.align || "left";
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

  const imageSrc =
    showImages && cell.image ? resolveImageSrc(cell.image, baseUrl) : null;

  return (
    <View
      style={{
        ...cn(
          `p-1 ${alignClass} ${cell.bold ? "font-bold" : ""} ${isLast ? "" : "border-r uppercase"}`,
        ),
        width,
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
        <Text>{cell.value === "as-above" ? "✔" : (cell.value ?? "")}</Text>
      </View>
    </View>
  );
}
