import "@tanstack/react-query";

declare module "@tanstack/react-query" {
    interface Register {
        mutationMeta: {
            toastTitle?: {
                show?: boolean;
                loading?: string;
                success?: string;
                error?: string;
            };
        };
    }
}

