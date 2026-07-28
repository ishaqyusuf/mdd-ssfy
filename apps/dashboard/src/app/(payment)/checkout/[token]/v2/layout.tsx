import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(180deg,_#f8fafc,_#eef2ff_55%,_#ffffff)] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </div>
  );
}
