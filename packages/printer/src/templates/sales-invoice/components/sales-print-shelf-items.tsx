import { env } from "process";
import { Image, Text, View } from "@react-pdf/renderer";

import { cn } from "../../../style";
import { SalesInvoiceTemplateProps } from "../../../types";

export default function SalesPrintShelfItems({
  printData,
  index,
}: SalesInvoiceTemplateProps & { index: number }) {
  const { sale } = printData;
  const shelf = sale.orderedPrinting?.[index]?.shelf;
  if (!shelf) return null;
  if (!sale.shelfItemsTable) return null;

  return (
    <View style={cn("my-4")}>
      <View style={cn("table-fixed w-full border")}>
        <View style={cn("flex")}>
          <Text
            style={cn("p-2 text-start uppercase text-base bg-slate-200")}
            // Replaced colSpan with a flex structure
          >
            Shelf Items
          </Text>
        </View>

        {/* Header row for shelf cells */}
        <View style={cn("flex")}>
          {shelf?.cells?.map((cell, i) => (
            <View
              key={i}
              style={cn("border px-2", "flex-1")} // Use flex-1 to distribute space evenly
            >
              <Text {...cell.style}>{cell.title}</Text>
            </View>
          ))}
        </View>

        {/* Data rows for shelf items */}
        {shelf?._shelfItems?.map((cells, i) => (
          <View key={i} style={cn("flex")}>
            {cells.map((cel, i) => (
              <View
                key={`a-${i}`}
                style={cn("border px-2", "flex-1")} // Use flex-1 to distribute space evenly
              >
                <Text {...cel.style}>{cel.value}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
