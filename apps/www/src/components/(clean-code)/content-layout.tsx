"use client";
import { Navbar } from "./nav/navbar";

interface ContentLayoutProps {
    title?: string;
    children?: React.ReactNode;
}

export function ContentLayout({ title, children }: ContentLayoutProps) {
    return (
        <div>
            <Navbar />
            <div
                className="bg-white dark:bg-inherit sticky top-14 z-10"
                id="pageTab"
            ></div>
            <div className="pb-8">{children}</div>
        </div>
    );
}
