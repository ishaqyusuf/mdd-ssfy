"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { AlertCircle, ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";

export function DealerLoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const callbackURL = "/";

    const masterResult = await fetch("/api/auth/dealer-master-sign-in", {
      body: JSON.stringify({
        callbackURL,
        email,
        password,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });

    if (masterResult.ok) {
      const data = (await masterResult.json()) as { url?: string };

      window.location.assign(data.url || callbackURL);
      return;
    }

    const result = await authClient.signIn.email({
      email,
      password,
      callbackURL,
    });

    setPending(false);

    if (result.error) {
      setError(result.error.message || "Unable to sign in.");
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label className="text-slate-700" htmlFor="email">
          EmailE
        </Label>
        <div className="relative">
          <Mail className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-slate-400" />
          <Input
            autoComplete="email"
            className="h-11 rounded-md border-slate-200 bg-white pl-10 text-slate-950 placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-[3px]"
            id="email"
            name="email"
            placeholder="dealer@example.com"
            required
            type="email"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-slate-700" htmlFor="password">
          Password
        </Label>
        <div className="relative">
          <LockKeyhole className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-slate-400" />
          <Input
            autoComplete="current-password"
            className="h-11 rounded-md border-slate-200 bg-white pl-10 text-slate-950 placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-[3px]"
            id="password"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </div>
      </div>
      {error ? (
        <div
          className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm font-medium text-destructive"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}
      <Button className="h-11 w-full" disabled={pending} type="submit">
        {pending ? "Signing in..." : "Continue to workspace"}
        <ArrowRight className="size-4" />
      </Button>
      <p className="text-center text-xs leading-5 text-slate-500">
        Access is limited to approved GND dealer accounts.
      </p>
    </form>
  );
}
