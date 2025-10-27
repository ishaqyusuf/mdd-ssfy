import { Text, View } from "@react-pdf/renderer";

import { cn } from "@gnd/utils/react-pdf";
import { colorsObject, hexToRgba } from "@gnd/utils/colors";
import { sum } from "@gnd/utils";

type SalesInvoiceTemplateProps = any;

export default function SalesPrintShelfItems({
  printData: sale,
  index,
}: SalesInvoiceTemplateProps & { index: number }) {
  // const { sale } = printData;
  const shelf = sale.orderedPrinting?.[index]?.shelf;
  if (!shelf) return null;
  if (!sale.shelfItemsTable) return null;
  const width = (span, lns) =>
    !span
      ? `${100 - Number(sum(lns, "colSpan") * 5)}%`
      : `${Number(span) * 5}%`;
  return (
    <View style={cn("flex-col border-x border-t text-sm")}>
      <Text
        style={cn("text-sm p-1 uppercase text-center bg-slate-200", {
          fontWeight: 700,
        })}
      >
        Shelf Items
      </Text>
      <View style={cn("flex-col border-t")}>
        <View style={cn("flex")}>
          {shelf?.cells?.map((cell, i) => (
            <View
              key={i}
              style={{
                ...cn(
                  "p-1 font-semibold",
                  i == shelf?.cells?.length - 1 ? "" : "border-r uppercase"
                ),
                // flex: cell.colSpan,
                width: width(cell.colSpan, shelf?.cells),
                backgroundColor: hexToRgba(colorsObject.black, 0.2),
              }}
            >
              <Text>{cell.title}</Text>
            </View>
          ))}
        </View>
        {shelf?._shelfItems?.map((line, li) => (
          <View key={li} style={cn("flex border-t")}>
            {line.map((cell, ci) => (
              <View
                key={`a-${ci}`}
                style={{
                  ...cn(
                    "p-1",
                    ci == line.length - 1 ? "" : "border-r uppercase"
                  ),
                  width: width(cell?.colSpan, line),
                }} // Use flex-1 to distribute space evenly
              >
                <Text {...cell.style}>{cell.value}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
