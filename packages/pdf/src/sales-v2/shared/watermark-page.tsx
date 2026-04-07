import { Image, Page, Text, View } from "@react-pdf/renderer";
import type { PageProps } from "@react-pdf/renderer";
import { cn } from "../../utils/tw";

interface WatermarkPageProps extends PageProps {
	children: React.ReactNode;
	watermarkSrc?: string;
	watermarkText?: string;
	baseUrl?: string;
}

export function WatermarkPage({
	style,
	children,
	watermarkSrc,
	watermarkText,
	baseUrl,
	...pageProps
}: WatermarkPageProps) {
	return (
		<Page {...pageProps} style={{ ...cn("relative"), ...(style as object) }}>
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
							width: 420,
							height: 420,
							objectFit: "contain",
						}}
					/>
				</View>
			</View>
			{watermarkText ? (
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
							fontSize: 34,
							fontWeight: 800,
							letterSpacing: 4,
							color: "rgba(15,23,42,0.08)",
							textTransform: "uppercase",
							textAlign: "center",
						}}
					>
						{watermarkText}
					</Text>
				</View>
			) : null}
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
