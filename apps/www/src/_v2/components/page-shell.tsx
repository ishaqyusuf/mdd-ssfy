"use client";

export default function PageShell({ children }) {
    return (
        <div className="px-4 sm:px-8 space-y-4 flex flex-col">{children}</div>
    );
}
