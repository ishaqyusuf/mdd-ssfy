import { Document, Font, Image, Page, Text, View } from "@react-pdf/renderer";
import QRCodeUtil from "qrcode";
import { QRCode } from "./components/qr-code";
import { Info } from "../../generate-print-data";
import { DataCell } from "./components/data-cell";
import { Header } from "./components/header";

Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fMZhrib2Bg-4.ttf",
      fontWeight: 500,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf",
      fontWeight: 700,
    },
    // Italic fonts
    {
      src: "https://fonts.gstatic.com/s/inter/v19/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTc2dthjQ.ttf",
      fontWeight: 400,
      fontStyle: "italic",
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v19/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTc69thjQ.ttf",
      fontWeight: 500,
      fontStyle: "italic",
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v19/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTcB9xhjQ.ttf",
      fontWeight: 600,
      fontStyle: "italic",
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v19/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTcPtxhjQ.ttf",
      fontWeight: 700,
      fontStyle: "italic",
    },
  ],
});
interface Props {
  units: {
    data: Info[];
  }[];
  template: {
    logoUrl?: string;
    size: "LETTER" | "A4";
  };
}
export async function PdfTemplate(props: Props) {
  const { template } = props;
  let qrCode: any = null;

  //   if (template.includeQr) {
  qrCode = await QRCodeUtil.toDataURL(
    `https://gndprodesk.com/api/model-template?preview=true&slugs=`,
    {
      margin: 0,
      width: 40 * 3,
    }
  );
  //   }

  return (
    <Document>
      {props.units.map((unit, ui) => (
        <Page
          key={ui}
          wrap
          size={template.size.toUpperCase() as "LETTER" | "A4"}
          style={{
            padding: 20,
            backgroundColor: "#fff",
            color: "#000",
            // fontFamily: "Inter",
            // fontWeight: 400,
          }}
        >
          <Header />

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
            }}
          >
            {unit.data.map((cell, ci) => (
              <DataCell key={ci} cell={cell} />
            ))}
          </View>

          <View style={{ flexDirection: "row", marginTop: 20 }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              {qrCode && <QRCode data={qrCode} />}
            </View>

            <View style={{ flex: 1, marginLeft: 10 }}></View>
          </View>
        </Page>
      ))}
    </Document>
  );
}
