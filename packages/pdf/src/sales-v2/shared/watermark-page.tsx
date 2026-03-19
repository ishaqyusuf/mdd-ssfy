import { Image, Page, View } from "@react-pdf/renderer";
import type { PageProps } from "@react-pdf/renderer";
import { cn } from "../../utils/tw";

interface WatermarkPageProps extends PageProps {
  children: React.ReactNode;
  watermarkSrc?: string;
  baseUrl?: string;
}

export function WatermarkPage({
  style,
  children,
  watermarkSrc,
  baseUrl,
  ...pageProps
}: WatermarkPageProps) {
  return (
    <Page {...pageProps} style={{ ...cn(`relative`), ...(style as object) }}>
      <View
        fixed
        style={{
          position: "absolute",
          top: "30%",
          left: "10%",
          width: "60%",
          opacity: 0.2,
          transform: "rotate(-30deg)",
          zIndex: 0,
        }}
      >
        <View>
          <Image
            src={watermarkSrc || `${baseUrl}/logo-grayscale.png`}
            style={{
              width: 500,
              height: 500,
              objectFit: "contain",
            }}
          />
        </View>
      </View>
      <View
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          flexDirection: "column",
        }}
      >
        {children}
      </View>
    </Page>
  );
}
