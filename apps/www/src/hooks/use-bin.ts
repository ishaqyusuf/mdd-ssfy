import { usePathname } from "next/navigation";

export function useBin() {
    const path = usePathname();
    return path.includes("bin");
}
