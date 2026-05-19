import { cn } from "@gnd/ui/cn";
import {
  BadgeCheck,
  ClipboardList,
  FileText,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

type DealerAuthLayoutProps = {
  title: string;
  eyebrow: string;
  description: string;
  children: ReactNode;
  contextLabel?: string;
  state?: "default" | "error";
};

const portalStats = [
  { label: "Quotes", icon: FileText },
  { label: "Orders", icon: ClipboardList },
  { label: "Customers", icon: Users },
];

export function DealerAuthLayout({
  title,
  eyebrow,
  description,
  children,
  contextLabel,
  state = "default",
}: DealerAuthLayoutProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center">
        <div className="grid w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative hidden min-h-[620px] bg-slate-950 p-8 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-y-0 right-0 w-px bg-white/10" />

            <div className="space-y-10">
              <div className="inline-flex items-center gap-3 rounded-md border border-white/10 bg-white px-4 py-3 text-slate-950 shadow-sm">
                <img
                  alt="GND Dealership"
                  className="size-10 object-contain"
                  height={40}
                  src="/dealership-logo.png"
                  width={40}
                />
                <div>
                  <p className="text-sm font-semibold leading-none">
                    GND Dealership
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Pro Desk portal</p>
                </div>
              </div>

              <div className="max-w-xl space-y-5">
                <p className="text-sm font-medium text-slate-300">
                  Dealer sales workspace
                </p>
                <h2 className="text-4xl font-semibold leading-tight tracking-normal text-white">
                  Manage quotes, orders, and customer work from one secure
                  portal.
                </h2>
                <p className="max-w-md text-sm leading-6 text-slate-300">
                  Built for dealer teams that need fast access to active sales
                  documents, customer records, and company settings without
                  stepping through the internal workspace.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {portalStats.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      className="rounded-md border border-white/10 bg-white/5 p-3"
                      key={item.label}
                    >
                      <Icon className="mb-3 size-4 text-slate-300" />
                      <p className="text-sm font-medium">{item.label}</p>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                <ShieldCheck className="size-4 text-emerald-300" />
                Secure access for verified dealer accounts.
              </div>
            </div>
          </section>

          <section className="flex min-h-[620px] items-center p-5 sm:p-8 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 flex items-center gap-3 lg:hidden">
                <div className="flex size-11 items-center justify-center rounded-md border bg-white">
                  <img
                    alt="GND Dealership"
                    className="size-8 object-contain"
                    height={32}
                    src="/dealership-logo.png"
                    width={32}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold">GND Dealership</p>
                  <p className="text-xs text-slate-500">Pro Desk portal</p>
                </div>
              </div>

              <div className="mb-7 space-y-3">
                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium",
                    state === "error"
                      ? "border-destructive/30 bg-destructive/5 text-destructive"
                      : "border-slate-200 bg-slate-50 text-slate-600",
                  )}
                >
                  <BadgeCheck className="size-3.5" />
                  {eyebrow}
                </div>
                {contextLabel ? (
                  <p className="text-sm font-medium text-slate-500">
                    {contextLabel}
                  </p>
                ) : null}
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-normal text-slate-950">
                    {title}
                  </h1>
                  <p className="text-sm leading-6 text-slate-600">
                    {description}
                  </p>
                </div>
              </div>

              {children}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
