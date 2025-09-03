import "@tanstack/react-query";

declare module "@tanstack/react-query" {
    interface Register {
        mutationMeta: {
            toastTitle?: {
                loading?: string;
                success?: string;
                error?: string;
            };
        };
    }
}
