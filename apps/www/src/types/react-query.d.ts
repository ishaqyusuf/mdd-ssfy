import "@tanstack/react-query";

declare module "@tanstack/react-query" {
    interface Register {
        mutationMeta: {
            debug?: boolean;
            toastTitle?: {
                show?: boolean;
                loading?: string;
                success?: string;
                error?: string;
            };
        };
    }
}

