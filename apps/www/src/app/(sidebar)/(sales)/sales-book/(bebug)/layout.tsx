import Link from "next/link";

export default async function Layout({ children }) {
    return (
        <div className="flex flex-col">
            <div className="">
                {[...Array(3)].map((a, i) => (
                    <Link href={`/sales-book/debug-${i + 1}`}>
                        Debug {i + 1}
                    </Link>
                ))}
            </div>
            {children}
        </div>
    );
}
