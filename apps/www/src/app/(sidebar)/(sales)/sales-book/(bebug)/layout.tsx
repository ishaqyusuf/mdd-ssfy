import { buttonVariants } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import Link from "next/link";

export default async function Layout({ children }) {
    const workingRoutes = [2];
    return (
        <div className="flex flex-col">
            <div className="">
                {[...Array(4)].map((a, i) => (
                    <Link
                        className={cn(
                            buttonVariants({
                                variant: workingRoutes.includes(i + 1)
                                    ? "link"
                                    : "destructive",
                            }),
                        )}
                        href={`/sales-book/debug-${i + 1}`}
                    >
                        Debug {i + 1}
                    </Link>
                ))}
            </div>
            {children}
        </div>
    );
}

