import { Text, View } from "@react-pdf/renderer";

import { cn } from "../../../style";
import { SalesInvoiceTemplateProps } from "../../../types";

export default function SalesPrintLineItems({
  printData,
}: SalesInvoiceTemplateProps) {
  const { sale } = printData;
  if (!sale.lineItems) return null;

  return (
    <View style={cn("uppercase")}>
      <View style={cn("w-full")}>
        <View style={cn("flex", "border border-gray-400 bg-slate-100")}>
          {sale.lineItems.heading.map((col) => (
            <View
              key={col.title}
              style={cn("border border-gray-400  uppercase p-0.5", "flex-1")}
            >
              <Text>{col.title}</Text>
            </View>
          ))}
        </View>

        <View style={cn("flex")}>
          {sale.lineItems.lines.map((line) => (
            <View
              key={line.id}
              style={cn(!line.total && "bg-slate-200", "flex")}
            >
              {line.cells.map((cell, i) => (
                <View
                  key={i}
                  style={cn("border border-gray-400 uppercase", "flex-1")}
                >
                  <Text style={cn("p-0.5")} {...cell.style}>
                    {cell.title}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
