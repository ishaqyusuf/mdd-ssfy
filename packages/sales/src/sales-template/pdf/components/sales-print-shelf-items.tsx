import { Image, Text, View } from "@react-pdf/renderer";
import { SalesInvoiceTemplateProps } from "../../types";
import { cn } from "../../utils/cn";

export function SalesPrintShelfItems({
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
          {shelf?.cells?.map((cell: any, i: number) => (
            <View
              key={i}
              style={cn("border px-2", "flex-1")} // Use flex-1 to distribute space evenly
            >
              <Text {...cell.style}>{cell.title}</Text>
            </View>
          ))}
        </View>

        {/* Data rows for shelf items */}
        {shelf?._shelfItems?.map((cells: any, i: number) => (
          <View key={i} style={cn("flex")}>
            {cells.map((cel: any, i: number) => (
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