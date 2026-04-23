"use client";

import dynamic from "next/dynamic";

const GlobalSheets = dynamic(
	() => import("./global-sheets").then((mod) => mod.GlobalSheets),
	{
		ssr: false,
	},
);

export function GlobalSheetsProvider() {
	return <GlobalSheets />;
}
