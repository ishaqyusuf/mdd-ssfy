import { Font } from "@react-pdf/renderer";

let fontsRegistered = false;

export function ensureJobsPdfFonts() {
	if (fontsRegistered) return;

	Font.register({
		family: "Inter",
		fonts: [
			{
				src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf",
				fontWeight: 400,
			},
			{
				src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fMZhrib2Bg-4.ttf",
				fontWeight: 500,
			},
			{
				src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf",
				fontWeight: 600,
			},
			{
				src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf",
				fontWeight: 700,
			},
		],
	});

	fontsRegistered = true;
}
