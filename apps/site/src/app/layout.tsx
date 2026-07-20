import "@gnd/ui/globals.css";

import { cn } from "@gnd/ui/cn";

import { Header } from "@/components/header";
import { GlobalModals } from "@/components/modals/global-modals";
import { siteConfig } from "@/config/site";
import { TRPCReactProvider } from "@/trpc/client";
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Providers } from "./providers";

export const metadata: Metadata = {
	metadataBase: new URL(
		process.env.STOREFRONT_APP_URL ||
			process.env.NEXT_PUBLIC_APP_URL ||
			siteConfig.url,
	),
	title: {
		default: "GND Millwork | Doors, Mouldings & Shelf Items",
		template: "%s | GND Millwork",
	},
	description: siteConfig.description,
	openGraph: {
		type: "website",
		siteName: siteConfig.name,
		title: "GND Millwork",
		description: siteConfig.description,
		images: [siteConfig.ogImage],
	},
	robots: { index: true, follow: true },
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head />

			<body className={cn("min-h-screen bg-background font-sans antialiased")}>
				<Providers>
					{/* <NuqsAdapter>
            <TRPCReactProvider> */}
					<Header />
					{children}
					<GlobalModals />
					{/* </TRPCReactProvider>
          </NuqsAdapter> */}
				</Providers>
			</body>
		</html>
	);
}
