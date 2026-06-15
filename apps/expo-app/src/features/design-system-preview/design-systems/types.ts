export type PreviewDesignSystem = {
	id: string;
	name: string;
	summary: string;
	colors: {
		background: string;
		header: string;
		surface: string;
		surfaceMuted: string;
		border: string;
		text: string;
		muted: string;
		primary: string;
		ready: string;
		pending: string;
		blocked: string;
		complete: string;
	};
	radius: {
		card: number;
		control: number;
		pill: number;
	};
};
