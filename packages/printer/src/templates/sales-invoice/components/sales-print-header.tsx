import { env } from "process";
import { Image, Text, View } from "@react-pdf/renderer";

import { cn } from "../../../style";
import { SalesInvoiceTemplateProps } from "../../../types";

export default function SalesPrintHeader({
  printData,
}: SalesInvoiceTemplateProps) {
  const { sale } = printData;

  return (
    <View>
      <View>
        <View style={cn("flex")}>
          <View style={{ flex: 1 }}>
            {/* Replace this with your static logo if needed */}
            <Image
              src={`${env.NEXT_PUBLIC_APP_URL}/logo.png`}
              style={cn({
                width: 150,
                height: 150,
                display: "block",
                objectFit: "contain",
              })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={cn("text-sm font-mono")}>13285 SW 131 ST</Text>
            <Text style={cn("text-sm font-mono")}>Miami, Fl 33186</Text>
            <Text style={cn("text-sm font-mono")}>Phone: 305-278-6555</Text>
            {sale.isProd && (
              <Text style={cn("text-sm font-mono")}>Fax: 305-278-2003</Text>
            )}
            <Text style={cn("text-sm font-mono")}>support@gndmillwork.com</Text>
          </View>
        </View>

        <View style={cn("flex-col p-2")}>
          {" "}
          {/* Heading */}
          <Text style={{ fontSize: 18, fontWeight: 700 }}>
            {sale?.headerTitle}
          </Text>
          {sale?.heading?.lines?.map((h: any) => (
            <View key={h.title} style={cn("flex justify-between")}>
              <Text style={{ fontWeight: 700 }}>{h.title}</Text>
              <Text>{h.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Address Section */}
      <View style={cn("flex")}>
        {sale?.address?.map((address: any, index: number) => (
          <View key={address.title} style={{ flex: 1, padding: 8 }}>
            {index === 1 && sale.paymentDate && (
              <View
                style={{
                  position: "absolute",
                  top: -20,
                  left: 40,
                  transform: "rotate(-45deg)",
                }}
              >
                <Text style={{ fontSize: 32, fontWeight: 700 }}>Paid</Text>
                <Text style={{ fontSize: 16 }}>{sale.paymentDate}</Text>
              </View>
            )}

            <View>
              <Text style={{ ...cn("text-sm"), fontWeight: 700 }}>
                {address?.title}
              </Text>
            </View>
            <View style={{ ...cn("border p-2 flex-col") }}>
              {address?.lines?.map((line: string, idx: number) => (
                <Text key={idx} style={cn("text-sm")}>
                  {line}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// export function SalesPrintHeader(props: SalesInvoiceTemplateProps) {
//   return (
//     <View style={cn("flex gap-4")}>
//       <View style={cn("w-2/3 flex")}>
//         <View style={{ width: 150, height: 150 }}>
//           <Image
//             src={`${env.NEXT_PUBLIC_APP_URL}/logo.png`}
//             style={cn({
//               width: 150,
//               height: 150,
//               display: "block",
//               objectFit: "contain",
//             })}
//           />
//         </View>
//       </View>
//       <View style={cn("w-1/2")}>
//         <Text>ABCSSS</Text>
//         <Text></Text>
//       </View>
//     </View>
//   );
// }
