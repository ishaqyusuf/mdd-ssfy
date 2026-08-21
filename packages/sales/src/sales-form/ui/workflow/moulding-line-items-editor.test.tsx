import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MouldingLineItemsEditor } from "./moulding-line-items-editor";

const source = readFileSync(
	new URL("./moulding-line-items-editor.tsx", import.meta.url),
	"utf8",
);

describe("MouldingLineItemsEditor estimate breakdown", () => {
	it("renders the compact five-column table", () => {
		const html = renderToStaticMarkup(
			<MouldingLineItemsEditor
				rows={[
					{
						uid: "moulding-1",
						title: "Casing",
						img: "casing.png",
						qty: 2,
						estimateUnit: 12,
						addon: 3,
						customPrice: null,
						unit: 15,
						lineTotal: 30,
					},
				]}
				totalQty={2}
				totalAmount={30}
				formatMoney={(value) => `$${Number(value || 0).toFixed(2)}`}
				componentLabel={(value) => value || ""}
				resolveImageSrc={(src) =>
					src ? `https://images.example/${src}` : null
				}
				onRowsChange={() => undefined}
				onRemoveRow={() => undefined}
			/>,
		);

		expect(html).toContain("w-full min-w-[620px]");
		expect(html).toContain('src="https://images.example/casing.png"');
		expect(html).toContain('alt="Casing"');
		expect(html).toContain('aria-label="View Casing image"');
		expect(html).toContain('data-component-image-preview-trigger="true"');
		expect(html).toContain(">Estimate<");
		expect(html).toContain(">Line Total<");
		expect(html).toContain('class="flex justify-end"');
	});

	it("moves add-on and custom pricing from table columns into the Estimate menu", () => {
		const header = source.slice(
			source.indexOf("<thead>"),
			source.indexOf("</thead>"),
		);

		expect(header).toContain(">Moulding<");
		expect(header).toContain(">Qty<");
		expect(header).toContain(">Estimate<");
		expect(header).toContain(">Line Total<");
		expect(header).toContain(">Remove<");
		expect(header).not.toContain(">Addon/Qty<");
		expect(header).not.toContain(">Custom<");
		expect(source).toContain("Cost estimate breakdown");
		expect(source).toContain("<FieldTitle>Addon/Qty</FieldTitle>");
		expect(source).toContain("<FieldTitle>Custom Price</FieldTitle>");
	});

	it("continues to patch pricing through the existing row update path", () => {
		expect(source).toContain("onPatch={(patch) => patchRow(index, patch)}");
		expect(source).toContain('event.target.value === ""');
		expect(source).toContain("? null");
	});
});
