import { Image, Text, View } from "@react-pdf/renderer";
import { SalesInvoiceTemplateProps } from "../../types";
import { cn } from "../../utils/cn";

export function SalesPrintFooter({ printData }: SalesInvoiceTemplateProps) {
  const { sale } = printData;
  if (!sale.footer) return null;

  const lines: any[] = sale.footer.lines as any;

  return (
    <View style={cn("text-right font-bold flex")}>
      <View style={cn("border flex-col w-2/3 border-gray-400 p-2")}>
        <Text
          style={cn(
            "col-span-2 text-left text-xs font-normal italic text-red-600",
          )}
        >
          Note: Payments made with Cards will have an additional 3% charge to
          cover credit cards merchants fees.
        </Text>

        <View style={cn("p-1 flex-col")}>
          {[ 
            "1) NO RETURN ON SPECIAL ORDER",
            "2) NO DAMAGED ORDER MAY BE EXCHANGE OR RETURN",
            "3) ONCE SIGN THERE IS NO RETURN OR EXCHANGE.",
          ].map((i, index) => (
            <Text style={cn("text-left text-xs text-red-600")} key={index}>
              {i}
            </Text>
          ))}
        </View>
      </View>

      <View style={cn("relative w-1/3")}>
        <View style={cn("w-full")}>
          {lines.map((line, index) => (
            <View
              key={index}
              style={cn("border border-gray-400 flex justify-between")}
            >
              <View style={cn("bg-slate-200 flex-4 px-1 py-1.5")}>
                <Text style={cn(line.style)}>{line.title}</Text>
              </View>

              <View style={cn("flex-2 px-1 py-1")}>
                <Text style={cn(line.style)}>{line.value}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}