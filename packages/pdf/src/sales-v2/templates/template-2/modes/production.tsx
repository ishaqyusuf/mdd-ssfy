/** @jsxImportSource react */
import type { CompanyAddress, PrintPage } from "@gnd/sales/print/types";
import { View } from "@react-pdf/renderer";
import type { SalesTemplateConfig } from "../../../registry";
import { HeaderBlock, SectionListBlock } from "../blocks";

interface ProductionModeProps {
	page: PrintPage;
	baseUrl?: string;
	logoUrl?: string;
	qrCodeDataUrl?: string;
	companyAddress: CompanyAddress;
	config: SalesTemplateConfig;
}

const FIRST_PAGE_HEADER_HEIGHT = 170;

/**
 * Production mode: no prices, no footer, no signature.
 */
export function ProductionMode({
	page,
	baseUrl,
	logoUrl,
	qrCodeDataUrl,
	companyAddress,
	config,
}: ProductionModeProps) {
	return (
		<>
			<View
				{...(!config.headlineFirstPage ? { fixed: true } : {})}
				style={{ paddingBottom: 8, marginBottom: 8 }}
			>
				<HeaderBlock
					meta={page.meta}
					billing={page.billing}
					shipping={page.shipping}
					companyAddress={companyAddress}
					baseUrl={baseUrl}
					logoUrl={logoUrl}
					qrCodeDataUrl={qrCodeDataUrl}
				/>
			</View>

			<View style={{ width: "100%" }}>
				<SectionListBlock
					sections={page.sections}
					baseUrl={baseUrl}
					showImages={config.showImages}
					firstPageHeaderHeight={FIRST_PAGE_HEADER_HEIGHT}
					pageBreakMode={config.pageBreakMode}
				/>
			</View>
		</>
	);
}
