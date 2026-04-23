"use client";

import { CommandProvider } from "@/components/cmd/provider";
import { ModalProvider } from "@/components/common/modal/provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { store } from "@/store";
import { TRPCReactProvider } from "@/trpc/client";
import { SessionProvider } from "next-auth/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { Provider } from "react-redux";

type Props = {
	children: ReactNode;
};
export function Providers({ children }: Props) {
	return (
		<SessionProvider>
			<NuqsAdapter>
				<TRPCReactProvider>
					<Provider store={store}>
						<ModalProvider>
							<ThemeProvider attribute="class" defaultTheme="light">
								<CommandProvider>
									<AuthProvider>{children}</AuthProvider>
								</CommandProvider>
							</ThemeProvider>
						</ModalProvider>
					</Provider>
				</TRPCReactProvider>
			</NuqsAdapter>
		</SessionProvider>
	);
}
