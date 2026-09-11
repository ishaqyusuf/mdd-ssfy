import { it } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
	criticalCalendarSurface,
	criticalStatusBorders,
	productionCalendarCardClasses,
	productionCalendarColors,
} from "./calendar-colors";

const theme = readFileSync(require.resolve("tailwindcss/theme.css"), "utf8");
const appTheme = readFileSync(new URL("../../../../../packages/ui/src/styles/globals.css", import.meta.url), "utf8");

// Convert the actual theme's OKLCH tokens to display sRGB, then measure WCAG
// relative luminance. Dark card fills are composited over both app surfaces.
function rgb(token: string): number[] {
	const values = token.match(/oklch\(([^)]+)\)/)?.[1]?.split(/\s+/)
		.map(value => value.endsWith("%") ? Number.parseFloat(value) / 100 : Number(value));
	assert.ok(values && values.length === 3, `Unsupported color: ${token}`);
	const [L, C, hue] = values;
	const a = C! * Math.cos(hue! * Math.PI / 180);
	const b = C! * Math.sin(hue! * Math.PI / 180);
	const l = (L! + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L! - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L! - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
		.map(v => Math.max(0, Math.min(1, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)));
}
function color(name: string) {
	const token = theme.match(new RegExp(`--color-${name}:\\s*([^;]+)`))?.[1];
	assert.ok(token, `Missing theme token ${name}`);
	return rgb(token);
}
function luminance(channels: number[]) {
	return channels.reduce((sum, v, i) => sum + [0.2126, 0.7152, 0.0722][i]! *
		(v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4), 0);
}
function ratio(a: number[], b: number[]) {
	const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (values[0]! + 0.05) / (values[1]! + 0.05);
}

it("keeps all six canonical status text palettes above WCAG AA in light and dark", () => {
	const dark = appTheme.split(".dark {")[1]!;
	const surfaces = ["background", "card"].map(name => {
		const token = dark.match(new RegExp(`--${name}:\\s*([^;]+)`))?.[1];
		assert.ok(token);
		return rgb(token);
	});
	assert.equal(Object.keys(productionCalendarColors).length, 6);
	for (const [status, classes] of Object.entries(productionCalendarColors)) {
		const fill = classes.match(/^bg-([\w-]+)/)?.[1];
		const text = classes.match(/ text-([\w-]+)/)?.[1];
		const darkFill = classes.match(/dark:bg-([\w-]+)\/30/)?.[1];
		const darkText = classes.match(/dark:text-([\w-]+)/)?.[1];
		assert.ok(fill && text && darkFill && darkText);
		assert.ok(ratio(color(text), color(fill)) >= 4.5, `${status}: light contrast`);
		for (const surface of surfaces) {
			const blended = color(darkFill).map((v, i) => v * 0.3 + surface[i]! * 0.7);
			assert.ok(ratio(color(darkText), blended) >= 4.5, `${status}: dark contrast`);
		}
	}
});

it("uses a restrained red critical surface while retaining each status border", () => {
	for (const status of Object.keys(productionCalendarColors)) {
		const classes = productionCalendarCardClasses(status, "CRITICAL");
		assert.ok(classes.includes("border-2"));
		assert.ok(classes.includes("bg-red-700/90"));
		assert.ok(classes.includes("text-white"));
		assert.ok(
			classes.includes(
				criticalStatusBorders[status as keyof typeof criticalStatusBorders],
			),
			`${status}: critical card retains status border`,
		);
	}
	assert.ok(criticalCalendarSurface.includes("dark:bg-red-800/80"));
	assert.ok(criticalCalendarSurface.includes("dark:text-white"));
});

it("keeps normal-priority status surfaces and uses unknown as a safe fallback", () => {
	assert.ok(
		productionCalendarCardClasses("assigned", "NORMAL").includes(
			productionCalendarColors.assigned,
		),
	);
	assert.ok(
		productionCalendarCardClasses("unsupported", "CRITICAL").includes(
			criticalStatusBorders.unknown,
		),
	);
});
