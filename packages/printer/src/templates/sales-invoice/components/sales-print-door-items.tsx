import { Text, View } from "@react-pdf/renderer";

import { cn } from "../../../style";
import { SalesInvoiceTemplateProps } from "../../../types";

export default function SalesPrintDoorItems({
  printData,
  index,
}: SalesInvoiceTemplateProps & { index: number }) {
  const { orderedPrinting } = printData.sale;
  const doors = orderedPrinting?.[index]?.nonShelf;
  if (!doors) return null;

  return (
    <View style={cn("flex-col")}>
      <Text
        style={cn("text-sm p-2 uppercase bg-slate-200 border", {
          fontWeight: 700,
        })}
      >
        {doors?.sectionTitle}
      </Text>

      <View style={cn("flex flex-wrap")}>
        {doors.details
          .filter(
            (d) => d.value && !["Height"].includes(d.step?.title as string),
          )
          .map((detail, i) => (
            <View
              key={i}
              style={cn("border border-red-400 col-span-2 w-1/2 flex")}
            >
              <View
                style={{
                  ...cn("col-span-3 p-1 w-1/3 border-r-1"),
                  fontWeight: 700,
                }}
              >
                <Text>{detail.step.title}</Text>
              </View>
              <View style={cn("p-1 w-2/3 px-4")}>
                <Text>{detail.value}</Text>
              </View>
            </View>
          ))}
      </View>

      {doors.lines?.length ? (
        <View style={cn("flex-col")}>
          <View style={cn("flex")}>
            {doors.itemCells.map((cell, i) => (
              <View
                key={i}
                style={{
                  ...cn("border px-4 py-2"),
                  flex: cell.colSpan,
                }}
              >
                <Text>{cell.title}</Text>
              </View>
            ))}
          </View>

          {doors.lines.map((line, i) => (
            <View key={i} style={cn("flex")}>
              {line.map((ld, ldi) => (
                <View
                  key={ldi}
                  style={{
                    ...cn("border px-4 py-2"),
                    flex: ld.colSpan,
                  }}
                >
                  {ld.value === "as-above" ? (
                    <Text style={{ textAlign: "center" }}>✔</Text>
                  ) : Array.isArray(ld.value) ? (
                    ld.value.map((val, vi) => <Text key={vi}>{val}</Text>)
                  ) : (
                    <Text>{ld.value}</Text>
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
