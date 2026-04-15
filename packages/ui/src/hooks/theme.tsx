"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system" | (string & {});

type ThemeProviderProps = {
    attribute?: string | string[];
    children: ReactNode;
    defaultTheme?: Theme;
    disableTransitionOnChange?: boolean;
    enableColorScheme?: boolean;
    enableSystem?: boolean;
    forcedTheme?: Theme;
    storageKey?: string;
    themes?: string[];
    value?: Record<string, string>;
};

type ThemeProviderState = {
    forcedTheme?: Theme;
    resolvedTheme?: string;
    setTheme: (theme: Theme) => void;
    systemTheme?: "light" | "dark";
    theme: Theme;
    themes: string[];
};

const DEFAULT_THEMES = ["light", "dark"];
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

const ThemeContext = createContext<ThemeProviderState | undefined>(undefined);

function getSystemTheme() {
    if (typeof window === "undefined") {
        return undefined;
    }

    return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
}

function getStoredTheme(storageKey: string, fallbackTheme: Theme) {
    if (typeof window === "undefined") {
        return fallbackTheme;
    }

    try {
        return (localStorage.getItem(storageKey) as Theme | null) ?? fallbackTheme;
    } catch {
        return fallbackTheme;
    }
}

function temporarilyDisableTransitions() {
    const style = document.createElement("style");
    style.appendChild(
        document.createTextNode(
            "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}",
        ),
    );
    document.head.appendChild(style);

    return () => {
        window.getComputedStyle(document.body);
        setTimeout(() => {
            document.head.removeChild(style);
        }, 1);
    };
}

export function ThemeProvider({
    attribute = "data-theme",
    children,
    defaultTheme = "system",
    disableTransitionOnChange = false,
    enableColorScheme = true,
    enableSystem = true,
    forcedTheme,
    storageKey = "theme",
    themes = DEFAULT_THEMES,
    value,
}: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(() =>
        getStoredTheme(storageKey, defaultTheme),
    );
    const [systemTheme, setSystemTheme] = useState<"light" | "dark" | undefined>(
        () => getSystemTheme(),
    );

    useEffect(() => {
        if (!enableSystem || typeof window === "undefined") {
            return;
        }

        const mediaQuery = window.matchMedia(MEDIA_QUERY);
        const updateSystemTheme = () => {
            setSystemTheme(mediaQuery.matches ? "dark" : "light");
        };

        updateSystemTheme();
        mediaQuery.addEventListener("change", updateSystemTheme);
        return () => {
            mediaQuery.removeEventListener("change", updateSystemTheme);
        };
    }, [enableSystem]);

    const applyTheme = useCallback(
        (nextTheme: Theme) => {
            if (typeof document === "undefined") {
                return;
            }

            const resolvedTheme =
                nextTheme === "system" && enableSystem
                    ? (getSystemTheme() ?? "light")
                    : nextTheme;
            const root = document.documentElement;
            const attributes = Array.isArray(attribute) ? attribute : [attribute];
            const themeNames = value ? Object.values(value) : themes;
            const cleanup = disableTransitionOnChange
                ? temporarilyDisableTransitions()
                : undefined;

            attributes.forEach((attr) => {
                if (attr === "class") {
                    root.classList.remove(...themeNames);
                    const className = value?.[resolvedTheme] ?? resolvedTheme;
                    if (className) {
                        root.classList.add(className);
                    }
                    return;
                }

                if (resolvedTheme) {
                    root.setAttribute(attr, value?.[resolvedTheme] ?? resolvedTheme);
                } else {
                    root.removeAttribute(attr);
                }
            });

            if (enableColorScheme) {
                root.style.colorScheme =
                    resolvedTheme === "light" || resolvedTheme === "dark"
                        ? resolvedTheme
                        : "";
            }

            cleanup?.();
        },
        [attribute, disableTransitionOnChange, enableColorScheme, enableSystem, themes, value],
    );

    useLayoutEffect(() => {
        applyTheme(forcedTheme ?? theme);
    }, [applyTheme, forcedTheme, theme]);

    useEffect(() => {
        if (typeof window === "undefined" || forcedTheme) {
            return;
        }

        try {
            localStorage.setItem(storageKey, theme);
        } catch {
            return;
        }
    }, [forcedTheme, storageKey, theme]);

    const setTheme = useCallback((nextTheme: Theme) => {
        setThemeState(nextTheme);
    }, []);

    const resolvedTheme =
        (forcedTheme ?? theme) === "system" && enableSystem
            ? systemTheme
            : (forcedTheme ?? theme);

    const contextValue = useMemo<ThemeProviderState>(
        () => ({
            forcedTheme,
            resolvedTheme,
            setTheme,
            systemTheme,
            theme: forcedTheme ?? theme,
            themes: enableSystem ? [...themes, "system"] : themes,
        }),
        [enableSystem, forcedTheme, resolvedTheme, setTheme, systemTheme, theme, themes],
    );

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        return {
            setTheme: () => {},
            theme: "system" as Theme,
            themes: [...DEFAULT_THEMES, "system"],
        };
    }

    return context;
}
