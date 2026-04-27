import QRCode from "qrcode";

export async function generateQrCodeDataUrl(value?: string | null) {
	if (!value) return undefined;

	return QRCode.toDataURL(value, {
		errorCorrectionLevel: "H",
		margin: 3,
		width: 256,
		type: "image/png",
		color: {
			dark: "#111827",
			light: "#FFFFFF",
		},
	});
}
