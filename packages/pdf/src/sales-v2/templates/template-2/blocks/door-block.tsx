import { Image, Text, View } from "@react-pdf/renderer";
import type { CellHeader, DoorSection, RowCell } from "@gnd/sales/print/types";
import { resolveImageSrc } from "../../../shared/utils";

// ─── Design tokens ─────────────────────────────────────────
const NAVY = "#1a2e4a";
const LIGHT_BG = "#f0f4fa";
const BORDER = "#d1dae8";
const ROW_ALT = "#f8fafc";

const COLUMN_WIDTHS: Record<string, number> = {
  rowNumber: 6,
  image: 10,
  dimension: 12,
  swing: 9,
  qty: 7,
  lhQty: 7,
  rhQty: 7,
  unitPrice: 9,
  lineTotal: 9,
  packing: 10,
};

interface DoorBlockProps {
  section: DoorSection;
  baseUrl?: string;
  showImages: boolean;
}

export function DoorBlock({ section, baseUrl, showImages }: DoorBlockProps) {
  const hasImageColumn =
    showImages && section.rows.some((row) => row.cells.some((cell) => cell.image));
  const widths = getColumnWidths(section.headers, hasImageColumn);
  const visibleDetails = section.details.filter((detail) => {
    const label = String(detail.label || "").trim();
    const value = String(detail.value || "").trim();
    return Boolean(label && value);
  });
  const detailRows: (typeof section.details)[] = [];
  for (let i = 0; i < visibleDetails.length; i += 2) {
    detailRows.push(visibleDetails.slice(i, i + 2));
  }

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

      {/* Detail rows */}
      {detailRows.length > 0 && (
        <View style={{ flexDirection: "column" }}>
          {detailRows.map((row, rowIndex) => (
            <View
              wrap={false}
              key={rowIndex}
              style={{
                flexDirection: "row",
                backgroundColor: rowIndex % 2 === 0 ? LIGHT_BG : "#ffffff",
                borderBottomWidth: 1,
                borderBottomColor: BORDER,
              }}
            >
              {row.map((detail, di) => (
                <View
                  key={`${detail.label}-${di}`}
                  style={{
                    flexDirection: "row",
                    flex: 1,
                    borderRightWidth: di < row.length - 1 ? 1 : 0,
                    borderRightColor: BORDER,
                  }}
                >
                  <View
                    style={{
                      paddingVertical: 3,
                      paddingHorizontal: 6,
                      width: "35%",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#1e293b" }}>
                      {formatDetailLabel(detail.label)}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingVertical: 3,
                      paddingHorizontal: 6,
                      flex: 1,
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 7.5, color: "#1e293b" }}>
                      {String(detail.value || "").toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))}
              {row.length === 1 && <View style={{ flex: 1 }} />}
            </View>
          ))}
        </View>
      )}

      {/* Table header */}
      {section.rows.length > 0 && (
        <View style={{ flexDirection: "column" }}>
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

          {/* Rows */}
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
                  borderBottomWidth: 1,
                  borderBottomColor: BORDER,
                }}
              >
                {visualCells.map((column, ci) => (
                  <TableCell
                    key={`${column.key}-${ci}`}
                    columnKey={column.key}
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

function formatDetailLabel(label: string) {
  const normalized = String(label || "").trim().toUpperCase();
  return normalized === "DOOR CONFIGURATION" ? "CONFIGURATION" : normalized;
}

// ─── TableCell ─────────────────────────────────────────────

function TableCell({
  columnKey,
  value,
  width,
  align,
  bold,
  isLast,
  imageSrc,
  borderColor,
}: {
  columnKey: string;
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
            fontSize: 8.5,
            fontWeight: bold ? 700 : 500,
            color: "#1e293b",
            textAlign,
          }}
        >
          {value === "as-above"
            ? "✔"
            : columnKey === "door"
              ? String(value ?? "").toUpperCase()
              : (value ?? "")}
        </Text>
      )}
    </View>
  );
}

// ─── Column helpers ─────────────────────────────────────────

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
