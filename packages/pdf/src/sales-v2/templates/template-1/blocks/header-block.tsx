import { Image, Text, View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";
import type { PageMeta, AddressBlock, CompanyAddress } from "@gnd/sales/print/types";

interface HeaderBlockProps {
  meta: PageMeta;
  billing: AddressBlock | null;
  shipping: AddressBlock | null;
  companyAddress: CompanyAddress;
  baseUrl?: string;
  logoUrl?: string;
}

export function HeaderBlock({
  meta,
  billing,
  shipping,
  companyAddress,
  baseUrl,
  logoUrl,
}: HeaderBlockProps) {
  const logoSrc = logoUrl || `${baseUrl}/logo.png`;

  return (
    <View style={cn(`mb-2`)}>
      {/* Top row: logo + company info | heading */}
      <View style={{...cn(`flex`), alignItems: "flex-start" }}>
        {/* Left: logo + company address */}
        <View style={{ width: "62.5%" }}>
          <View style={cn(`flex`)}>
            <Image
              src={logoSrc}
              style={{ width: 150, height: 80, objectFit: "contain" }}
            />
          </View>
          <View style={{...cn(`font-bold`), marginBottom: 16 }} wrap={false}>
            <Text style={cn(`text-sm`)}>{companyAddress.address1}</Text>
            <Text style={cn(`text-sm`)}>{companyAddress.address2}</Text>
            <Text style={cn(`text-sm`)}>Phone: {companyAddress.phone}</Text>
            {companyAddress.fax && (
              <Text style={cn(`text-sm`)}>Fax: {companyAddress.fax}</Text>
            )}
            <Text style={cn(`text-sm`)}>support@gndmillwork.com</Text>
          </View>
        </View>

        {/* Right: heading info */}
        <View style={{...cn(`flex-col p-2 text-sm`), width: "37.5%" }}>
          <Text
            style={{...cn(`text-right capitalize mb-4`), fontSize: 18, fontWeight: 700 }}
          >
            {meta.title}
          </Text>

          <HeadingLine
            label={meta.status === "paid" ? "Invoice #" : "Quote #"}
            value={meta.salesNo}
            bold
          />
          <HeadingLine
            label={meta.status === "paid" ? "Invoice Date" : "Quote Date"}
            value={meta.date}
          />
          {meta.rep && <HeadingLine label="Rep" value={meta.rep} />}
          {meta.goodUntil && (
            <HeadingLine label="Good Until" value={meta.goodUntil} />
          )}
          {meta.po && <HeadingLine label="P.O No" value={meta.po} />}
          {meta.balanceDue && (
            <HeadingLine label="Balance Due" value={meta.balanceDue} bold />
          )}
          {meta.dueDate && <HeadingLine label="Due Date" value={meta.dueDate} />}
        </View>
      </View>

      {/* Address row */}
      <View style={cn(`flex`)}>
        {[billing, null, shipping].map((addr, i) => (
          <View
            key={i}
            style={
              i === 1
                ? cn(`w-1/4`)
                : {...cn(`border`), width: "70%" }
            }
          >
            {i === 1 ? (
              <PaidStamp paymentDate={meta.paymentDate} />
            ) : addr ? (
              <>
                <View>
                  <Text
                    style={cn(`text-sm border-b bg-slate-200 text-gray-700 p-1 px-1 font-bold uppercase`)}
                  >
                    {addr.title}
                  </Text>
                </View>
                <View style={cn(`p-2 text-xs font-medium flex-col`)}>
                  {addr.lines.map((line, idx) => (
                    <Text key={idx}>{line}</Text>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function HeadingLine({
  label,
  value,
  bold,
}: {
  label: string;
  value?: string;
  bold?: boolean;
}) {
  return (
    <View style={{...cn(`flex justify-between items-end`), marginBottom: 2 }}>
      <Text style={{ fontWeight: 700 }}>{label}</Text>
      <Text style={cn(`${bold ? "font-bold" : ""}`)}>{value}</Text>
    </View>
  );
}

function PaidStamp({ paymentDate }: { paymentDate?: string }) {
  if (!paymentDate) return <View />;
  return (
    <View style={cn(`relative`)}>
      <View
        style={{
          ...cn(`flex-col`),
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
        }}
      >
        <Text style={{ fontSize: 40, fontWeight: 700, textAlign: "center" }}>
          Paid
        </Text>
        <Text style={{ fontSize: 24, lineHeight: 1 }}>{paymentDate}</Text>
      </View>
    </View>
  );
}
