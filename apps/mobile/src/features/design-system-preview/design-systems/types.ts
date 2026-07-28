import { useColorScheme } from "@/hooks/use-color";

export type PreviewDesignColors = {
	background: string;
	header: string;
	surface: string;
	surfaceMuted: string;
	border: string;
	text: string;
	muted: string;
	primary: string;
	primaryForeground: string;
	ready: string;
	pending: string;
	blocked: string;
	complete: string;
};

export type PreviewDesignSystem = {
	id: string;
	name: string;
	summary: string;
	colors: PreviewDesignColors;
	darkColors: PreviewDesignColors;
	radius: {
		card: number;
		control: number;
		pill: number;
	};
};

export type ResolvedPreviewDesignSystem = Omit<
	PreviewDesignSystem,
	"darkColors"
>;

export function usePreviewDesignSystem(
	system: PreviewDesignSystem,
): ResolvedPreviewDesignSystem {
	const { colorScheme } = useColorScheme();
	const colors = colorScheme === "dark" ? system.darkColors : system.colors;

	return {
		id: system.id,
		name: system.name,
		summary: system.summary,
		colors,
		radius: system.radius,
	};
}
