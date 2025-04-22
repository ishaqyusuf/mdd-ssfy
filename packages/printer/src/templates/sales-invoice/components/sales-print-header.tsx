import { Image, Text, View } from "@react-pdf/renderer";

import { cn, style } from "../../../style";
import { SalesInvoiceTemplateProps } from "../../../types";

export function SalesPrintHeader(props: SalesInvoiceTemplateProps) {
  return (
    <View style={cn("flex gap-4")}>
      <View style={cn("w-2/3 flex")}></View>
      <View style={cn("w-1/2")}>
        <Text>ABCSSS</Text>
        <Text></Text>
        <View
          style={{
            width: 75,
          }}
        >
          <Image
            src={`logo.png`}
            style={cn({
              height: 75,
              objectFit: "contain",
            })}
          />
        </View>
      </View>
    </View>
  );
}
