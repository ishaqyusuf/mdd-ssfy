import type { CompanyAddress, PrintPage } from "@gnd/sales/print/types";
import { View } from "@react-pdf/renderer";
import type { SalesTemplateConfig } from "../../../registry";
import {
	DoorBlock,
	HeaderBlock,
	LineItemBlock,
	MouldingBlock,
	ServiceBlock,
	ShelfBlock,
	SignatureBlock,
} from "../blocks";

interface PackingSlipModeProps {
	page: PrintPage;
	baseUrl?: string;
	logoUrl?: string;
	qrCodeDataUrl?: string;
	companyAddress: CompanyAddress;
	config: SalesTemplateConfig;
}

/**
 * Packing slip mode: no prices, no footer, signature block only.
 */
export function PackingSlipMode({
	page,
	baseUrl,
	logoUrl,
	qrCodeDataUrl,
	companyAddress,
	config,
}: PackingSlipModeProps) {
	return (
		<>
			<View fixed style={{ paddingBottom: 8, marginBottom: 8 }}>
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
			</View>

			<View
				wrap={false}
				style={{
					flex: 1,
					flexDirection: "column",
					justifyContent: "flex-end",
				}}
			>
				<SignatureBlock signing={page.signing} baseUrl={baseUrl} />
			</View>
		</>
	);
}
