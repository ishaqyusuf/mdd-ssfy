/** @jsxImportSource react */

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import {
	COMPONENT_IMAGE_PREVIEW_HIGHLIGHT_WINDOW_MS,
	ComponentImageLightbox,
	isComponentImagePreviewHighlightActive,
} from "./component-image-lightbox";

const source = readFileSync(
	new URL("./component-image-lightbox.tsx", import.meta.url),
	"utf8",
);

describe("ComponentImageLightbox", () => {
	it("renders an accessible preview trigger only when an image exists", () => {
		const html = renderToStaticMarkup(
			<ComponentImageLightbox
				imageSrc="https://images.example/door.png"
				title="Shaker Door"
				fallback={<span>Fallback</span>}
			/>,
		);

		expect(html).toContain('aria-label="View Shaker Door image"');
		expect(html).toContain('data-component-image-preview-trigger="true"');
		expect(html).toContain('src="https://images.example/door.png"');

		const fallbackHtml = renderToStaticMarkup(
			<ComponentImageLightbox
				imageSrc={null}
				title="Shaker Door"
				fallback={<span>Fallback</span>}
			/>,
		);
		expect(fallbackHtml).toContain("Fallback");
		expect(fallbackHtml).not.toContain(
			'data-component-image-preview-trigger="true"',
		);
	});

	it("keeps the discovery highlight active for seven days", () => {
		const firstSeenAt = Date.UTC(2026, 7, 21, 12);

		expect(
			isComponentImagePreviewHighlightActive(firstSeenAt, firstSeenAt),
		).toBe(true);
		expect(
			isComponentImagePreviewHighlightActive(
				firstSeenAt,
				firstSeenAt + COMPONENT_IMAGE_PREVIEW_HIGHLIGHT_WINDOW_MS - 1,
			),
		).toBe(true);
		expect(
			isComponentImagePreviewHighlightActive(
				firstSeenAt,
				firstSeenAt + COMPONENT_IMAGE_PREVIEW_HIGHLIGHT_WINDOW_MS,
			),
		).toBe(false);
	});

	it("uses a transparent image-only lightbox and a temporary spectral edge", () => {
		expect(source).toContain(
			"linear-gradient(135deg, #3b82f6 0%, #8b5cf6 55%, #f59e0b 100%)",
		);
		expect(source).toContain("component-image-preview-highlight:v2");
		expect(source).toContain("COMPONENT_IMAGE_PREVIEW_HIGHLIGHT_STYLE");
		expect(source).toContain("borderWidth: 1");
		expect(source).toContain('boxShadow: "none"');
		expect(source).not.toContain("animate-pulse");
		expect(source).toContain("cursor-pointer");
		expect(source).not.toContain("cursor-zoom-in");
		expect(source).toContain("border-0 bg-transparent p-0 shadow-none");
		expect(source).toContain("max-h-[86dvh]");
		expect(source).toContain("DialogClose asChild");
		expect(source).toContain("motion-reduce:transform-none");
	});
});
