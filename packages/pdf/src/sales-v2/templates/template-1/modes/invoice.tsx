import type { CompanyAddress, PrintPage } from "@gnd/sales/print/types";
import { View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";
import type { SalesTemplateConfig } from "../../../registry";
import {
	DoorBlock,
	FooterBlock,
	HeaderBlock,
	ImageGalleryBlock,
	LineItemBlock,
	MouldingBlock,
	ServiceBlock,
	ShelfBlock,
} from "../blocks";

interface InvoiceModeProps {
	page: PrintPage;
	baseUrl?: string;
	logoUrl?: string;
	qrCodeDataUrl?: string;
	companyAddress: CompanyAddress;
	config: SalesTemplateConfig;
}

export function InvoiceMode({
	page,
	baseUrl,
	logoUrl,
	qrCodeDataUrl,
	companyAddress,
	config,
}: InvoiceModeProps) {
	return (
		<>
			<View fixed style={cn("pb-2 flex-col border-b")}>
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
				{page.sections.map((section, index) => {
					const wrapperStyle = index === 0 ? undefined : { marginTop: 6 };

					switch (section.kind) {
						case "door":
							return (
								<View key={`door-${section.index}`} style={wrapperStyle}>
									<DoorBlock
										section={section}
										baseUrl={baseUrl}
										showImages={config.showImages}
									/>
								</View>
							);
						case "moulding":
							return (
								<View key={`moulding-${section.index}`} style={wrapperStyle}>
									<MouldingBlock
										section={section}
										baseUrl={baseUrl}
										showImages={config.showImages}
									/>
								</View>
							);
						case "service":
							return (
								<View key={`service-${section.index}`} style={wrapperStyle}>
									<ServiceBlock section={section} />
								</View>
							);
						case "shelf":
							return (
								<View key={`shelf-${section.index}`} style={wrapperStyle}>
									<ShelfBlock
										section={section}
										baseUrl={baseUrl}
										showImages={config.showImages}
									/>
								</View>
							);
						case "line-item":
							return (
								<View key={`line-${section.index}`} style={wrapperStyle}>
									<LineItemBlock section={section} />
								</View>
							);
					}
				})}

				{config.showImages ? (
					<View style={page.sections.length > 0 ? { marginTop: 6 } : undefined}>
						<ImageGalleryBlock sections={page.sections} baseUrl={baseUrl} />
					</View>
				) : null}
			</View>

			<View
				wrap={false}
				style={{
					...cn("border-x border-b border-t flex-col"),
					flex: 1,
					flexDirection: "column",
					justifyContent: "flex-end",
					borderColor: "#9ca3af",
				}}
			>
				{page.footer && <FooterBlock footer={page.footer} />}
			</View>
		</>
	);
}
