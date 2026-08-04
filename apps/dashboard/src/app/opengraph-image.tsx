import { SocialPreviewImage } from "@/components/marketing/social-preview-image";
import { ImageResponse } from "next/og";

export const alt =
	"GND Millwork — connected operations from quote to production";
export const contentType = "image/png";
export const size = {
	height: 630,
	width: 1200,
};

export default function Image() {
	return new ImageResponse(<SocialPreviewImage />, size);
}
