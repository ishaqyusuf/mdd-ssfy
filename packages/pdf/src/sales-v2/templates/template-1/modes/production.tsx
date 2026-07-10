/** @jsxImportSource react */
import type { CompanyAddress, PrintPage } from "@gnd/sales/print/types";
import { View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";
import type { SalesTemplateConfig } from "../../../registry";
import {
	HeaderBlock,
	ImageGalleryBlock,
	SectionListBlock,
} from "../blocks";

interface ProductionModeProps {
	page: PrintPage;
	baseUrl?: string;
	logoUrl?: string;
	qrCodeDataUrl?: string;
	companyAddress: CompanyAddress;
	config: SalesTemplateConfig;
}

const FIRST_PAGE_HEADER_HEIGHT = 230;

/**
 * Production mode: no prices, no footer, no signature.
 * Shows company fax if available.
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
				style={cn("pb-2 flex-col border-b")}
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

			<View style={cn("w-full")}>
				<SectionListBlock
					sections={page.sections}
					baseUrl={baseUrl}
					showImages={config.showImages}
					firstPageHeaderHeight={FIRST_PAGE_HEADER_HEIGHT}
				/>

				{config.showImages ? (
					<View style={page.sections.length > 0 ? { marginTop: 6 } : undefined}>
						<ImageGalleryBlock sections={page.sections} baseUrl={baseUrl} />
					</View>
				) : null}
			</View>
		</>
	);
}
