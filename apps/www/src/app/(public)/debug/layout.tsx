import { Env } from "@/components/env";
import Link from "@/components/link";

export default async function DebugLayout({ children }) {
    return (
        <>
            <Env isDev>
                <div className="p-4 flex gap-4">
                    <Link href={"/debug/sheet"}>Sheet</Link>
                    <Link href={"/debug/command-input"}>Command</Link>
                    <Link href={"/debug/sales-stats"}>Sales Stats</Link>
                </div>
            </Env>
            {children}
        </>
    );
}
