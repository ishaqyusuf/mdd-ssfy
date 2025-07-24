import { Image, Text, View } from "@react-pdf/renderer";
import { SalesInvoiceTemplateProps } from "../../types";
import { cn } from "../../utils/cn";

export function SalesPrintHeader({ printData }: SalesInvoiceTemplateProps) {
  const { sale } = printData || {};

  return (
    <View style={cn("mb-2")}>
      <View style={cn("flex")}>
        <View
          style={cn("", {
            width: "37.5%",
          })}
        >
          {sale?.header?.logoUrl && (
            <Image
              src={sale.header.logoUrl}
              style={cn({
                width: 150,
                height: 150,
                objectFit: "contain",
              })}
            />
          )}
        </View>
        <View style={cn("w-1/4 font-bold flex-col")}>
          <Text style={cn("text-sm font-mono")}>13285 SW 131 ST</Text>
          <Text style={cn("text-sm font-mono")}>Miami, Fl 33186</Text>
          <Text style={cn("text-sm font-mono")}>Phone: 305-278-6555</Text>
          {sale?.header?.isProd && (
            <Text style={cn("text-sm font-mono")}>Fax: 305-278-2003</Text>
          )}
          <Text style={cn("text-sm font-mono")}>support@gndmillwork.com</Text>
        </View>
        <View
          style={cn("flex-col p-2", {
            width: "37.5%",
          })}
        >
          {/* Heading */}
          <Text style={{ fontSize: 18, fontWeight: 700 }}>
            {sale?.header?.headerTitle}
          </Text>

          {sale?.header?.heading?.lines?.map((h: any) => (
            <View key={h.title} style={cn("flex justify-between")}>
              <Text style={{ fontWeight: 700 }}>{h.title}</Text>
              <Text style={cn(h.style)}>{h.value}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={cn("flex")}>
        {[sale?.address?.[0], null, sale?.address?.[1]].map(
          (address: any, index: number) => (
            <View
              key={address?.title || `spacer-${index}`}
              style={cn(
                index == 1 ? "w-1/4" : "",
                index == 1
                  ? {}
                  : {
                      width: "37.5%",
                    },
              )}
            >
              {index == 1 ? (
                <View style={cn("relative")}>
                  {sale?.isPacking && sale?.paymentDate && (
                    <View
                      style={cn("flex-col", {
                        position: "absolute",
                        top: -20,
                        left: 40,
                        transform: "rotate(-45deg)",
                        fontSize: 72,
                        lineHeight: 1,
                        fontWeight: 700,
                        color: "rgba(255, 0, 0, 0.3)",
                        textAlign: "center",
                      })}
                    >
                      <Text
                        style={{
                          fontSize: "3rem",
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                      >
                        Paid
                      </Text>
                      <Text style={{ fontSize: 24, lineHeight: "32px" }}>
                        {sale.paymentDate}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                address && (
                  <> 
                    <View>
                      <Text
                        style={cn(
                          "text-sm bg-slate-200 text-gray-700 border p-1 px-2",
                          {
                            fontWeight: 700,
                          },
                        )}
                      >
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
                  </>
                )
              )}
            </View>
          ),
        )}
      </View>
    </View>
  );
}
