"use client";

import dynamic from "next/dynamic";

const GlobalModals = dynamic(
	() => import("./global-modals").then((mod) => mod.GlobalModals),
	{
		ssr: false,
	},
);

export function GlobalModalsProvider() {
	return <GlobalModals />;
}
