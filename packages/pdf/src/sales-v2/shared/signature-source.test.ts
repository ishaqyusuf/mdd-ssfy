import { describe, expect, test } from "bun:test";
import {
	extractSignaturePathFromSvg,
	isSvgImageSource,
} from "./signature-source";

describe("PDF signature source", () => {
	test("recognizes stored SVG proof URLs with query strings", () => {
		expect(
			isSvgImageSource(
				"https://blob.example/dispatch/signature.svg?download=1",
			),
		).toBe(true);
		expect(isSvgImageSource("https://blob.example/signature.png")).toBe(false);
	});

	test("extracts only validated dispatch signature paths", () => {
		expect(
			extractSignaturePathFromSvg(
				'<svg viewBox="0 0 320 160"><path d="M 1 2 L 3 4" /></svg>',
			),
		).toBe("M 1 2 L 3 4");
		expect(
			extractSignaturePathFromSvg(
				'<svg><path d="M 1 2" onload="alert(1)" /></svg>',
			),
		).toBe("M 1 2");
		expect(extractSignaturePathFromSvg('<svg><path d="M 1 & 2" /></svg>')).toBe(
			null,
		);
	});
});
