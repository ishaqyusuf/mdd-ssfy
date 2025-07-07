import { useState, useEffect } from "react";

export function useSortControl() {
    const [ctrlPressed, setCtrlPressed] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey) setCtrlPressed(true);
        };

        const handleKeyUp = (e) => {
            if (!e.ctrlKey) setCtrlPressed(false);
        };

        const handleBlur = () => {
            setCtrlPressed(false); // Invalidate when window loses focus
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", handleBlur);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", handleBlur);
        };
    }, []);

    return ctrlPressed;
}
