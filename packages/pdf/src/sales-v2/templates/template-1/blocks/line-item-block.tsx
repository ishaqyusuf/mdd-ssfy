import { Text, View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";
import type {
  CellHeader,
  LineItemSection,
} from "@gnd/sales/print/types";
import { hexToRgba, colorsObject } from "@gnd/utils/colors";

interface LineItemBlockProps {
  section: LineItemSection;
}

const BORDER_COLOR = "#9ca3af";
const COLUMN_WIDTHS: Record<string, number> = {
  rowNumber: 6,
  swing: 11,
  qty: 7,
  packing: 12,
  rate: 9,
  total: 10,
};

export function LineItemBlock({ section }: LineItemBlockProps) {
  const widths = getColumnWidths(section.headers);

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

      <View style={cn(`flex-col`)}>
        <View style={{ ...cn(`flex-row border-t`), borderColor: BORDER_COLOR }}>
          {section.headers.map((h, index) => (
            <View
              key={h.title}
              style={{
                ...cn(
                  `border-b uppercase ${index === section.headers.length - 1 ? "" : "border-r"}`,
                ),
                borderColor: BORDER_COLOR,
                paddingHorizontal: 4,
                paddingVertical: 2,
                width: widths[headerKey(h, index)],
                justifyContent: "center",
                backgroundColor: hexToRgba(colorsObject.black, 0.2),
              }}
            >
              <Text
                style={cn(
                  `font-semibold ${h.align === "right" ? "text-right" : h.align === "center" ? "text-center" : ""}`,
                )}
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
              ...cn(
                `flex-row border-b font-medium text-xs ${row.isGroupHeader ? "bg-slate-200" : ""}`,
              ),
              borderColor: BORDER_COLOR,
            }}
          >
            {row.cells.map((cell, ci) => {
              const key = headerKey(section.headers[ci]!, ci);

              return (
                <View
                  key={ci}
                  style={{
                    ...cn(
                      `${ci === row.cells.length - 1 ? "" : "border-r"} ${row.isGroupHeader ? "uppercase" : ""}`,
                    ),
                    borderColor: BORDER_COLOR,
                    width: widths[key],
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      ...cn(
                        `${cell.bold ? "font-bold" : ""} ${cell.align === "right" ? "text-right" : cell.align === "center" ? "text-center" : "text-left"} ${row.isGroupHeader ? "text-center uppercase" : ""}`,
                      ),
                      paddingHorizontal: 4,
                      paddingVertical: 3,
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
    </View>
  );
}

function getColumnWidths(headers: CellHeader[]) {
  const keys = headers.map((header, index) => headerKey(header, index));
  const fixedUsed = keys.reduce((sum, key) => sum + (COLUMN_WIDTHS[key] ?? 0), 0);
  const flexibleKeys = keys.filter((key) => !(key in COLUMN_WIDTHS));
  const remaining = Math.max(0, 100 - fixedUsed);
  const flexibleWidth =
    flexibleKeys.length > 0 ? `${remaining / flexibleKeys.length}%` : "0%";

  return keys.reduce<Record<string, string>>((acc, key) => {
    acc[key] = key in COLUMN_WIDTHS ? `${COLUMN_WIDTHS[key]}%` : flexibleWidth;
    return acc;
  }, {});
}

function headerKey(header: CellHeader, index: number) {
  if (index === 0) return "rowNumber";
  return header.key ?? `col-${index}`;
}
