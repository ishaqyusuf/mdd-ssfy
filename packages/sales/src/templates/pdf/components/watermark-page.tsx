import { env } from "process";
import { Image, Page, PageProps, Text, View } from "@react-pdf/renderer";

import { cn, cva } from "@gnd/utils/react-pdf";

type WatermarkedPageProps = PageProps & {
  children: React.ReactNode;
  watermarkSrc?: string;
};
export default function WatermarkPage({
  style,
  children,
  ...pageProps
}: WatermarkedPageProps) {
  return (
    <Page {...pageProps} style={cn("relative", style)}>
      <View
        fixed
        style={{
          position: "absolute",
          top: "30%",
          left: "10%",
          width: "60%",
          opacity: 0.1,
          transform: "rotate(-30deg)",
          zIndex: 0,
          filter: "grayscale(100%)",
        }}
      >
        <View>
          <Image
            src={`${env.NEXT_PUBLIC_APP_URL}/logo.png`}
            style={cn({
              width: 500,
              height: 500,
              // display: "block",
              objectFit: "contain",
            })}
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
