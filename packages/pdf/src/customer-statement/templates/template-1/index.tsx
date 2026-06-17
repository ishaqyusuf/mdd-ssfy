/** @jsxImportSource react */
import { View } from "@react-pdf/renderer";
import type { CustomerStatementTemplateRenderProps } from "../../registry";
import {
	FooterBlock,
	HeaderBlock,
	PaymentBlock,
	StatementTableBlock,
	SummaryBlock,
	WatermarkPage,
} from "./blocks";

const FOOTER_RESERVED_HEIGHT = 92;

export function Template1({
	data,
	baseUrl,
	logoUrl,
	watermark,
	watermarkText,
	qrCodeDataUrl,
	config,
}: CustomerStatementTemplateRenderProps) {
	return (
		<WatermarkPage
			size="LETTER"
			baseUrl={baseUrl}
			watermarkSrc={watermark}
			watermarkText={watermarkText || "Customer Statement"}
			showWatermark={config.showWatermark}
			style={{
				paddingTop: 26,
				paddingHorizontal: 28,
				paddingBottom: FOOTER_RESERVED_HEIGHT,
				fontFamily: "Inter",
				fontSize: 9,
				color: "#0f172a",
			}}
		>
			<HeaderBlock data={data} baseUrl={baseUrl} logoUrl={logoUrl} />
			<SummaryBlock data={data} />
			<StatementTableBlock data={data} />
			{config.showPaymentLink ? (
				<PaymentBlock data={data} qrCodeDataUrl={qrCodeDataUrl} />
			) : null}
			<View style={{ height: 16 }} />
			<FooterBlock printedAt={data.printedAt} />
		</WatermarkPage>
	);
}
