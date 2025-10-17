import { useEffect, useRef, useState } from "react";

export function usePageTitle() {
    useEffect(() => {
        const originalTitle = document.title;

        return () => {
            document.title = originalTitle;
        };
    }, []);
}
