import { Image, Text, View } from "@react-pdf/renderer";
import type { CellHeader, MouldingSection, RowCell } from "@gnd/sales/print/types";
import { resolveImageSrc } from "../../../shared/utils";

// ─── Design tokens ─────────────────────────────────────────
const NAVY = "#1a2e4a";
const BORDER = "#d1dae8";
const ROW_ALT = "#f8fafc";

const COLUMN_WIDTHS: Record<string, number> = {
  rowNumber: 6,
  image: 10,
  qty: 7,
  unitPrice: 9,
  lineTotal: 9,
  packing: 10,
};

interface MouldingBlockProps {
  section: MouldingSection;
  baseUrl?: string;
  showImages: boolean;
}

export function MouldingBlock({ section, baseUrl, showImages }: MouldingBlockProps) {
  const hasImageColumn =
    showImages && section.rows.some((row) => row.cells.some((cell) => cell.image));
  const widths = getColumnWidths(section.headers, hasImageColumn);

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
          {section.title}
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
            {buildHeaderColumns(section.headers, hasImageColumn).map(
              (column, index, columns) => (
                <View
                  key={`${column.key}-${index}`}
                  style={{
                    width: widths[column.key],
                    paddingVertical: 4,
                    paddingHorizontal: 5,
                    borderRightWidth: index < columns.length - 1 ? 1 : 0,
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
                    {column.title}
                  </Text>
                </View>
              ),
            )}
          </View>

          {section.rows.map((row, rowIndex) => {
            const imageSrc = resolveImageSrc(
              row.cells.find((cell) => cell.image)?.image,
              baseUrl,
            );
            const visualCells = buildRowColumns(section.headers, row.cells, hasImageColumn);

            return (
              <View
                wrap={false}
                key={rowIndex}
                style={{
                  flexDirection: "row",
                  backgroundColor: rowIndex % 2 === 0 ? "#ffffff" : ROW_ALT,
                  borderBottomWidth: rowIndex < section.rows.length - 1 ? 1 : 0,
                  borderBottomColor: BORDER,
                }}
              >
                {visualCells.map((column, ci) => (
                  <TableCell
                    key={`${column.key}-${ci}`}
                    value={column.value}
                    width={widths[column.key]}
                    align={column.align}
                    bold={column.bold}
                    isLast={ci === visualCells.length - 1}
                    imageSrc={column.key === "image" ? imageSrc : null}
                    borderColor={BORDER}
                  />
                ))}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function TableCell({
  value,
  width,
  align,
  bold,
  isLast,
  imageSrc,
  borderColor,
}: {
  value: RowCell["value"] | null;
  width: string;
  align?: RowCell["align"];
  bold?: boolean;
  isLast: boolean;
  imageSrc?: string | null;
  borderColor: string;
}) {
  const textAlign =
    align === "right" ? "right" : align === "center" ? "center" : "left";

  return (
    <View
      style={{
        width,
        paddingVertical: 3,
        paddingHorizontal: 5,
        borderRightWidth: isLast ? 0 : 1,
        borderRightColor: borderColor,
        justifyContent: "center",
      }}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          style={{ width: 36, height: 36, objectFit: "contain", alignSelf: "center" }}
        />
      ) : (
        <Text
          style={{
            fontSize: 7.5,
            fontWeight: bold ? 700 : 400,
            color: "#374151",
            textAlign,
          }}
        >
          {value ?? ""}
        </Text>
      )}
    </View>
  );
}

function buildHeaderColumns(headers: CellHeader[], hasImageColumn: boolean) {
  const columns: { key: string; title: string }[] = [];
  headers.forEach((header, index) => {
    columns.push({ key: headerKey(header, index), title: header.title });
    if (index === 0 && hasImageColumn) {
      columns.push({ key: "image", title: "Image" });
    }
  });
  return columns;
}

function buildRowColumns(
  headers: CellHeader[],
  cells: RowCell[],
  hasImageColumn: boolean,
) {
  const columns: Array<{
    key: string;
    value: RowCell["value"] | null;
    align?: RowCell["align"];
    bold?: boolean;
  }> = [];

  cells.forEach((cell, index) => {
    columns.push({
      key: headerKey(headers[index]!, index),
      value: cell.value,
      align: cell.align,
      bold: cell.bold,
    });
    if (index === 0 && hasImageColumn) {
      columns.push({ key: "image", value: null, align: "center" });
    }
  });
  return columns;
}

function getColumnWidths(headers: CellHeader[], hasImageColumn: boolean) {
  const keys = headers.map((header, index) => headerKey(header, index));
  const fixedUsed = keys.reduce((sum, key) => sum + (COLUMN_WIDTHS[key] ?? 0), 0);
  const flexibleKeys = keys.filter((key) => !(key in COLUMN_WIDTHS));
  const remaining = 100 - fixedUsed - (hasImageColumn ? COLUMN_WIDTHS.image! : 0);
  const flexibleWidth =
    flexibleKeys.length > 0 ? `${remaining / flexibleKeys.length}%` : "0%";

  return keys.reduce<Record<string, string>>(
    (acc, key) => {
      acc[key] = key in COLUMN_WIDTHS ? `${COLUMN_WIDTHS[key]}%` : flexibleWidth;
      return acc;
    },
    hasImageColumn ? { image: `${COLUMN_WIDTHS.image}%` } : {},
  );
}

function headerKey(header: CellHeader, index: number) {
  if (index === 0) return "rowNumber";
  return header.key ?? `col-${index}`;
}
