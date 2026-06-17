/** @jsxImportSource react */
import { Image, Page, Text, View } from "@react-pdf/renderer";
import type { PageProps } from "@react-pdf/renderer";
import type { ReactNode } from "react";

interface WatermarkPageProps extends PageProps {
	children: ReactNode;
	baseUrl?: string;
	watermarkSrc?: string | null;
	watermarkText?: string | null;
	showWatermark?: boolean;
}

export function WatermarkPage({
	children,
	baseUrl,
	watermarkSrc,
	watermarkText = "Customer Statement",
	showWatermark = true,
	style,
	...pageProps
}: WatermarkPageProps) {
	const imageSrc =
		watermarkSrc || (baseUrl ? `${baseUrl}/logo-grayscale.png` : null);

	return (
		<Page {...pageProps} style={{ position: "relative", ...(style as object) }}>
			{showWatermark ? (
				<>
					{imageSrc ? (
						<View
							fixed
							style={{
								position: "absolute",
								top: "30%",
								left: "10%",
								width: "80%",
								opacity: 0.1,
								transform: "rotate(-30deg)",
								zIndex: 0,
							}}
						>
							<Image
								src={imageSrc}
								style={{
									width: 420,
									height: 420,
									objectFit: "contain",
								}}
							/>
						</View>
					) : null}
					<View
						fixed
						style={{
							position: "absolute",
							top: "47%",
							left: "8%",
							width: "84%",
							transform: "rotate(-30deg)",
							zIndex: 0,
							alignItems: "center",
						}}
					>
						<Text
							style={{
								fontSize: 30,
								fontWeight: 700,
								letterSpacing: 3,
								color: "rgba(15,23,42,0.08)",
								textTransform: "uppercase",
								textAlign: "center",
							}}
						>
							{watermarkText}
						</Text>
					</View>
				</>
			) : null}
			<View style={{ position: "relative", zIndex: 1, flex: 1 }}>{children}</View>
		</Page>
	);
}
