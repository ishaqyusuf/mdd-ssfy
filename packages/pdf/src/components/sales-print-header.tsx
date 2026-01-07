import { env } from "process";
import { Image, Text, View } from "@react-pdf/renderer";

import { cn } from "@gnd/utils/react-pdf";
import { getAddress } from "../utils/get-address";

type SalesInvoiceTemplateProps = {
  printData: any;
  baseUrl?: string;
};

export default function SalesPrintHeader({
  printData: sale,
  baseUrl,
}: SalesInvoiceTemplateProps) {
  const address = getAddress(sale);
  return (
    <View style={cn("mb-2")}>
      <View
        style={cn("flex", {
          alignItems: "start",
        })}
      >
        <View
          style={{
            width: `${100 - 37.5}%`,
          }}
        >
          <View
            style={cn("flex", {
              // width: "30%",
              //
            })}
          >
            <Image
              src={`${baseUrl}/logo.png`}
              style={cn({
                width: 150,
                height: 80,
                // display: "block",
                objectFit: "contain",
              })}
            />
          </View>
          <View
            style={cn("font-bold", {
              marginBottom: 16,
            })}
            wrap={false}
          >
            <Text style={cn("text-sm font-mono$")}>{address?.address1}</Text>
            <Text style={cn("text-sm font-mono$")}>{address?.address2}</Text>
            <Text style={cn("text-sm font-mono$")}>
              Phone:
              {address?.phone}
            </Text>
            {sale.isProd && address?.fax && (
              <Text style={cn("text-sm font-mono$")}>Fax: {address.fax}</Text>
            )}
            <Text
              style={cn("text-sm font-mono$", {
                textWrap: "nowrap",
              })}
            >
              support@gndmillwork.com
            </Text>
          </View>
        </View>
        <View
          style={cn("flex-col p-2 text-sm", {
            width: "37.5%",
          })}
        >
          {/* Heading */}
          <Text
            style={cn(
              { fontSize: 18, fontWeight: 700 },
              "text-right capitalize mb-4"
            )}
          >
            {sale?.headerTitle}
          </Text>

          {sale?.heading?.lines?.map((h: any) => (
            <View
              key={h.title}
              style={cn("flex justify-between items-end", {
                marginBottom: 2,
              })}
            >
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
              key={address?.title}
              style={cn(
                index == 1 ? "w-1/4" : "",
                index == 1
                  ? {}
                  : {
                      width: "70%",
                      // width: "37.5%",
                      ...cn("border"),
                    }
              )}
            >
              {index == 1 ? (
                <View style={cn("relative")}>
                  {!sale?.paymentDate || (
                    <View
                      style={cn("flex-col", {
                        position: "absolute",
                        top: -100,
                        left: -10,
                        transform: "rotate(-45deg)",
                        fontSize: 55,
                        lineHeight: 1,
                        fontWeight: 700,
                        color: "rgba(255, 0, 0, 0.3)",
                        textAlign: "center",
                        zIndex: 10,
                      })}
                    >
                      <Text
                        style={{
                          fontSize: "2.5rem",
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                      >
                        Paid
                      </Text>
                      <Text style={{ fontSize: 24, lineHeight: "15px" }}>
                        {sale.paymentDate}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <>
                  <View>
                    <Text
                      style={cn(
                        "text-sm border-b bg-slate-200 text-gray-700 p-1 px-2 font-bold uppercase"
                      )}
                    >
                      {address?.title}
                    </Text>
                  </View>
                  <View style={{ ...cn("p-2 text-xs font-medium flex-col") }}>
                    {address?.lines?.map((line: string, idx: number) => (
                      <Text key={idx} style={cn("")}>
                        {line}
                      </Text>
                    ))}
                  </View>
                </>
              )}
            </View>
          )
        )}
      </View>
    </View>
  );
}
