"use client";

import { ThemeProvider as UIThemeProvider } from "@gnd/ui/hooks/theme";
import type { ComponentProps } from "react";

type ThemeProviderProps = ComponentProps<typeof UIThemeProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return <UIThemeProvider {...props}>{children}</UIThemeProvider>;
}
