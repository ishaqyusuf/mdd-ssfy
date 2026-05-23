import { describe, expect, it, mock } from "bun:test";

const getPrintDocumentDataMock = mock(async () => ({
	pages: [],
	title: "Invoice 100",
	companyAddress: {
		address1: "13285 SW 131 ST",
		address2: "Miami, Fl 33186",
		phone: "305-278-6555",
	},
	logoUrl: null,
}));

const renderSalesPdfBufferMock = mock(async () => Buffer.from("pdf"));

mock.module("@gnd/sales/print", () => ({
	getPrintDocumentData: getPrintDocumentDataMock,
}));

mock.module("@gnd/pdf/sales-v2", () => ({
	renderSalesPdfBuffer: renderSalesPdfBufferMock,
}));

describe("buildSalesPdfAttachment", () => {
	it("renders notification email attachments without product images", async () => {
		const { buildSalesPdfAttachment } = await import(
			"../src/types/sales-pdf-attachment"
		);

		const attachment = await buildSalesPdfAttachment({} as never, {
			salesIds: [22168],
			mode: "order",
		});

		expect(attachment).toEqual({
			filename: "Invoice 100.pdf",
			content: Buffer.from("pdf").toString("base64"),
			contentType: "application/pdf",
		});
		expect(renderSalesPdfBufferMock).toHaveBeenCalledWith(
			expect.objectContaining({
				config: {
					showImages: false,
				},
			}),
		);
	});
});
