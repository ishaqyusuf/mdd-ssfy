import { useEffect, useState } from "react";

export default function useScroll(fn: (scrollY, height?) => boolean) {
    const [isScrolled, setIsScrolled] = useState(false);
    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY;

            if (fn(scrollPosition, window.innerHeight)) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);
    return {
        isScrolled,
    };
}
