import type { SalesTemplateRenderProps } from "../../registry";
import { WatermarkPage } from "../../shared/watermark-page";
import {
	InvoiceMode,
	PackingSlipMode,
	ProductionMode,
	QuoteMode,
} from "./modes";

export function Template1(props: SalesTemplateRenderProps) {
	const {
		page,
		baseUrl,
		watermark,
		logoUrl,
		companyAddress,
		config,
		qrCodeDataUrl,
	} = props;
	const mode = page.config.mode;

	const modeProps = {
		page,
		baseUrl,
		logoUrl,
		companyAddress,
		config,
		qrCodeDataUrl,
	};

	return (
		<WatermarkPage
			wrap
			baseUrl={baseUrl}
			watermarkSrc={watermark}
			size="LETTER"
			style={{
				padding: 20,
				backgroundColor: "#fff",
				color: "#000",
				fontFamily: "Inter",
			}}
		>
			{mode === "invoice" && <InvoiceMode {...modeProps} />}
			{mode === "quote" && <QuoteMode {...modeProps} />}
			{mode === "production" && <ProductionMode {...modeProps} />}
			{(mode === "packing-slip" || mode === "order-packing") && (
				<PackingSlipMode {...modeProps} />
			)}
		</WatermarkPage>
	);
}
