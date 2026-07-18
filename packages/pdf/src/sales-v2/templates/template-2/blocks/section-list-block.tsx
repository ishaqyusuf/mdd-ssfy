/** @jsxImportSource react */
import type { PrintSection } from "@gnd/sales/print/types";
import { View } from "@react-pdf/renderer";
import type { SalesPageBreakMode } from "../../../shared/page-break-mode";
import { paginatePrintSections } from "../../../shared/pagination";
import { DoorBlock } from "./door-block";
import { LineItemBlock } from "./line-item-block";
import { MouldingBlock } from "./moulding-block";
import { ServiceBlock } from "./service-block";
import { ShelfBlock } from "./shelf-block";

interface SectionListBlockProps {
	sections: PrintSection[];
	baseUrl?: string;
	showImages: boolean;
	firstPageHeaderHeight: number;
	pageBreakMode: SalesPageBreakMode;
}

export function SectionListBlock({
	sections,
	baseUrl,
	showImages,
	firstPageHeaderHeight,
	pageBreakMode,
}: SectionListBlockProps) {
	const paginatedSections = paginatePrintSections(sections, {
		showImages,
		firstPageHeaderHeight,
		pageBreakMode,
	});

	return (
		<>
			{paginatedSections.map((chunk) => {
				const wrapperStyle =
					chunk.sourceIndex === 0 && chunk.chunkIndex === 0
						? undefined
						: { marginTop: 6 };

				return (
					<View
						key={chunk.key}
						wrap={false}
						{...(chunk.pageBreakBefore ? { break: true } : {})}
						style={wrapperStyle}
					>
						{renderSection(chunk.section, baseUrl, showImages)}
					</View>
				);
			})}
		</>
	);
}

function renderSection(
	section: PrintSection,
	baseUrl: string | undefined,
	showImages: boolean,
) {
	switch (section.kind) {
		case "door":
			return (
				<DoorBlock
					section={section}
					baseUrl={baseUrl}
					showImages={showImages}
				/>
			);
		case "moulding":
			return (
				<MouldingBlock
					section={section}
					baseUrl={baseUrl}
					showImages={showImages}
				/>
			);
		case "service":
			return <ServiceBlock section={section} />;
		case "shelf":
			return (
				<ShelfBlock
					section={section}
					baseUrl={baseUrl}
					showImages={showImages}
				/>
			);
		case "line-item":
			return (
				<LineItemBlock
					section={section}
					baseUrl={baseUrl}
					showImages={showImages}
				/>
			);
	}
}
