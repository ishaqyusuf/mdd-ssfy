import { Image, Text, View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";
import type { CellHeader, DoorSection, RowCell } from "@gnd/sales/print/types";
import { resolveImageSrc } from "../../../shared/utils";
import { hexToRgba, colorsObject } from "@gnd/utils/colors";

interface DoorBlockProps {
  section: DoorSection;
  baseUrl?: string;
  showImages: boolean;
}

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

export function DoorBlock({ section, baseUrl, showImages }: DoorBlockProps) {
  const detailRows = [];
  const hasImageColumn =
    showImages &&
    section.rows.some((row) => row.cells.some((cell) => cell.image));
  const widths = getColumnWidths(section.headers, hasImageColumn);

  for (let index = 0; index < section.details.length; index += 2) {
    detailRows.push(section.details.slice(index, index + 2));
  }

  return (
    <View style={cn(`flex-col border-x border-t text-sm`)}>
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

      {section.details.length > 0 && (
        <View style={cn(`flex-col text-xs uppercase`)}>
          {detailRows.map((row, rowIndex) => (
            <View
              wrap={false}
              key={rowIndex}
              style={cn(`flex-row border-b`)}
            >
              {row.map((detail, detailIndex) => (
                <View
                  key={`${detail.label}-${detailIndex}`}
                  style={{
                    ...cn(`flex-row w-1/2`),
                    ...(detailIndex > 0 ? cn(`border-l`) : {}),
                  }}
                >
                  <View style={cn(`p-1 w-1/3 border-r font-bold`)}>
                    <Text>{detail.label}</Text>
                  </View>
                  <View style={cn(`p-1 w-2/3 font-medium`)}>
                    <Text>{detail.value}</Text>
                  </View>
                </View>
              ))}
              {row.length === 1 ? <View style={cn(`w-1/2`)} /> : null}
            </View>
          ))}
        </View>
      )}

      {section.rows.length > 0 && (
        <View style={cn(`flex-col`)}>
          <View style={cn(`flex-row border-t`)}>
            {buildHeaderColumns(section.headers, hasImageColumn).map(
              (column, index, columns) => (
                <View
                  key={`${column.key}-${index}`}
                  style={{
                    ...cn(
                      `p-1 font-semibold uppercase ${index === columns.length - 1 ? "" : "border-r"}`,
                    ),
                    width: widths[column.key],
                    backgroundColor: hexToRgba(colorsObject.black, 0.2),
                  }}
                >
                  <Text>{column.title}</Text>
                </View>
              ),
            )}
          </View>

          {section.rows.map((row, rowIndex) => {
            const imageSrc = resolveImageSrc(
              row.cells.find((cell) => cell.image)?.image,
              baseUrl,
            );
            const visualCells = buildRowColumns(
              section.headers,
              row.cells,
              hasImageColumn,
            );

            return (
              <View
                wrap={false}
                key={rowIndex}
                style={cn(`flex-row border-b font-medium text-xs`)}
              >
                {visualCells.map((column, columnIndex) => (
                  <TableCell
                    key={`${column.key}-${columnIndex}`}
                    value={column.value}
                    width={widths[column.key]}
                    align={column.align}
                    bold={column.bold}
                    isLast={columnIndex === visualCells.length - 1}
                    imageSrc={column.key === "image" ? imageSrc : null}
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
}: {
  value: RowCell["value"] | null;
  width: string;
  align?: RowCell["align"];
  bold?: boolean;
  isLast: boolean;
  imageSrc?: string | null;
}) {
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

  return (
    <View
      style={{
        ...cn(
          `p-1 ${alignClass} ${bold ? "font-bold" : ""} ${isLast ? "" : "border-r uppercase"}`,
        ),
        width,
      }}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          style={{
            width: 40,
            height: 40,
            objectFit: "contain",
            marginHorizontal: "auto",
          }}
        />
      ) : (
        <Text>{value === "as-above" ? "✔" : (value ?? "")}</Text>
      )}
    </View>
  );
}

function buildHeaderColumns(headers: CellHeader[], hasImageColumn: boolean) {
  const columns: { key: string; title: string }[] = [];

  headers.forEach((header, index) => {
    columns.push({
      key: headerKey(header, index),
      title: header.title,
    });

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
      columns.push({
        key: "image",
        value: null,
        align: "center",
      });
    }
  });

  return columns;
}

function getColumnWidths(headers: CellHeader[], hasImageColumn: boolean) {
  const keys = headers.map((header, index) => headerKey(header, index));
  const fixedUsed = keys.reduce((sum, key) => sum + (COLUMN_WIDTHS[key] ?? 0), 0);
  const flexibleKeys = keys.filter((key) => !(key in COLUMN_WIDTHS));
  const remaining =
    100 - fixedUsed - (hasImageColumn ? COLUMN_WIDTHS.image : 0);
  const flexibleWidth =
    flexibleKeys.length > 0 ? `${remaining / flexibleKeys.length}%` : "0%";

  return keys.reduce<Record<string, string>>((acc, key) => {
    acc[key] = key in COLUMN_WIDTHS ? `${COLUMN_WIDTHS[key]}%` : flexibleWidth;
    return acc;
  }, hasImageColumn ? { image: `${COLUMN_WIDTHS.image}%` } : {});
}

function headerKey(header: CellHeader, index: number) {
  if (index === 0) return "rowNumber";
  return header.key ?? `col-${index}`;
}
