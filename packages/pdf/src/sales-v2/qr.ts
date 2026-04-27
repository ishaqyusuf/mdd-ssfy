import QRCode from "qrcode";

export async function generateQrCodeDataUrl(value?: string | null) {
	if (!value) return undefined;

	return QRCode.toDataURL(value, {
		margin: 0,
		width: 144,
	});
}
